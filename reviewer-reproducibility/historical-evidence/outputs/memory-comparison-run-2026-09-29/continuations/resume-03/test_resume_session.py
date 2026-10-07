"""Recovery unit gates only: synthetic state, no graph, provider or subprocess.

The native preflight is intentionally outside this suite. Network entry points,
process creation and native bootstrap are blocked for every test.
"""
from __future__ import annotations

import copy
import json
import os
import socket
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import resume_session as recovery


def prompt(*, intensity="0.84", bands=None):
    bands = bands or [
        "- Panic/Grief (0.18): Separation distress, loss, or grief-heavy weight.",
        "- Rage (0.17): Irritable, confrontational edge with flashes of anger.",
        "- Fear (0.16): Hypervigilant, anxious energy with protective scanning.",
    ]
    return (
        "<CASE>\nSynthetic frozen clinical case.\n</CASE>\n\n<ARM_CONTEXT>\n"
        "Recent conversation:\nTherapist: Earlier question.\nPatient: Earlier accepted reply.\n"
        "Source-grounded conversation memory:\nOriginal source quotation.\n\n---\n"
        "Dynamic state metadata (not additional patient-profile facts)\n"
        "Last discussed topic: TherapyProcess → HomeworkPractice\n"
        "Current topic: TherapyProcess → HomeworkPractice\n"
        "Prior emotional tone (last turn): Fear\n"
        f"Affect intensity: {intensity} (high tension, emotions close to the surface)\n"
        "Therapist-triggered context event: neutral\n"
        "Dominant affect systems:\n" + "\n".join(bands) + "\n</ARM_CONTEXT>\n\n"
        "<LATEST_THERAPIST_QUESTION>\nSynthetic fifth therapist question?\n"
        "</LATEST_THERAPIST_QUESTION>\n\nPatient reply:\n"
    )


class RecoveryAbort(RuntimeError):
    def __init__(self, reason, details):
        super().__init__(reason)
        self.details = details


class FakeRunner:
    def __init__(self):
        self.calls = []
        self.check_count = 0
        self.fatal = None

    def generate(self, prompt, temperature=None, max_tokens=None, *, thinking_budget=None):
        self.calls.append({"prompt": prompt, "temperature": temperature,
                           "max_tokens": max_tokens, "thinking_budget": thinking_budget})
        return "Offline ordinary generation."

    def check(self):
        self.check_count += 1
        if self.fatal is not None:
            raise self.fatal

    def abort(self, reason, details):
        self.fatal = RecoveryAbort(reason, details)
        raise self.fatal


class OfflineTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="llmpatient-resume03-unit-")
        self.addCleanup(temporary.cleanup)
        self.path = Path(temporary.name).resolve()
        self.evidence = self.path / "recovery-events.jsonl"
        for target, name in ((socket.socket, "connect"), (socket.socket, "connect_ex"),
                             (socket, "create_connection"), (subprocess, "Popen"), (os, "system")):
            self.patch(target, name, side_effect=AssertionError("Offline recovery unit test forbids external execution"))
        for name in ("fork", "posix_spawn", "posix_spawnp"):
            if hasattr(os, name):
                self.patch(os, name, side_effect=AssertionError("Offline test forbids process creation"))
        self.patch(recovery.original, "bootstrap_runtime", side_effect=AssertionError("Native preflight is outside this unit suite"))

    def patch(self, target, name, *args, **kwargs):
        patcher = patch.object(target, name, *args, **kwargs)
        result = patcher.start()
        self.addCleanup(patcher.stop)
        return result


