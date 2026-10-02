"""Offline tests for the comparison's concrete validity and recovery risks."""
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest

from benchmark import Client
from contexts import (ARMS, THERAPIST_ID, answer_prompt, assemble_context, estimated_tokens,
                      strict_score, summary_prompt)
from agent.core.factual_memory import EvidenceMemory
from agent.core.memory_store import JsonlMemoryStore


class Limiter:
    def __init__(self):
        self.requests = 0
    def acquire(self):
        self.requests += 1
        return self.requests
    def record_success(self, generation):
        pass


class Response:
    def __init__(self, reason="STOP", text='{"answer":"wrong"}'):
        self.candidates = [SimpleNamespace(finish_reason=SimpleNamespace(name=reason),
                                          content=SimpleNamespace(parts=[text]))]
        self.text = text
    def to_dict(self):
        return {"_openrouter": {"archive_record_id": "offline-stub"}}


class Model:
    def __init__(self, results):
        self.results = iter(results)
        self.configs = []
    def generate_content(self, prompt, generation_config):
        self.configs.append(generation_config.copy())
        result = next(self.results)
        if isinstance(result, Exception):
            raise result
        return result


class BenchmarkTests(unittest.TestCase):
    def test_wrong_complete_answer_is_not_regenerated(self):
        with tempfile.TemporaryDirectory() as tmp:
            model, limiter = Model([Response()]), Limiter()
            client = Client(tmp, model=model, limiter=limiter)
            first = client.generate("q", role="answer", stage="test")
            self.assertEqual(first, client.generate("q", role="answer", stage="test"))
            self.assertEqual(limiter.requests, 1)

    def test_provider_failure_propagates_without_retry(self):
        with tempfile.TemporaryDirectory() as tmp:
            model, limiter = Model([ConnectionError("offline transport failure"), Response()]), Limiter()
            with self.assertRaises(ConnectionError):
                Client(tmp, model=model, limiter=limiter).generate("q", role="answer", stage="test")
            self.assertEqual(limiter.requests, 1)
            record = json.loads(next((Path(tmp) / "calls").glob("*.json")).read_text())
            self.assertEqual(record["status"], "stopped_provider_error")

    def test_pending_checkpoint_recovers_completed_wrong_answer(self):
        with tempfile.TemporaryDirectory() as tmp:
            model = Model([Response()])
            client = Client(tmp, model=model, limiter=Limiter())
            result = client.generate("q", role="answer", stage="test")
            path = next((Path(tmp) / "calls").glob("*.json"))
            saved = json.loads(path.read_text())
            saved["status"] = "pending"
            saved.pop("text")
            path.write_text(json.dumps(saved))
            self.assertEqual(client.generate("q", role="answer", stage="test"), result)
            self.assertEqual(len(model.configs), 1)

    def test_unknown_native_outcome_is_not_replayed(self):
        with tempfile.TemporaryDirectory() as tmp:
            model = Model([])
            model.records_path = Path(tmp) / "native.jsonl"
            model.records_path.write_text(json.dumps({"event": "request", "record_id": "r1",
                "request": {"messages": [{"role": "user", "content": "q"}], "max_tokens": 4096}}) + "\n")
            client = Client(tmp, model=model, limiter=Limiter())
            with self.assertRaisesRegex(RuntimeError, "outcome unknown"):
                client.reconcile_attempt({"native_log_offset": 0, "config": {"max_output_tokens": 4096}}, "q")
            self.assertEqual(len(model.configs), 0)

    def test_archived_native_stop_is_recovered_without_model_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            model = Model([])
            model.records_path = Path(tmp) / "native.jsonl"
            request = {"event": "request", "record_id": "r1", "request": {
                "messages": [{"role": "user", "content": "q"}], "max_tokens": 4096}}
            outcome = {"event": "response", "record_id": "r1", "response": {
                "id": "generation-offline-fixture", "model": "google/gemini-2.5-pro",
                "choices": [{"finish_reason": "stop", "message": {"role": "assistant",
                            "content": '{"answer":"wrong, but retained"}'}}]}}
            model.records_path.write_text(json.dumps(request) + "\n" + json.dumps(outcome) + "\n")
            client = Client(tmp, model=model, limiter=Limiter())
            attempt = {"native_log_offset": 0, "config": {"max_output_tokens": 4096}}
            client.reconcile_attempt(attempt, "q")
            self.assertEqual(attempt["finish_reason"], "STOP")
            self.assertEqual(attempt["text"], '{"answer":"wrong, but retained"}')
            self.assertEqual(len(model.configs), 0)

    def test_one_output_length_recovery(self):
        with tempfile.TemporaryDirectory() as tmp:
            model = Model([Response("MAX_TOKENS", "partial"), Response()])
            Client(tmp, model=model, limiter=Limiter()).generate("q", role="answer", stage="test")
            self.assertEqual([c["max_output_tokens"] for c in model.configs], [4096, 8192])
        with tempfile.TemporaryDirectory() as tmp:
            model = Model([Response("MAX_TOKENS"), Response("MAX_TOKENS"), Response()])
            with self.assertRaises(RuntimeError):
                Client(tmp, model=model, limiter=Limiter()).generate("q", role="answer", stage="test")
            self.assertEqual(len(model.configs), 2)

    def test_summary_and_extraction_have_bounded_thinking(self):
        with tempfile.TemporaryDirectory() as tmp:
            model = Model([Response(), Response()])
            client = Client(tmp, model=model, limiter=Limiter())
            for role in ("summary", "extraction"):
                client.generate("data", role=role, stage=role)
            self.assertTrue(all(c["temperature"] == .2 and c["max_output_tokens"] == 8192
                                and c["thinking_config"] == {"thinking_budget": 1024} for c in model.configs))

    def test_all_arms_budget_and_source_integrity(self):
        sessions = [{"session_id": f"session_{i:02d}", "turns": [
            {"turn_index": j, "therapist_text": f"Tell me about example {i}-{j}.",
             "patient_text": f"Example {i}-{j} is useful. " + "Context words. " * 40}
            for j in range(1, 13)]} for i in range(1, 12)]
        with tempfile.TemporaryDirectory() as tmp:
            memory = EvidenceMemory(JsonlMemoryStore(Path(tmp)))
            for session in sessions:
                for turn in session["turns"]:
                    memory.record_turn(patient_id="test", therapist_id=THERAPIST_ID,
                                       session_id=session["session_id"], **turn)
            for arm in ARMS:
                context, metadata = assemble_context(arm, sessions, "General summary. " * 500,
                                                     memory, patient_id="test", question="Example 1-1?")
                if metadata["budget"]:
                    self.assertLessEqual(estimated_tokens(context), metadata["budget"])
                for record in metadata["evidence"]:
                    self.assertIn(json.dumps(record["quote"], ensure_ascii=False), context)
            self.assertFalse(any(r["type"] == "fact_batch" for r in memory.store.iter_records("test", THERAPIST_ID)))

    def test_future_session_and_oracle_absent_from_summary(self):
        session = {"session_id": "s1", "turns": [{"turn_index": 1,
                   "therapist_text": "source", "patient_text": "current data"}]}
        prompt = summary_prompt("prior note", session)
        self.assertIn("current data", prompt)
        self.assertNotIn("expected_values", prompt)
        self.assertNotIn("probe_id", prompt)

    def test_common_prompt_outside_context(self):
        a = answer_prompt("full persona", "memory A", "same question")
        b = answer_prompt("full persona", "memory B", "same question")
        self.assertEqual(a.replace("memory A", "MEMORY"), b.replace("memory B", "MEMORY"))

    def test_negated_target_does_not_pass_strict_screen(self):
        probe = {"category": "remote", "expected_values": ["Target"],
                 "forbidden_values": ["Other"], "answer_type": "literal"}
        for answer in ("Not Target", "Target or Other", "I don't know", "",
                       "Possibly Target, but I cannot remember"):
            self.assertFalse(strict_score(json.dumps({"answer": answer}), probe)["strict_pass"])
        self.assertTrue(strict_score('{"answer":"Target"}', probe)["strict_pass"])

    def test_temporal_and_action_answers_always_flagged_for_semantic_check(self):
        for category in ("update_current", "update_past", "proposal", "completion"):
            probe = {"category": category, "expected_values": ["Target"],
                     "forbidden_values": [], "answer_type": "literal"}
            self.assertTrue(strict_score('{"answer":"Target"}', probe)["semantic_review"])

    def test_abstention_and_malformed_answers(self):
        probe = {"category": "abstention", "expected_values": [], "answer_type": "abstain"}
        self.assertTrue(strict_score('{"answer":null}', probe)["strict_pass"])
        for text in ('{"answer":"probably paper"}', '{}', 'null', '{"answer":42}'):
            self.assertFalse(strict_score(text, probe)["strict_pass"])


if __name__ == "__main__":
    unittest.main()
