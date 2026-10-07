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
PREVIOUS_RESUME = HERE.parent / "resume-02"
ORIGINAL_RUNTIME = PREVIOUS_RESUME / "runtime"
RETIRED_STOP = "previous-stop-resume-02.json"
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
        elif mode == "session10":
            asyncio.run(harness.execute_session(
                10, runtime, offline_model=model, offline_gate=NoWaitGate(),
            ))
        else:
            raise AssertionError(f"Unknown worker mode: {mode}")
    finally:
        modules = {}
        for name in ("agent.api.app", "agent.core.langgraph_builder", "agent.core.factual_memory"):
            module = sys.modules.get(name)
            if module is not None and getattr(module, "__file__", None):
                modules[name] = str(Path(module.__file__).resolve())
        json_write(observation, {
            "pid": os.getpid(), "calls": model.calls, "module_files": modules,
            "patient_calls": sum(call["stage"] == "generate_response" for call in model.calls),
        })


class ResumeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.runtime = self.root / "runtime"
        shutil.copytree(ORIGINAL_RUNTIME, self.runtime)
        self.result_path = self.runtime / "sessions/session_09/session.json"
        self.ledger_path = self.runtime / "runs" / f"{harness.THERAPIST_ID}.json"
        self.memory_path = next((self.runtime / "memory").glob("*.jsonl"))
        self.events_path = self.runtime / "sessions/session_09/generation-events.jsonl"
        self.result_before = json_read(self.result_path)
        self.ledger_before = json_read(self.ledger_path)
        self.memory_before = self.memory_path.read_bytes()
        self.events_before = self.events_path.read_bytes()
        self.stop_before = (self.runtime / "STOP").read_bytes()
        self.protected_directories = {
            "integration": INTEGRATION,
            "resume-01": HERE.parent / "resume-01",
            "resume-02": PREVIOUS_RESUME,
        }
        self.protected_before = {name: fingerprint(path)
                                 for name, path in self.protected_directories.items()}
        self.prior_sessions_before = {
            index: fingerprint(self.runtime / f"sessions/session_{index:02d}")
            for index in range(1, 9)
        }
        self.assertEqual("stopped", self.result_before["status"])
        self.assertEqual([], self.result_before["turns"])
        self.assertEqual(9, len(self.ledger_before["sessions"]))
        self.assertEqual([], self.ledger_before["sessions"][8]["turns"])
        self.assertEqual({}, self.ledger_before["sessions"][8]["final_state"])
        self.assertEqual(40, self.ledger_before["sessions"][7]["final_state"]["total_turns"])
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

    def worker(self, mode="resume", variant="complete"):
        log = self.root / f"{mode}-{variant}.log"
        command = [str(harness.BUNDLED_PYTHON), str(HERE / "test_resume.py"),
                   "--offline-worker", mode, str(self.runtime), variant]
        env = harness.worker_environment()
        env["OPENROUTER_API_KEY_FILE"] = str(self.root / "ABSENT_FAKE_KEY")
        with log.open("w") as stream:
            result = subprocess.run(command, env=env, cwd=self.root,
                                    stdout=stream, stderr=subprocess.STDOUT, timeout=180)
        observation_path = self.runtime / f"offline-{mode}-observation.json"
        self.assertTrue(observation_path.exists(), log.read_text()[-6000:])
        return result, json_read(observation_path), log

    def assert_saved_prefix(self):
        ledger = json_read(self.ledger_path)["sessions"]
        self.assertEqual(self.ledger_before["sessions"][:8], ledger[:8])
        original_open = self.ledger_before["sessions"][8]
        for field in ("session_id", "run_id", "patient_id", "started_at", "metadata"):
            self.assertEqual(original_open[field], ledger[8][field], field)
        self.assertTrue(self.memory_path.read_bytes().startswith(self.memory_before))
        self.assertTrue(self.events_path.read_bytes().startswith(self.events_before))
        self.assertEqual(self.stop_before, (self.runtime / RETIRED_STOP).read_bytes())
        for index, expected in self.prior_sessions_before.items():
            self.assertEqual(expected, fingerprint(self.runtime / f"sessions/session_{index:02d}"))

    def new_events(self):
        suffix = self.events_path.read_bytes()[len(self.events_before):]
        return [json.loads(line) for line in suffix.decode().splitlines() if line.strip()]

    def test_prior_stop_is_retired_only_in_the_runtime_copy(self):
        import resume_integration as resume
        resume.retire_prior_stop(self.runtime)
        self.assertFalse((self.runtime / "STOP").exists())
        self.assertEqual(self.stop_before, (self.runtime / RETIRED_STOP).read_bytes())
        self.assertEqual(self.stop_before, (ORIGINAL_RUNTIME / "STOP").read_bytes())
        self.assertEqual(self.memory_before, self.memory_path.read_bytes())
        self.assertEqual(self.ledger_before, json_read(self.ledger_path))

    def test_resume_preserves_40_turns_closes_nine_and_reopens_session_ten(self):
        prior_process_journals = {
            path.name: path.read_bytes() for path in self.runtime.glob("processes*.jsonl")
        }
        # The controller's new journal exists before native checkpoint validation.
        (self.runtime / "processes-resume-03.jsonl").write_text(json.dumps({
            "event": "start", "session_index": 9, "pid": os.getpid(),
            "amendment_id": "memory-integration-fix-2026-09-28-resume-03",
        }) + "\n")
        completed, observed, log = self.worker()
        self.assertEqual(0, completed.returncode, log.read_text()[-6000:])
        for name, expected in prior_process_journals.items():
            self.assertEqual(expected, (self.runtime / name).read_bytes(), name)
        self.assertEqual(5, observed["patient_calls"])
        self.assert_saved_prefix()
        self.assertFalse((self.runtime / "STOP").exists())
        result = json_read(self.result_path)
        self.assertEqual("completed", result["status"])
        self.assertEqual("finalized", result["finalization"]["status"])
        self.assertEqual(5, len(result["turns"]))
        self.assertEqual([41, 42, 43, 44, 45], [row["total_turns"] for row in result["turns"]])
        self.assertEqual(["s09t01", "s09t02", "s09t03", "s09t04", "s09t05"], [
            row["turn_id"] for row in self.new_events()
            if row["event"] == "request" and row.get("stage") == "generate_response"
        ])
        ledger = json_read(self.ledger_path)["sessions"]
        self.assertEqual(9, len(ledger), "Closing the resumed run appended a duplicate session")
        self.assertEqual(5, len(ledger[8]["turns"]))
        self.assertTrue(ledger[8]["ended_at"])
        self.assertEqual(45, ledger[8]["final_state"]["total_turns"])
        # There was no accepted session-nine turn at the checkpoint. Its final
        # five-turn window must consist entirely of the five new responses.
        history = ledger[8]["final_state"]["history"]
        self.assertEqual(5, len(history))
        self.assertEqual([turn["therapist_text"] for turn in result["turns"]],
                         [turn["therapist"] for turn in history])
        self.assertEqual([turn["patient_text"] for turn in result["turns"]],
                         [turn["patient"] for turn in history])
        self.assertEqual(45, result["memory_record_counts"]["conversation_turn"])
        self.assertTrue(observed["module_files"])
        for path in observed["module_files"].values():
            self.assertTrue(Path(path).is_relative_to(INTEGRATION / "source"), path)

        completed_nine = ledger
        completed10, observed10, log10 = self.worker("session10")
        self.assertEqual(0, completed10.returncode, log10.read_text()[-6000:])
        tenth = json_read(self.runtime / "sessions/session_10/session.json")
        self.assertEqual("completed", tenth["status"])
        self.assertEqual(45, tenth["restored_before_first_request"]["total_turns"])
        self.assertEqual("memory_integration_s09",
                         tenth["restored_before_first_request"]["restored_session_id"])
        self.assertEqual(result["persisted_summary"], tenth["restored_before_first_request"]["summary"])
        self.assertNotEqual(observed["pid"], observed10["pid"])
        self.assertEqual(5, observed10["patient_calls"])
        ledger10 = json_read(self.ledger_path)["sessions"]
        self.assertEqual(10, len(ledger10))
        self.assertEqual(completed_nine, ledger10[:9])
        self.assertEqual(50, ledger10[9]["final_state"]["total_turns"])

    def test_mismatched_prefixes_completed_result_and_altered_stop_refused_before_calls(self):
        for corruption in ("ledger", "history", "memory", "result", "completed", "stop"):
            with self.subTest(corruption=corruption):
                shutil.rmtree(self.runtime)
                shutil.copytree(ORIGINAL_RUNTIME, self.runtime)
                if corruption in {"ledger", "history"}:
                    ledger = json_read(self.ledger_path)
                    if corruption == "ledger":
                        ledger["sessions"][8]["turns"].append({"patient_response": "Unaccepted reply."})
                    else:
                        ledger["sessions"][7]["final_state"]["history"][-1]["patient"] = "Tampered restored history."
                    json_write(self.ledger_path, ledger)
                elif corruption == "memory":
                    records = [json.loads(line) for line in self.memory_path.read_text().splitlines()]
                    source = next(row for row in records if row.get("type") == "conversation_turn"
                                  and row.get("turn_index") == 40)
                    source["patient_text"] = "Tampered memory source."
                    self.memory_path.write_text("".join(json.dumps(row) + "\n" for row in records))
                elif corruption == "stop":
                    (self.runtime / "STOP").write_text('{"tampered": true}\n')
                else:
                    result = json_read(self.result_path)
                    if corruption == "result":
                        result["turns"].append({"turn_id": "s09t01", "patient_text": "Unaccepted reply."})
                    else:
                        result["status"] = "completed"
                    json_write(self.result_path, result)
                memory_before = self.memory_path.read_bytes()
                ledger_before = self.ledger_path.read_bytes()
                completed, observed, log = self.worker()
                self.assertNotEqual(0, completed.returncode, log.read_text()[-6000:])
                self.assertEqual([], observed["calls"], log.read_text()[-6000:])
                self.assertEqual(memory_before, self.memory_path.read_bytes())
                self.assertEqual(ledger_before, self.ledger_path.read_bytes())
                if corruption == "stop":
                    self.assertTrue((self.runtime / "STOP").exists())
                    self.assertFalse((self.runtime / RETIRED_STOP).exists())

    def test_new_provider_errors_and_empty_classifier_stop_preserve_40_turns(self):
        for variant in ("http429", "inband429", "empty_stop"):
            with self.subTest(variant=variant):
                shutil.rmtree(self.runtime)
                shutil.copytree(ORIGINAL_RUNTIME, self.runtime)
                completed, observed, log = self.worker(variant=variant)
                self.assertNotEqual(0, completed.returncode, log.read_text()[-6000:])
                classifier_failure = variant in {"inband429", "empty_stop"}
                expected_stage = "classify_topic_and_emotion" if classifier_failure else "generate_response"
                self.assertEqual(0 if classifier_failure else 1,
                                 observed["patient_calls"], log.read_text()[-6000:])
                self.assertEqual(expected_stage, observed["calls"][-1]["stage"])
                self.assert_saved_prefix()
                self.assertTrue((self.runtime / "STOP").exists())
                result = json_read(self.result_path)
                self.assertEqual("stopped", result["status"])
                self.assertEqual([], result["turns"])
                self.assertEqual("IntegrationAbort", result["error"]["type"])
                self.assertNotIn("finalization", result)
                ledger = json_read(self.ledger_path)["sessions"]
                self.assertEqual(9, len(ledger))
                self.assertEqual([], ledger[8]["turns"])
                self.assertFalse(ledger[8].get("ended_at"))
                self.assertEqual({}, ledger[8]["final_state"])
                self.assertEqual(40, ledger[7]["final_state"]["total_turns"])
                self.assertEqual(self.memory_before, self.memory_path.read_bytes())
                events = self.new_events()
                failing_requests = [row for row in events if row["event"] == "request"
                                    and row.get("stage") == expected_stage]
                self.assertEqual(["s09t01"], [row["turn_id"] for row in failing_requests])
                fatal_index = next(i for i, row in enumerate(events) if row["event"] == "fatal")
                self.assertFalse(any(row["event"] == "request" for row in events[fatal_index + 1:]))