class PromptBoundaryTests(OfflineTests):
    def test_identical_prompt_is_reported_as_identical(self):
        value = prompt()
        result = recovery.compare_prompt(value, value)
        self.assertTrue(result["identical"])
        self.assertTrue(result["non_affect_content_identical"])
        self.assertEqual("", result["difference"])
        self.assertFalse(result["affect_rng_checkpoint_available"])

    def test_ordinary_affect_metrics_and_rank_order_may_change(self):
        previous = prompt()
        current = prompt(intensity="0.85", bands=[
            "- Rage (0.18): Irritable, confrontational edge with flashes of anger.",
            "- Panic/Grief (0.17): Separation distress, loss, or grief-heavy weight.",
            "- Fear (0.16): Hypervigilant, anxious energy with protective scanning.",
        ])
        result = recovery.compare_prompt(previous, current)
        self.assertFalse(result["identical"])
        self.assertTrue(result["non_affect_content_identical"])
        self.assertEqual(recovery.sha_text(previous), result["previous_prompt_sha256"])
        self.assertEqual(recovery.sha_text(current), result["resumed_prompt_sha256"])
        self.assertIn("Affect intensity: 0.85", result["difference"])

    def test_case_history_evidence_topics_event_and_question_changes_are_refused(self):
        previous = prompt()
        replacements = {
            "case": ("Synthetic frozen clinical case.", "Different clinical condition."),
            "history": ("Earlier accepted reply.", "Replacement accepted reply."),
            "source": ("Original source quotation.", "Replacement source quotation."),
            "last_topic": ("Last discussed topic: TherapyProcess", "Last discussed topic: Relationships"),
            "current_topic": ("Current topic: TherapyProcess", "Current topic: Relationships"),
            "classification": ("Prior emotional tone (last turn): Fear", "Prior emotional tone (last turn): Seeking"),
            "event": ("context event: neutral", "context event: empathy"),
            "question": ("Synthetic fifth therapist question?", "Different therapist question?"),
        }
        for field, (before, after) in replacements.items():
            with self.subTest(field=field), self.assertRaises(RuntimeError):
                recovery.compare_prompt(previous, previous.replace(before, after))

    def test_missing_or_ambiguous_metadata_is_refused(self):
        previous = prompt()
        variants = [previous.replace("Dynamic state metadata", "Missing metadata"),
            previous + "\nDynamic state metadata (not additional patient-profile facts)\n",
            previous.replace("Affect intensity: 0.84", "No intensity: 0.84"),
            previous.replace("Dominant affect systems:", "No dominant bands:"),
            previous.replace("Dominant affect systems:", "Affect intensity: 0.84 (high tension, emotions close to the surface)\nDominant affect systems:")]
        for index, current in enumerate(variants):
            with self.subTest(variant=index), self.assertRaises(RuntimeError):
                recovery.compare_prompt(previous, current)

    def test_non_affective_text_cannot_hide_inside_masked_band_lines(self):
        previous = prompt()
        variants = [
            previous.replace("</ARM_CONTEXT>", "- New clinical fact: a different diagnosis.\n</ARM_CONTEXT>"),
            previous.replace("Separation distress, loss, or grief-heavy weight.", "The patient has a new unrecorded condition."),
            previous.replace("Dominant affect systems:", "Dominant affect systems: a changed clinical claim"),
            previous.replace("Affect intensity: 0.84", "Affect intensity: a new clinical claim"),
        ]
        for index, current in enumerate(variants):
            with self.subTest(variant=index), self.assertRaises(RuntimeError):
                recovery.compare_prompt(previous, current)


