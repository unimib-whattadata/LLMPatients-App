"""Check memory finalization without network calls or model downloads."""
import asyncio
import os
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from agent.core.llm_provider_vertex import VertexLLMRunner
from agent.core.memory_store import JsonlMemoryStore

_runner = VertexLLMRunner.__new__(VertexLLMRunner)
_runner.model_id = "gemini-2.5-pro"
_runner.max_tokens = 4096
_encoder = Mock()
_encoder.get_sentence_embedding_dimension.return_value = 3
with patch("agent.core.llm_runner.create_llm_runner", return_value=_runner), \
     patch("sentence_transformers.SentenceTransformer", return_value=_encoder):
    from agent.core import langgraph_builder as builder

# RunLogger migrates relative legacy files on import; isolate that import too.
with tempfile.TemporaryDirectory() as _import_dir:
    _cwd = Path.cwd()
    try:
        os.chdir(_import_dir)
        from agent.api import app as api
    finally:
        os.chdir(_cwd)


class TestSessionMemory(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.store = JsonlMemoryStore(Path(self.directory.name))
        self.llm = Mock()
        for name, value in [
            ("MEMORY_STORE", self.store), ("LONG_TERM_STORE", Mock()),
            ("llm_runner", self.llm), ("MEMORY_CACHE_LOADED", {}),
            ("LATEST_SUMMARY_CACHE", {}), ("LATEST_REFLECTION_CACHE", {}),
        ]:
            patcher = patch.object(builder, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.state = {
            "patient_id": "patient", "therapist_id": "therapist", "session_id": "session",
            "history": [{"therapist": "What did we agree?", "patient": "A walk on Friday."}],
            "summary": "Previous completed memory.",
        }

    def test_failed_summary_preserves_memory_and_session_state(self):
        builder.persist_long_term_summary(
            patient_id="patient", therapist_id="therapist", summary_text="Previous completed memory.",
        )
        path = self.store.file_path("patient", "therapist")
        before = path.read_bytes()
        self.llm.generate.side_effect = ["A complete reflection.", ""]
        with self.assertRaises(builder.SessionMemoryError):
            builder.finalize_session_memory(self.state)
        self.assertEqual(path.read_bytes(), before)
        self.assertEqual(self.state["summary"], "Previous completed memory.")
        self.assertNotIn("session_reflection", self.state)

    def test_failed_reflection_is_not_persisted(self):
        self.llm.generate.return_value = ""
        with self.assertRaises(builder.SessionMemoryError):
            builder.finalize_session_memory(self.state)
        self.assertEqual(self.llm.generate.call_count, 1)
        self.assertEqual(list(self.store.iter_records("patient", "therapist")), [])

    def test_api_keeps_session_open_when_memory_generation_fails(self):
        logger = Mock()
        key = ("therapist", "patient", "session")
        sessions = {key: {"logger": logger, "latest_state": self.state}}
        self.llm.generate.return_value = ""
        with patch.object(api, "session_loggers", sessions):
            with self.assertRaises(builder.SessionMemoryError):
                asyncio.run(api.end_session(api.SessionEndRequest(
                    external_patient_id="patient", therapist_id="therapist", session_id="session",
                )))
        self.assertIn(key, sessions)
        logger.finalize.assert_not_called()

    def test_complete_memory_is_persisted_and_reloaded_without_caches(self):
        reflection = "I agreed to go for a walk on Friday. I felt heard."
        summary = "I have agreed to go for a walk on Friday. I want to discuss how it goes."
        self.llm.generate.side_effect = [reflection, summary]
        result = builder.finalize_session_memory(self.state)
        records = list(JsonlMemoryStore(Path(self.directory.name)).iter_records("patient", "therapist"))
        self.assertEqual([r["type"] for r in records], ["session_reflection", "long_term_summary"])
        self.assertEqual([r["text"] for r in records], [reflection, summary])
        builder.LATEST_SUMMARY_CACHE.clear()
        builder.LATEST_REFLECTION_CACHE.clear()
        builder.MEMORY_CACHE_LOADED.clear()
        self.assertEqual(builder.load_long_term_summary("patient", "therapist"), summary)
        self.assertEqual(result["session_reflection"], reflection)
        self.assertEqual(result["summary"], summary)

    def test_reflection_includes_turns_after_existing_episode(self):
        self.llm.generate.return_value = "A complete reflection."
        builder._generate_session_reflection(["An earlier disagreement."], self.state["history"])
        prompt = self.llm.generate.call_args.kwargs["prompt"]
        self.assertIn("An earlier disagreement.", prompt)
        self.assertIn("A walk on Friday.", prompt)

    def test_internal_budgets_cover_vertex_gemini_reasoning_only(self):
        with patch.object(builder, "llm_runner", _runner):
            for legacy in (192, 256, 320, 512):
                self.assertEqual(builder._internal_generation_budget(legacy), 4096)
        with patch.object(builder, "llm_runner", SimpleNamespace(model_id="local-model")):
            self.assertEqual(builder._internal_generation_budget(192), 192)


if __name__ == "__main__":
    unittest.main()
