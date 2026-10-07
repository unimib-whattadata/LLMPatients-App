"""Offline native-API resume checks using copies of the stopped runtime.

The original runtime, frozen source and manifest are read-only inputs. Each
worker has networking disabled and uses an explicitly injected SDK stub.
"""
from __future__ import annotations

import asyncio
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, call, patch


HERE = Path(__file__).resolve().parent
INTEGRATION = HERE.parent / "integration"
PREVIOUS_RESUME = HERE.parent / "resume-03"
ORIGINAL_RUNTIME = PREVIOUS_RESUME / "runtime"
RETIRED_STOP = "previous-stop-resume-03.json"
sys.path.insert(0, str(INTEGRATION))
sys.path.insert(0, str(HERE.parent / "scripts"))
import run_integration as harness


def json_read(path):
    return json.loads(Path(path).read_text())


def json_write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def fingerprint(directory):
    return {
        str(path.relative_to(directory)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(directory.rglob("*")) if path.is_file()
    }


class NoWaitGate:
    @contextmanager
    def request(self, check):
        check()
        yield


def sdk_response(text="A completed response.", finish="STOP"):
    from vertexai.generative_models import GenerationResponse
    return GenerationResponse.from_dict({
        "candidates": [{"content": {"role": "model", "parts": [{"text": text}] if text else []},
                        "finish_reason": finish}],
        "usage_metadata": {"prompt_token_count": 100, "candidates_token_count": 10,
                           "thoughts_token_count": 20, "total_token_count": 130},
        "model_version": "gemini-2.5-pro", "response_id": "offline-resume-response",
    })


class OfflineModel:
    """Same stage responses as integration/test_integration.py's worker."""

    def __init__(self, variant="complete"):
        self.variant = variant
        self.calls = []
        self.failed = False

    def generate_content(self, prompt, **kwargs):
        from runtime_adapter import current_stage
        stage = current_stage()
        self.calls.append({"stage": stage})
        if self.failed:
            raise AssertionError("The resume worker made a request after a fatal outcome")
        if stage == "classify_topic_and_emotion" and self.variant == "empty_stop":
            self.failed = True
            return sdk_response("")
        if stage == "classify_topic_and_emotion" and self.variant == "inband429":
            self.failed = True
            from openrouter_inband_errors import OpenRouterInBandError
            raise OpenRouterInBandError(429)
        if stage == "generate_response" and self.variant != "complete":
            self.failed = True
            if self.variant == "http429":
                from openrouter_transport import OpenRouterHTTPError
                raise OpenRouterHTTPError("Offline HTTP 429", status_code=429, record_id="offline-http429")
            if self.variant == "inband429":
                from openrouter_inband_errors import OpenRouterInBandError
                raise OpenRouterInBandError(429)
            if self.variant == "empty_stop":
                return sdk_response("")
            raise AssertionError(f"Unknown offline variant: {self.variant}")
        if prompt.startswith("You are a classifier."):
            return sdk_response('{"topic_label":"unknown","emotion_label":"CARE"}')
        if prompt.startswith("Extract explicit facts"):
            return sdk_response('{"facts": []}')
        if prompt.startswith("You are maintaining episodic"):
            return sdk_response("The exercise involved ordinary communication practice and listening.")
        if prompt.startswith("You are producing a session reflection"):
            return sdk_response("I practiced listening and expressing myself clearly. I felt comfortable.")
        if prompt.startswith("You maintain a long-term therapy memory"):
            return sdk_response("I am Alex Carter. I have been practicing listening and clear communication.")
        return sdk_response("I can work with that. It feels useful to practice this in an ordinary conversation.")


def offline_worker(mode, runtime, variant="complete"):
    def blocked(*args, **kwargs):
        raise AssertionError("Offline resume tests forbid network access")

    # Install the hard block before imports that could initialize a provider,
    # load the encoder, or accidentally read live credentials.
    socket.socket.connect = blocked
    socket.create_connection = blocked
    os.environ.pop("OPENROUTER_API_KEY", None)
    os.environ.update(
        OPENROUTER_API_KEY_FILE=str(runtime / "NONEXISTENT_OFFLINE_KEY"),
        HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1", PYTHONDONTWRITEBYTECODE="1",
    )
    model = OfflineModel(variant)
    observation = runtime / f"offline-{mode}-observation.json"
    try:
        if mode == "resume":
            import resume_integration as resume
            resume.retire_prior_stop(runtime)
            asyncio.run(resume.execute_resumed_session(
                runtime, offline_model=model, offline_gate=NoWaitGate(),
            ))
        else:
            raise AssertionError(f"Unknown worker mode: {mode}")
    finally:
        modules = {}
        for name in ("agent.api.app", "agent.core.langgraph_builder", "agent.core.factual_memory", "agent.core.safety"):
            module = sys.modules.get(name)
            if module is not None and getattr(module, "__file__", None):
                modules[name] = str(Path(module.__file__).resolve())
        builder = sys.modules.get("agent.core.langgraph_builder")
        safety = sys.modules.get("agent.core.safety")
        shared = bool(builder and safety and builder.SAFETY_PATTERNS is safety.SAFETY_PATTERNS)
        json_write(observation, {
            "safety_patterns_are_shared": shared,
            "pid": os.getpid(), "calls": model.calls, "module_files": modules,
            "patient_calls": sum(call["stage"] == "generate_response" for call in model.calls),
        })


class SafetyResumeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.runtime = self.root / "runtime"
        shutil.copytree(ORIGINAL_RUNTIME, self.runtime)
        self.result_path = self.runtime / "sessions/session_11/session.json"
        self.ledger_path = self.runtime / "runs" / f"{harness.THERAPIST_ID}.json"
        self.memory_path = next((self.runtime / "memory").glob("*.jsonl"))
        self.events_path = self.runtime / "sessions/session_11/generation-events.jsonl"
        self.result_before = json_read(self.result_path)
        self.ledger_before = json_read(self.ledger_path)
        self.memory_before = self.memory_path.read_bytes()
        self.events_before = self.events_path.read_bytes()
        self.stop_before = (self.runtime / "STOP").read_bytes()
        self.protected_directories = {"integration": INTEGRATION, **{
            f"resume-{index:02d}": HERE.parent / f"resume-{index:02d}" for index in range(1, 4)
        }}
        self.protected_before = {name: fingerprint(path)
                                 for name, path in self.protected_directories.items()}
        self.prior_sessions_before = {
            index: fingerprint(self.runtime / f"sessions/session_{index:02d}")
            for index in range(1, 11)
        }
        self.assertEqual("stopped", self.result_before["status"])
        self.assertEqual(["s11t01"], [turn["turn_id"] for turn in self.result_before["turns"]])
        self.assertEqual(["code_execution"], self.result_before["turns"][0]["safety_flags"])
        self.assertEqual(51, self.ledger_before["sessions"][10]["final_state"]["total_turns"])
        self.blocked_source_before = next(
            json.loads(line) for line in self.memory_before.splitlines()
            if json.loads(line).get("type") == "conversation_turn" and json.loads(line).get("turn_index") == 51
        )
        self.assertFalse(self.blocked_source_before["usable"])
        env = patch.dict(os.environ, {"OPENROUTER_API_KEY_FILE": str(self.root / "ABSENT_FAKE_KEY")})
        env.start()
        self.addCleanup(env.stop)
        network = patch.object(socket.socket, "connect", side_effect=AssertionError("Offline test only"))
        network.start()
        self.addCleanup(network.stop)

    def tearDown(self):
        self.assertEqual(self.protected_before, {
            name: fingerprint(path) for name, path in self.protected_directories.items()
        }, "A frozen original or previous resume artifact was modified")

    def worker(self, variant="complete"):
        log = self.root / f"resume-{variant}.log"
        command = [str(harness.BUNDLED_PYTHON), str(HERE / "test_resume.py"),
                   "--offline-worker", "resume", str(self.runtime), variant]
        env = harness.worker_environment()
        env["OPENROUTER_API_KEY_FILE"] = str(self.root / "ABSENT_FAKE_KEY")
        with log.open("w") as stream:
            completed = subprocess.run(command, env=env, cwd=self.root,
                                       stdout=stream, stderr=subprocess.STDOUT, timeout=180)
        observation = self.runtime / "offline-resume-observation.json"
        self.assertTrue(observation.exists(), log.read_text()[-6000:])
        return completed, json_read(observation), log

    def current_sources(self):
        return [json.loads(line) for line in self.memory_path.read_text().splitlines()
                if json.loads(line).get("type") == "conversation_turn"
                and json.loads(line).get("session_id") == "memory_integration_s11"]

    def assert_saved_prefix(self):
        ledger = json_read(self.ledger_path)["sessions"]
        saved = json_read(self.result_path)
        self.assertEqual(self.result_before["turns"], saved["turns"][:1])
        self.assertEqual(self.ledger_before["sessions"][:10], ledger[:10])
        self.assertEqual(self.ledger_before["sessions"][10]["turns"], ledger[10]["turns"][:1])
        for field in ("session_id", "run_id", "patient_id", "started_at", "metadata"):
            self.assertEqual(self.ledger_before["sessions"][10][field], ledger[10][field], field)
        self.assertTrue(self.memory_path.read_bytes().startswith(self.memory_before))
        self.assertTrue(self.events_path.read_bytes().startswith(self.events_before))
        self.assertEqual(self.blocked_source_before, self.current_sources()[0])
        self.assertEqual(self.stop_before, (self.runtime / RETIRED_STOP).read_bytes())
        for index, expected in self.prior_sessions_before.items():
            self.assertEqual(expected, fingerprint(self.runtime / f"sessions/session_{index:02d}"))

    def new_events(self):
        suffix = self.events_path.read_bytes()[len(self.events_before):]
        return [json.loads(line) for line in suffix.decode().splitlines() if line.strip()]

    def test_patch_resumes_only_four_turns_preserving_the_blocked_probe(self):
        completed, observed, log = self.worker()
        self.assertEqual(0, completed.returncode, log.read_text()[-6000:])
        self.assertEqual(4, observed["patient_calls"])
        self.assert_saved_prefix()
        self.assertTrue(observed["safety_patterns_are_shared"])
        self.assertEqual(str((HERE / "source/agent/core/safety.py").resolve()),
                         observed["module_files"]["agent.core.safety"])
        for module, path in observed["module_files"].items():
            if module != "agent.core.safety":
                self.assertTrue(Path(path).is_relative_to(INTEGRATION / "source"), path)
        self.assertFalse((self.runtime / "STOP").exists())
        result = json_read(self.result_path)
        self.assertEqual("completed", result["status"])
        self.assertEqual("finalized", result["finalization"]["status"])
        self.assertEqual([51, 52, 53, 54, 55], [turn["total_turns"] for turn in result["turns"]])
        self.assertEqual(["s11t02", "s11t03", "s11t04", "s11t05"], [
            event["turn_id"] for event in self.new_events()
            if event["event"] == "request" and event.get("stage") == "generate_response"
        ])
        third = next(turn for turn in result["turns"] if turn["turn_id"] == "s11t03")
        self.assertIn("Please recall", third["therapist_text"])
        self.assertEqual(third["therapist_text"], third["safe_user_input"])
        self.assertEqual([], third["safety_flags"])
        self.assertEqual(55, result["memory_record_counts"]["conversation_turn"])
        sources = self.current_sources()
        self.assertEqual([51, 52, 53, 54, 55], [source["turn_index"] for source in sources])
        self.assertEqual([False, True, True, True, True], [source["usable"] for source in sources])
        self.assertEqual(4, result["memory_consolidation"]["source_turns"])
        self.assertEqual(4, result["memory_consolidation"]["processed_sources"])
        evidence = result["consolidation_evidence"]
        self.assertEqual(5, evidence["raw_source_turns"])
        self.assertEqual(4, evidence["eligible_source_turns"])
        self.assertEqual([self.blocked_source_before["id"]],
                         [source["id"] for source in evidence["excluded_sources"]])
        batches = [row for row in result["session_memory_records"] if row["type"] == "fact_batch"]
        processed = {source_id for batch in batches for source_id in batch["source_ids"]}
        self.assertEqual({source["id"] for source in sources if source["usable"]}, processed)
        self.assertNotIn(self.blocked_source_before["id"], processed)
        ledger = json_read(self.ledger_path)["sessions"]
        self.assertEqual(11, len(ledger), "Finalization created a duplicate session")
        self.assertEqual(5, len(ledger[10]["turns"]))
        self.assertTrue(ledger[10]["ended_at"])
        self.assertEqual(55, ledger[10]["final_state"]["total_turns"])
        self.assertEqual(self.ledger_before["sessions"][10]["final_state"]["history"][-1],
                         ledger[10]["final_state"]["history"][0])

    def test_provider_failure_does_not_rewrite_or_reclassify_the_51_saved_turns(self):
        completed, observed, log = self.worker("http429")
        self.assertNotEqual(0, completed.returncode, log.read_text()[-6000:])
        self.assertEqual(1, observed["patient_calls"])
        self.assertEqual("generate_response", observed["calls"][-1]["stage"])
        self.assert_saved_prefix()
        self.assertTrue((self.runtime / "STOP").exists())
        result = json_read(self.result_path)
        self.assertEqual("stopped", result["status"])
        self.assertEqual(1, len(result["turns"]))
        self.assertEqual("IntegrationAbort", result["error"]["type"])
        self.assertNotIn("finalization", result)
        ledger = json_read(self.ledger_path)["sessions"]
        self.assertEqual(11, len(ledger))
        self.assertEqual(1, len(ledger[10]["turns"]))
        self.assertFalse(ledger[10].get("ended_at"))
        self.assertEqual(51, ledger[10]["final_state"]["total_turns"])
        self.assertEqual(self.memory_before, self.memory_path.read_bytes())
        events = self.new_events()
        self.assertEqual(["s11t02"], [event["turn_id"] for event in events
                         if event["event"] == "request" and event.get("stage") == "generate_response"])
        fatal_index = next(index for index, event in enumerate(events) if event["event"] == "fatal")
        self.assertFalse(any(event["event"] == "request" for event in events[fatal_index + 1:]))

    def test_rewriting_the_blocked_result_or_marking_it_usable_is_rejected(self):
        for corruption in ("result", "usable"):
            with self.subTest(corruption=corruption):
                shutil.rmtree(self.runtime)
                shutil.copytree(ORIGINAL_RUNTIME, self.runtime)
                if corruption == "result":
                    result = json_read(self.result_path)
                    result["turns"][0]["patient_text"] = "A replacement for the blocked response."
                    json_write(self.result_path, result)
                else:
                    records = [json.loads(line) for line in self.memory_path.read_text().splitlines()]
                    current = next(row for row in records if row.get("id") == self.blocked_source_before["id"])
                    current["usable"] = True
                    self.memory_path.write_text("".join(json.dumps(row) + "\n" for row in records))
                memory_before = self.memory_path.read_bytes()
                ledger_before = self.ledger_path.read_bytes()
                completed, observed, log = self.worker()
                self.assertNotEqual(0, completed.returncode, log.read_text()[-6000:])
                self.assertEqual([], observed["calls"], log.read_text()[-6000:])
                self.assertEqual(memory_before, self.memory_path.read_bytes())
                self.assertEqual(ledger_before, self.ledger_path.read_bytes())


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--offline-worker":
        offline_worker(sys.argv[2], Path(sys.argv[3]), sys.argv[4] if len(sys.argv) > 4 else "complete")
    else:
        unittest.main()