class RecoveryGateTests(OfflineTests):
    def setUp(self):
        super().setUp()
        self.runner = FakeRunner()
        self.stage = "classify_topic_and_emotion"
        self.patch(recovery, "current_stage", side_effect=lambda: self.stage)
        self.audit = {
            "saved_classifier_request": {"prompt": "Exact archived classifier prompt.",
                "graph_requested_config": {"temperature": 0.0, "max_tokens": 4096, "thinking_budget": None}},
            "saved_classifier_outcome": {"text": '```json\n{"topic_label":"TherapyProcess → HomeworkPractice","emotion_label":"FEAR"}\n```',
                "native_record_id": "offline-archived-record", "logical_id": "offline-logical-request"},
            "failed_request": {"prompt": prompt(),
                "graph_requested_config": {"temperature": None, "max_tokens": None, "thinking_budget": None}},
        }

    def install(self, **kwargs):
        self.progress = recovery.install_recovery_gate(self.runner, self.audit, self.evidence, **kwargs)
        return self.progress

    def classify(self):
        self.stage = "classify_topic_and_emotion"
        return self.runner.generate(self.audit["saved_classifier_request"]["prompt"], temperature=0.0, max_tokens=4096)

    def records(self):
        return [json.loads(line) for line in self.evidence.read_text().splitlines()] if self.evidence.exists() else []

    def test_classifier_reuse_has_original_provenance_and_no_external_call(self):
        self.install()
        result = self.classify()
        self.assertEqual(self.audit["saved_classifier_outcome"]["text"], result)
        self.assertEqual([], self.runner.calls)
        self.assertEqual({"classifier_reused": True, "patient_request_checked": False}, self.progress)
        records = self.records()
        self.assertEqual(1, len(records))
        self.assertEqual("reuse_successful_classifier", records[0]["event"])
        self.assertIs(records[0]["external_call"], False)
        self.assertEqual("offline-archived-record", records[0]["native_record_id"])
        self.assertEqual("offline-logical-request", records[0]["logical_id"])
        self.assertEqual(recovery.sha_text(self.audit["saved_classifier_request"]["prompt"]), records[0]["prompt_sha256"])
        self.assertNotIn("response_id", records[0])

    def test_cached_classifier_cannot_be_consumed_twice(self):
        self.install()
        self.classify()
        with self.assertRaises(RecoveryAbort):
            self.classify()
        self.assertEqual([], self.runner.calls)
        self.assertEqual(1, len(self.records()))

    def test_first_patient_request_cannot_bypass_classifier_reuse(self):
        self.install()
        self.stage = "generate_response"
        with self.assertRaises(RecoveryAbort):
            self.runner.generate(prompt())
        self.assertEqual([], self.runner.calls)
        self.assertEqual([], self.records())

    def test_mismatched_classifier_prompt_aborts_and_latches(self):
        self.install()
        with self.assertRaises(RecoveryAbort):
            self.runner.generate("Different classifier prompt.", temperature=0.0, max_tokens=4096)
        self.assertFalse(self.progress["classifier_reused"])
        with self.assertRaises(RecoveryAbort):
            self.classify()
        self.assertEqual([], self.runner.calls)
        self.assertEqual([], self.records())

    def test_each_mismatched_classifier_keyword_aborts(self):
        changes = ({"temperature": .1}, {"max_tokens": 8192}, {"thinking_budget": 1024})
        for changed in changes:
            with self.subTest(changed=changed):
                runner = FakeRunner()
                progress = recovery.install_recovery_gate(runner, self.audit, self.evidence)
                kwargs = {**self.audit["saved_classifier_request"]["graph_requested_config"], **changed}
                with self.assertRaises(RecoveryAbort):
                    runner.generate(self.audit["saved_classifier_request"]["prompt"], **kwargs)
                self.assertFalse(progress["classifier_reused"])
                self.assertEqual([], runner.calls)

    def test_unexpected_stage_after_reuse_aborts_before_provider(self):
        self.install()
        self.classify()
        self.stage = "_generate_session_reflection"
        with self.assertRaises(RecoveryAbort):
            self.runner.generate("Unexpected reflection.")
        self.assertEqual([], self.runner.calls)
        self.assertFalse(self.progress["patient_request_checked"])

    def test_first_patient_configuration_must_match_failed_request(self):
        self.install()
        self.classify()
        self.stage = "generate_response"
        with self.assertRaises(RecoveryAbort):
            self.runner.generate(prompt(), temperature=.7)
        self.assertEqual([], self.runner.calls)

    def test_first_patient_non_affective_prompt_change_aborts(self):
        self.install()
        self.classify()
        self.stage = "generate_response"
        with self.assertRaises(RecoveryAbort):
            self.runner.generate(prompt().replace("Earlier accepted reply.", "Different historical reply."))
        self.assertEqual([], self.runner.calls)
        self.assertEqual("recovery_prompt_mismatch", self.runner.fatal.details["kind"])

    def test_first_patient_then_later_calls_use_ordinary_runner(self):
        self.install()
        self.classify()
        current = prompt(intensity="0.85")
        self.stage = "generate_response"
        self.assertEqual("Offline ordinary generation.", self.runner.generate(current))
        self.assertTrue(all(self.progress.values()))
        self.assertEqual(current, self.runner.calls[0]["prompt"])
        self.stage = "classify_topic_and_emotion"
        self.assertEqual("Offline ordinary generation.", self.runner.generate("A later classifier.", 0.0, 4096))
        self.stage = "_generate_factual_memory"
        self.assertEqual("Offline ordinary generation.", self.runner.generate("Later facts.", .2, 8192, thinking_budget=1024))
        self.assertEqual(3, len(self.runner.calls))
        records = self.records()
        self.assertEqual(["reuse_successful_classifier", "resumed_prompt_verified"], [record["event"] for record in records])
        self.assertEqual("live", records[1]["mode"])
        self.assertTrue(records[1]["non_affect_content_identical"])
        self.assertEqual({"prompt": "Later facts.", "temperature": .2, "max_tokens": 8192,
                          "thinking_budget": 1024}, self.runner.calls[-1])

    def test_preflight_gate_stops_after_prompt_check_without_native_preflight(self):
        self.install(preflight=True)
        self.classify()
        self.stage = "generate_response"
        with self.assertRaises(recovery.PreflightComplete):
            self.runner.generate(prompt(intensity="0.85"))
        self.assertEqual([], self.runner.calls)
        self.assertTrue(all(self.progress.values()))
        self.assertEqual("offline_preflight", self.records()[1]["mode"])

    def test_existing_fatal_latch_blocks_even_cached_classifier(self):
        self.install()
        self.runner.fatal = RecoveryAbort("Already stopped", {"kind": "global_stop"})
        with self.assertRaises(RecoveryAbort):
            self.classify()
        self.assertFalse(self.progress["classifier_reused"])
        self.assertEqual([], self.runner.calls)
        self.assertEqual([], self.records())

    def test_classifier_provenance_write_failure_latches_before_reuse(self):
        self.install()
        self.patch(recovery.original, "append_jsonl", side_effect=OSError("Offline simulated journal write failure"))
        with self.assertRaises(RecoveryAbort):
            self.classify()
        self.assertFalse(self.progress["classifier_reused"])
        with self.assertRaises(RecoveryAbort):
            self.classify()
        self.assertEqual([], self.runner.calls)

    def test_patient_verification_write_failure_blocks_native_retry(self):
        self.install()
        self.classify()
        self.stage = "generate_response"
        self.patch(recovery.original, "append_jsonl", side_effect=OSError("Offline simulated journal write failure"))
        with self.assertRaises(RecoveryAbort):
            self.runner.generate(prompt())
        self.assertFalse(self.progress["patient_request_checked"])
        # A second entry must hit the fatal latch, never the ordinary generator.
        with self.assertRaises(RecoveryAbort):
            self.runner.generate(prompt())
        self.assertEqual([], self.runner.calls)


