"""Synthetic archived-prefix tests; all provider and network paths are absent.

Only the original-package verifier is substituted: this fixture verifier checks
the hashes of the synthetic frozen generation files. Every prefix, wire, source,
state and process-journal check runs through the real audit implementation.
"""
from __future__ import annotations

import json
import socket
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

import prefix_audit as audit


def put(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def lines(path, values):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(value, ensure_ascii=False) + "\n" for value in values), encoding="utf-8")


def fixture_verifier(original):
    manifest = audit.read_json(original / "manifest.json")
    for relative, expected in manifest["files"].items():
        audit.require(audit.sha256(original / relative) == expected, "Synthetic frozen input changed")
    return {"status": "verified", "fixture_only": True, "files": len(manifest["files"])}


def make_fixture(original):
    runtime = original / "runtime"
    schedule = []
    arms = ("structured_common_profile", "flat_full_history")
    for index in range(1, 12):
        for pair in range(15):
            profile = f"offline_profile_{pair:02d}"
            pair_id = f"{profile}__r01"
            for arm in arms:
                schedule.append({"execution_order": len(schedule) + 1, "session_index": index,
                    "pair_order": pair + 1, "pair_id": pair_id, "arm": arm,
                    "run_id": f"{pair_id}__{arm}",
                    "turn_ids": [f"s{index:02d}t{position:02d}" for position in range(1, 6)]})
    put(original / "generation/schedule.json", {"session_executions": schedule})
    for item in schedule[:30]:
        run_id = item["run_id"]
        profile = item["pair_id"].split("__")[0]
        config = {"run_id": run_id, "arm": item["arm"], "profile_id": profile,
                  "native_api_id": profile, "scenario_path": f"scenarios/{profile}.json",
                  "case_sha256": "offline-case-digest"}
        put(original / "generation/runs" / f"{run_id}.json", config)
        put(original / "generation" / config["scenario_path"], {"sessions": [
            {"session_index": number, "turns": [{"turn_id": f"s{number:02d}t{position:02d}",
                "text": f"Synthetic therapist statement {number}.{position}."} for position in range(1, 6)]}
            for number in range(1, 12)]})
    put(original / "manifest.json", {"files": {path.relative_to(original).as_posix(): audit.sha256(path)
        for path in sorted((original / "generation").rglob("*.json"))}})
    manifest_hash = audit.sha256(original / "manifest.json")
    put(runtime / "launch.json", {"launch_id": "offline-launch", "execution_manifest_sha256": manifest_hash,
                                  "mode": "live_openrouter", "pid": 99000})
    processes = []
    for item in schedule[:8]:
        run_id, index, order = item["run_id"], item["session_index"], item["execution_order"]
        config = audit.read_json(original / "generation/runs" / f"{run_id}.json")
        run_dir = runtime / run_id
        session_dir = run_dir / "sessions/session_01"
        therapist, session_id = f"comparison_{run_id}", "comparison_s01"
        scenario = audit.read_json(original / "generation" / config["scenario_path"])["sessions"][0]
        receipt = {"run_id": run_id, "arm": item["arm"], "session_index": index,
            "session_id": session_id, "patient_id": config["native_api_id"], "therapist_id": therapist,
            "status": "completed", "inference_mode": "live_openrouter", "execution_manifest_sha256": manifest_hash,
            "case_sha256": config["case_sha256"], "requested_model": audit.MODEL, "provider_seed": None,
            "process_instance_id": f"offline-worker-{order}", "pid": 99100 + order,
            "finished_at": f"2026-01-01T00:00:{order:02d}+00:00", "prior_finalized_sessions": 0,
            "turns": [], "state_files_at_close": {}}
        generation, wire = [], []

        def native_call(stage, turn_id, text, prompt):
            ordinal = len(generation) // 2 + 1
            ident = f"offline-{order}-{ordinal}"
            output_budget = 8192 if stage in audit.MEMORY_STAGES else 4096
            temperature = .2 if stage in audit.MEMORY_STAGES else (0.0 if stage == "classify_topic_and_emotion" else .7)
            config = {"temperature": temperature, "max_output_tokens": output_budget, "top_p": .95,
                      "top_k": 40, "stop_sequences": ["Therapist:"], "thinking_config": {"thinking_budget": 1024}}
            size = len(prompt.encode("utf-8"))
            measurement = {"prompt_utf8_bytes": size, "estimated_prompt_tokens": max(1, (size + 2) // 3),
                           "prompt_token_estimate_method": "utf8_bytes_div3_ceiling", "estimated_prompt_token_limit": 64000}
            common = {"logical_id": ident, "attempt": 1, "stage": stage, "turn_id": turn_id, "session_index": index}
            body = {"model": audit.MODEL, "messages": [{"role": "user", "content": prompt}],
                    "provider": {"require_parameters": True, "allow_fallbacks": False}, "temperature": temperature,
                    "max_tokens": output_budget, "top_p": .95, "stop": ["Therapist:"], "reasoning": {"max_tokens": 1024}}
            usage = {"prompt_tokens": 20, "completion_tokens": 15, "total_tokens": 35, "cost": .0001}
            native = {"id": "response-" + ident, "model": audit.MODEL, "provider": "OFFLINE_FIXTURE",
                      "choices": [{"finish_reason": "stop", "message": {"content": text}}], "usage": usage}
            base = {"record_id": "archive-" + ident, "endpoint": audit.ENDPOINT, "request": body,
                    "omitted_legacy_generation_parameters": ["top_k"], "safety_settings_forwarded": False}
            wire.extend([{**base, "event": "request"}, {**base, "event": "response", "response": native, "http_status": 200}])
            generation.extend([{**common, **measurement, "event": "request", "prompt": prompt,
                "generation_config": config, "arm": item["arm"], "gate_request_id": "gate-" + ident},
                {**common, **measurement, "event": "outcome", "text": text, "finish_reasons": ["STOP"],
                 "accepted": True, "max_tokens_recovery": False, "native_record_id": base["record_id"],
                 "response_id": native["id"], "raw_model": audit.MODEL, "backend": "OFFLINE_FIXTURE",
                 "native_usage": usage, "cost": .0001, "cost_details": None}])

        for position, planned in enumerate(scenario["turns"], 1):
            prompt = f"Synthetic patient prompt for {run_id}, turn {position}."
            patient = f"Synthetic patient answer {position}."
            turn = {"run_id": run_id, "status": "accepted", "turn_index": position, "session_index": index,
                    "turn_id": planned["turn_id"], "therapist_text": planned["text"], "patient_text": patient,
                    "prompt": prompt, "application_guard_failure": False}
            if item["arm"] == "structured_common_profile":
                turn["api_response"] = {"message": patient}
                native_call("classify_topic_and_emotion", planned["turn_id"], '{"topic_label":"unknown"}', "Synthetic classifier prompt.")
            native_call("generate_response", planned["turn_id"], patient, prompt)
            receipt["turns"].append(turn)
        lines(run_dir / "accepted-turns.jsonl", receipt["turns"])
        receipt["accepted_ledger_sha256"] = audit.sha256(run_dir / "accepted-turns.jsonl")
        if item["arm"] == "structured_common_profile":
            for stage in sorted(audit.MEMORY_STAGES):
                native_call(stage, None, "Synthetic archived memory extraction.", f"Synthetic {stage} prompt.")
            records = [{"id": f"source-{order}-{position}", "type": "conversation_turn",
                        "patient_id": config["native_api_id"], "therapist_id": therapist, "session_id": session_id,
                        "turn_index": position, "session_order": 0, "usable": True,
                        "therapist_text": turn["therapist_text"], "patient_text": turn["patient_text"]}
                       for position, turn in enumerate(receipt["turns"], 1)]
            source_ids = [record["id"] for record in records]
            rejected = [] if order == 1 else [{"order": 2, "reason": "Synthetic quotation not supported", "fact": {"value": "unverified"}}]
            batch = {"id": f"batch-{order}", "type": "fact_batch", "patient_id": config["native_api_id"],
                "therapist_id": therapist, "session_id": session_id, "source_ids": source_ids,
                "facts": [{"id": f"fact-{order}"}], "rejected_facts": rejected, "validation_error": None}
            records.append(batch)
            status = "partial" if rejected else "complete"
            health = {"status": status, "source_turns": 5, "processed_sources": 5, "validated_facts": 1,
                      "rejected_facts": len(rejected), "invalid_batches": 0}
            warnings = ["Synthetic quarantined facts were retained."] if rejected else []
            native_session = {"session_id": session_id, "patient_id": config["native_api_id"],
                "ended_at": receipt["finished_at"], "source": "api", "mode": "live",
                "turns": [{"therapist_input_raw": turn["therapist_text"], "patient_response": turn["patient_text"],
                           "turn_index": position, "total_turns": position}
                          for position, turn in enumerate(receipt["turns"], 1)],
                "final_state": {"total_turns": 5, "memory_consolidation": health}}
            run_path = f"runs/{therapist}.json"
            memory_path = f"memory/{therapist}__{config['native_api_id']}.jsonl"
            put(run_dir / run_path, {"therapist_id": therapist, "sessions": [native_session]})
            lines(run_dir / memory_path, records)
            receipt.update(memory_status=status, memory_consolidation=health, memory_warnings=warnings,
                finalization={"status": "finalized", "memory_status": status, "memory_warnings": warnings},
                raw_sources=5, eligible_source_ids=sorted(source_ids), excluded_source_ids=[],
                validated_fact_ids=[f"fact-{order}"],
                quarantined_facts=[{"batch_id": batch["id"], "facts": rejected}] if rejected else [],
                memory_record_counts=dict(Counter(record["type"] for record in records)), session_memory_records=records,
                state_files_at_close={name: audit.sha256(run_dir / name) for name in (run_path, memory_path)})
        else:
            receipt.update(memory_status="not_applicable", finalization={"status": "baseline_closed", "total_turns": 5,
                "history_turns_retained": 5, "structured_memory_calls": 0})
        put(session_dir / "session.json", receipt)
        lines(session_dir / "generation-events.jsonl", generation)
        lines(session_dir / "openrouter-api-records.jsonl", wire)
        (session_dir / "worker.log").write_text("Offline synthetic completed worker.\n")
        processes.append({"event": "start", **item, "pid": receipt["pid"], "command": ["offline-python",
            str(original / "paired_runner.py"), "_worker", "--execution-order", str(order), "--launch-id", "offline-launch"]})
        if order < 8:
            processes.append({"event": "exit", **item, "pid": receipt["pid"], "exit_code": 0})
    lines(runtime / "processes.jsonl", processes)
    put(runtime / "active-execution.json", {**schedule[7], "launch_id": "offline-launch"})
    put(runtime / "request-gate.json", {"last_started": 1000.0, "in_flight": None})
    (runtime / "request-gate.lock").touch()
    put(runtime / "progress.json", {"status": "incomplete", "stop": None, "provider_errors": 0, "completed_sessions": 7})
    return schedule


class PrefixAuditTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="llmpatient-prefix-audit-offline-")
        self.addCleanup(temporary.cleanup)
        self.original = Path(temporary.name).resolve()
        self.runtime = self.original / "runtime"
        self.schedule = make_fixture(self.original)
        self.start_patch(patch.object(audit, "_verify_execution", side_effect=fixture_verifier))
        for target, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"), (socket, "create_connection")):
            self.start_patch(patch.object(target, name, side_effect=AssertionError("Offline audit must not use network")))

    def start_patch(self, patcher):
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result

    def session_dir(self, order=8):
        item = self.schedule[order - 1]
        return self.runtime / item["run_id"] / "sessions" / f"session_{item['session_index']:02d}"

    def receipt(self, order=8):
        return audit.read_json(self.session_dir(order) / "session.json")

    def rejected(self, pattern):
        with self.assertRaisesRegex(audit.PrefixAuditError, pattern):
            audit.audit_prefix(self.original)

    def test_omitted_final_exit_is_documented_and_partial_memory_preserved(self):
        result = audit.audit_prefix(self.original)
        self.assertEqual((8, 9, 40, 76, 76), tuple(result[key] for key in
            ("completed_sessions", "next_execution_order", "accepted_turns", "requests", "responses")))
        self.assertEqual(3, result["partial_memory_sessions_preserved"])
        self.assertEqual(20, result["native_source_turns"])
        reconciliation = result["process_reconciliation"]
        self.assertEqual(7, reconciliation["recorded_successful_exits"])
        self.assertTrue(reconciliation["archived_progress_is_stale"])
        missing = reconciliation["missing_exit_records"]
        self.assertEqual(1, len(missing))
        self.assertEqual(8, missing[0]["execution_order"])
        self.assertIsNone(missing[0]["exit_code"])
        self.assertFalse(missing[0]["process_exit_observed"])

    def test_audit_is_read_only_and_returns_every_runtime_file_hash(self):
        before = audit._snapshot(self.original)
        result = audit.audit_prefix(self.original)
        self.assertEqual(before, audit._snapshot(self.original))
        self.assertEqual(audit._snapshot(self.runtime), result["runtime_file_sha256"])
        self.assertEqual(0, result["live_requests_by_audit"])

    def test_missing_wire_response_refuses_continuation(self):
        path = self.session_dir() / "openrouter-api-records.jsonl"
        lines(path, audit.read_jsonl(path)[:-1])
        self.rejected("request and outcome counts")

    def test_missing_generation_outcome_refuses_continuation(self):
        path = self.session_dir() / "generation-events.jsonl"
        lines(path, audit.read_jsonl(path)[:-1])
        self.rejected("request and outcome counts")

    def test_accepted_ledger_corruption_refuses_continuation(self):
        path = self.session_dir().parents[1] / "accepted-turns.jsonl"
        records = audit.read_jsonl(path)
        records[2]["patient_text"] = "Unarchived replacement answer."
        lines(path, records)
        self.rejected("Accepted ledger differs")

    def test_stopped_receipt_refuses_continuation(self):
        receipt = self.receipt()
        receipt["status"] = "stopped"
        put(self.session_dir() / "session.json", receipt)
        self.rejected("Stopped, incomplete or foreign")

    def test_global_inflight_gate_refuses_continuation(self):
        put(self.runtime / "request-gate.json", {"last_started": 1000.0, "in_flight": {"gate_request_id": "unfinished"}})
        self.rejected("unresolved in-flight")

    def test_global_stop_refuses_continuation(self):
        put(self.runtime / "STOP", {"kind": "offline_provider_error"})
        self.rejected("global STOP")

    def test_foreign_archive_record_id_refuses_continuation(self):
        path = self.session_dir() / "generation-events.jsonl"
        records = audit.read_jsonl(path)
        records[1]["native_record_id"] = "foreign-record"
        lines(path, records)
        self.rejected("Foreign native record ID")

    def test_foreign_native_response_id_refuses_continuation(self):
        path = self.session_dir() / "openrouter-api-records.jsonl"
        records = audit.read_jsonl(path)
        records[1]["response"]["id"] = "foreign-response"
        lines(path, records)
        self.rejected("native response ID")

    def test_generation_fatal_event_refuses_continuation(self):
        path = self.session_dir() / "generation-events.jsonl"
        records = audit.read_jsonl(path)
        records[1]["event"] = "fatal"
        lines(path, records)
        self.rejected("generation error/fatal")

    def test_native_inband_error_with_partial_content_is_not_accepted(self):
        path = self.session_dir() / "openrouter-api-records.jsonl"
        records = audit.read_jsonl(path)
        records[1]["response"]["choices"][0]["error"] = {"code": 504}
        lines(path, records)
        self.rejected("errored native completion")

    def test_latest_closed_state_hash_must_match(self):
        receipt = self.receipt(1)
        relative = next(iter(receipt["state_files_at_close"]))
        path = self.session_dir(1).parents[1] / relative
        path.write_text(path.read_text() + " ")
        self.rejected("closed native-state hash")

    def test_foreign_source_id_is_refused_even_if_receipt_hash_was_rewritten(self):
        receipt = self.receipt(1)
        run_dir = self.session_dir(1).parents[1]
        relative = next(name for name in receipt["state_files_at_close"] if name.startswith("memory/"))
        records = audit.read_jsonl(run_dir / relative)
        records[-1]["source_ids"][0] = "foreign-source"
        lines(run_dir / relative, records)
        receipt["state_files_at_close"][relative] = audit.sha256(run_dir / relative)
        receipt["session_memory_records"] = records
        put(self.session_dir(1) / "session.json", receipt)
        self.rejected("Foreign fact-batch source ID")

    def test_artifact_in_next_session_refuses_continuation(self):
        put(self.session_dir(9) / "unexpected.json", {"status": "unfinished"})
        self.rejected("artifacts after the completed prefix")

    def test_empty_future_session_directory_refuses_continuation(self):
        self.session_dir(9).mkdir(parents=True)
        self.rejected("directories after/outside")

    def test_noncontiguous_receipt_prefix_refuses_continuation(self):
        (self.session_dir(2) / "session.json").unlink()
        self.rejected("not a contiguous scheduled prefix")

    def test_missing_nonfinal_process_exit_is_not_reconciled(self):
        path = self.runtime / "processes.jsonl"
        records = audit.read_jsonl(path)
        lines(path, [record for record in records if not (record["event"] == "exit" and record["execution_order"] == 1)])
        self.rejected("only reconcilable at the completed prefix tail")

    def test_recorded_worker_failure_refuses_continuation(self):
        path = self.runtime / "processes.jsonl"
        records = audit.read_jsonl(path)
        records[1]["exit_code"] = 7
        lines(path, records)
        self.rejected("Failed or foreign worker exit")

    def test_changed_frozen_input_refuses_continuation(self):
        path = self.original / "generation/schedule.json"
        path.write_text(path.read_text() + " ")
        self.rejected("Synthetic frozen input changed")

    def test_turn_ordinals_cannot_be_replaced_in_receipt(self):
        receipt = self.receipt()
        receipt["turns"][2]["turn_index"] = 9
        put(self.session_dir() / "session.json", receipt)
        self.rejected("Accepted turn text/ordinal/identity")


if __name__ == "__main__":
    unittest.main()