class StopGuardTests(unittest.TestCase):
    def test_latch_needs_no_filesystem_and_preserves_the_first_fatal(self):
        import resume_integration as resume

        lock = threading.Lock()
        constructed = []

        def make_abort(reason, details):
            self.assertTrue(lock.locked(), "Fatal state must be set under its lock")
            error = RuntimeError(reason)
            error.details = details
            constructed.append(error)
            return error

        runner = SimpleNamespace(fatal=None, fatal_lock=lock, abort_type=make_abort)
        with patch.object(resume, "write_json", side_effect=OSError("Disk unavailable")) as write, \
             patch.object(resume, "append_jsonl", side_effect=OSError("Disk unavailable")) as append:
            resume.latch_failure(runner, OSError("First failure"))
            first = runner.fatal
            self.assertIsNotNone(first)
            self.assertEqual({"kind": "controller_failure", "error_type": "OSError"}, first.details)
            resume.latch_failure(runner, ValueError("Secondary reporting failure"))
            self.assertIs(first, runner.fatal)
            self.assertEqual([first], constructed)
            write.assert_not_called()
            append.assert_not_called()

    def test_terminate_child_escalates_after_timeout_and_ignores_exited_child(self):
        import resume_integration as resume

        child = Mock()
        child.poll.return_value = None
        child.wait.side_effect = [subprocess.TimeoutExpired("offline-child", 10), 0]
        resume.terminate_child(child)
        self.assertEqual([
            call.poll(), call.terminate(), call.wait(timeout=10),
            call.kill(), call.wait(timeout=10),
        ], child.mock_calls)

        exited = Mock()
        exited.poll.return_value = 0
        resume.terminate_child(exited)
        self.assertEqual([call.poll()], exited.mock_calls)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--offline-worker":
        offline_worker(sys.argv[2], Path(sys.argv[3]), sys.argv[4] if len(sys.argv) > 4 else "complete")
    else:
        unittest.main()