class AttachSessionTests(OfflineTests):
    def fixture(self):
        therapist, patient = f"comparison_{recovery.RUN_ID}", "juanita_delgado_001"
        turns = [{"turn_index": number, "total_turns": number, "therapist_input_raw": f"Therapist {number}.",
                  "therapist_input_safe": f"Therapist {number}.",
                  "patient_response": f"Patient {number}."} for number in range(1, 5)]
        restored = {"therapist_id": therapist, "session_id": recovery.SESSION_ID, "total_turns": 4,
                    "history": [{"therapist": turn["therapist_input_raw"], "patient": turn["patient_response"]} for turn in turns],
                    "messages": [message for turn in turns for message in (
                        SimpleNamespace(type="human", content=turn["therapist_input_raw"]),
                        SimpleNamespace(type="ai", content=turn["patient_response"]))]}
        data = {"therapist_id": therapist, "sessions": [{"session_id": recovery.SESSION_ID,
                 "patient_id": patient, "source": "api", "mode": "live", "turns": turns}]}
        run_dir = self.path / recovery.RUN_ID
        logger = SimpleNamespace(data=data, current_session_index=None,
            file_path=run_dir / "runs" / f"{therapist}.json", restore_state=Mock(return_value=restored),
            start_run=Mock(side_effect=AssertionError("Recovery must not create another session")))
        run_logger = SimpleNamespace(RunLogger=Mock(return_value=logger))
        api = SimpleNamespace(session_loggers={})
        config = {"run_id": recovery.RUN_ID, "native_api_id": patient, "arm": "structured_common_profile"}
        return api, run_logger, config, run_dir, logger, restored

    def test_attach_existing_session_without_starting_or_appending_one(self):
        api, module, config, run_dir, logger, restored = self.fixture()
        before = copy.deepcopy(logger.data)
        key = recovery.attach_open_session(api, module, config, run_dir)
        self.assertEqual((f"comparison_{recovery.RUN_ID}", config["native_api_id"], recovery.SESSION_ID), key)
        self.assertEqual(0, logger.current_session_index)
        self.assertEqual(before, logger.data)
        logger.start_run.assert_not_called()
        logger.restore_state.assert_called_once_with(config["native_api_id"])
        module.RunLogger.assert_called_once_with(key[0])
        self.assertIs(api.session_loggers[key]["logger"], logger)
        self.assertIs(api.session_loggers[key]["base_state"], restored)

    def test_closed_foreign_or_wrong_length_session_is_refused(self):
        cases = ("ended_at", "session_id", "patient_id", "turns", "extra_session")
        for field in cases:
            with self.subTest(field=field):
                api, module, config, run_dir, logger, _ = self.fixture()
                session = logger.data["sessions"][0]
                if field == "extra_session":
                    logger.data["sessions"].append(copy.deepcopy(session))
                elif field == "turns":
                    session["turns"].pop()
                else:
                    session[field] = "foreign_or_closed"
                with self.assertRaises(RuntimeError):
                    recovery.attach_open_session(api, module, config, run_dir)
                logger.start_run.assert_not_called()
                self.assertEqual({}, api.session_loggers)

    def test_incomplete_four_turn_snapshot_is_refused(self):
        for field in ("total_turns", "history", "messages"):
            with self.subTest(field=field):
                api, module, config, run_dir, logger, restored = self.fixture()
                if field == "total_turns":
                    restored[field] = 5
                else:
                    restored[field].pop()
                with self.assertRaises(RuntimeError):
                    recovery.attach_open_session(api, module, config, run_dir)
                self.assertEqual({}, api.session_loggers)
                self.assertIsNone(logger.current_session_index)

    def test_same_length_corrupted_history_or_messages_is_refused(self):
        for field in ("history", "messages"):
            with self.subTest(field=field):
                api, module, config, run_dir, logger, restored = self.fixture()
                if field == "history":
                    restored["history"][2]["patient"] = "Unarchived replacement answer."
                else:
                    restored["messages"][5].content = "Unarchived replacement answer."
                with self.assertRaises(RuntimeError):
                    recovery.attach_open_session(api, module, config, run_dir)
                self.assertEqual({}, api.session_loggers)
                self.assertIsNone(logger.current_session_index)


if __name__ == "__main__":
    unittest.main()
