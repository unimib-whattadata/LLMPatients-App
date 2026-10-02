"""Offline exporter checks using explicitly fictitious answers; no inference."""
from __future__ import annotations

import copy
import importlib.util
import json
import socket
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("memory_comparison_export_review", HERE / "export_review.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)
PLAN = HERE.parent / "memory-comparison-plan-2026-09-28"


class ExportReviewTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="offline-review-export-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.plan, self.runtime, self.output = self.root / "plan", self.root / "runtime", self.root / "review"
        self.plan.mkdir()
        matrix = json.loads((PLAN / "design/run-matrix.json").read_text())
        self.rows = copy.deepcopy(matrix["runs"][:2])
        self.matrix = {"runs": self.rows}
        for name in ("SCORING.md", "PROTOCOL.md"):
            (self.plan / name).write_bytes((PLAN / name).read_bytes())
        (self.plan / "design").mkdir()
        self.write(self.plan / "design/run-matrix.json", self.matrix)
        for row in self.rows:
            for field in ("scenario_path", "evaluator_only_gold_path"):
                target = self.plan / "design" / row[field]
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((PLAN / "design" / row[field]).read_bytes())
        self.freeze_fixture()
        self.network = patch.object(socket.socket, "connect", side_effect=AssertionError("Network forbidden in export tests"))
        self.network.start()
        self.addCleanup(self.network.stop)

    @staticmethod
    def write(path, data):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(exporter.encoded(data))

    def freeze_fixture(self):
        self.write(self.plan / "package-manifest.json", {"scope": "OFFLINE FIXTURE ONLY",
            "files": {str(p.relative_to(self.plan)): exporter.sha(p.read_bytes())
                      for p in self.plan.rglob("*") if p.is_file() and p.name != "package-manifest.json"}})

    def ledger(self, row, count=55, guarded=None):
        scenario = json.loads((self.plan / "design" / row["scenario_path"]).read_text())
        records = []
        for session in scenario["sessions"]:
            for turn in session["turns"]:
                if len(records) == count:
                    break
                record = {"run_id": row["run_id"], "status": "accepted", "turn_index": len(records) + 1,
                          "session_index": session["session_index"], "turn_id": turn["turn_id"],
                          "therapist_text": turn["text"],
                          "patient_text": f"OFFLINE STUB ONLY: visible answer {len(records) + 1}.\n  Exact spacing.  ",
                          "arm": row["arm"], "prompt": "HIDDEN_PROMPT_SENTINEL",
                          "reasoning": "HIDDEN_REASONING_SENTINEL", "cost": "HIDDEN_COST_SENTINEL",
                          "retrieved_evidence": "HIDDEN_RETRIEVAL_SENTINEL", "safety_flags": [],
                          "application_guard_failure": False}
                if turn["turn_id"] == guarded:
                    record.update(safety_flags=["HIDDEN_GUARD_SENTINEL"], application_guard_failure=True)
                records.append(record)
        path = self.runtime / row["run_id"] / "accepted-turns.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"".join(json.dumps(r, ensure_ascii=False).encode() + b"\n" for r in records))
        return records

    def export(self):
        return exporter.export_review(self.plan, self.runtime, self.output)

    def cards(self):
        return json.loads((self.output / "evaluator_a/cards.json").read_text())["cards"]

    def test_packet_copies_are_identical_metadata_free_and_preserve_exact_answers(self):
        originals = self.ledger(self.rows[0], guarded="s11t01")
        self.ledger(self.rows[1])
        self.write(self.runtime / self.rows[0]["run_id"] / "probe-outcomes.json", {
            "outcomes": [{"turn_id": "s11t01", "status": "application_failure"},
                         {"turn_id": "s01t01", "status": "application_failure"}]})
        result = self.export()
        self.assertEqual("semantic_review_pending", result["status"])
        self.assertEqual(0, result["scores_assigned"])
        self.assertEqual({"planned_runs": 2, "ledgers_present": 2, "durable_turns": 110,
                          "planned_probes": 12, "exported_answers": 12, "missing_answers": 0}, result["input_counts"])
        for path in (self.output / "evaluator_a").iterdir():
            self.assertEqual(path.read_bytes(), (self.output / "evaluator_b" / path.name).read_bytes())
        text = (self.output / "evaluator_a/cards.json").read_text()
        for forbidden in ("structured_common_profile", "flat_full_history", "HIDDEN_", "profile_source",
                          "profile_paths", str(self.runtime), self.rows[0]["run_id"], "reasoning", "metadata"):
            self.assertNotIn(forbidden, text)
        cards = self.cards()
        self.assertEqual(12, len({c["id"] for c in cards}))
        for card in cards:
            self.assertEqual({"id", "question", "response", "gold"}, set(card))
            self.assertRegex(card["id"], r"^[0-9a-f]{32}$")
            self.assertIn(card["response"], [r["patient_text"] for r in originals])
        mapping = json.loads((self.output / "private/mapping.json").read_text())["records"]
        guarded = next(r for r in mapping if r["run_id"] == self.rows[0]["run_id"] and r["turn_id"] == "s11t01")
        self.assertTrue(guarded["answer_available"])
        self.assertTrue(guarded["application_guard_failure"])
        self.assertEqual("application_failure", guarded["declared_outcome"])
        self.assertEqual(["HIDDEN_GUARD_SENTINEL"], guarded["safety_flags"])
        self.assertIn(guarded["id"], {c["id"] for c in cards})

    def test_missing_answers_are_separate_and_causes_are_not_inferred(self):
        self.ledger(self.rows[0], count=51)
        self.write(self.runtime / self.rows[0]["run_id"] / "probe-outcomes.json", {
            "outcomes": [{"turn_id": "s11t02", "status": "application_failure"},
                         {"turn_id": "s11t03", "status": "not_observed"}]})
        result = self.export()
        self.assertEqual(2, result["input_counts"]["exported_answers"])
        self.assertEqual(10, result["input_counts"]["missing_answers"])
        missing = json.loads((self.output / "missing.json").read_text())["records"]
        self.assertEqual(1, sum(r["availability"] == "application_failure" for r in missing))
        self.assertEqual(9, sum(r["availability"] == "not_observed" for r in missing))
        for row in missing:
            self.assertEqual({"id", "availability"}, set(row))
            self.assertNotIn(row["id"], {c["id"] for c in self.cards()})
        self.assertFalse((self.output / "evaluator_a/missing.json").exists())

    def test_gold_sources_include_original_therapist_text_and_profile_facts_without_paths(self):
        self.ledger(self.rows[0])
        self.export()
        cards = self.cards()
        identity = next(c for c in cards if isinstance(c["gold"]["expected"], dict) and "age" in c["gold"]["expected"])
        self.assertEqual({"name": "Alex Carter", "age": 30}, identity["gold"]["expected"])
        self.assertEqual({"canonical_profile_fact"}, {s["kind"] for s in identity["gold"]["sources"]})
        appointment = next(c for c in cards if isinstance(c["gold"]["expected"], dict) and "current" in c["gold"]["expected"])
        self.assertEqual(3, len(appointment["gold"]["sources"]))
        texts = " ".join(s["text"] for s in appointment["gold"]["sources"])
        self.assertIn("Wednesday at 17:45", texts)
        self.assertIn("Saturday at 09:30", texts)
        self.assertEqual(["source_3"], appointment["gold"]["field_sources"]["proposal_only"])
        absent = next(c for c in cards if c["gold"]["expected"] is None)
        self.assertEqual([], absent["gold"]["sources"])
        self.assertIn("surname", absent["gold"]["criterion"])

    def test_no_answers_yet_exports_no_fake_rating_cards(self):
        result = self.export()
        self.assertEqual([], self.cards())
        self.assertEqual(12, result["input_counts"]["missing_answers"])
        self.assertEqual(0, result["live_calls"])

    def test_duplicate_or_partial_ledger_is_rejected_without_export(self):
        records = self.ledger(self.rows[0], count=1)
        path = self.runtime / self.rows[0]["run_id"] / "accepted-turns.jsonl"
        with path.open("ab") as stream:
            stream.write(json.dumps(records[0]).encode() + b"\n")
        with self.assertRaisesRegex(exporter.ExportError, "duplicate"):
            self.export()
        self.assertFalse(self.output.exists())
        path.write_bytes(json.dumps(records[0]).encode())
        with self.assertRaisesRegex(exporter.ExportError, "incomplete final line"):
            self.export()

    def test_frozen_input_mutation_or_future_gold_source_is_rejected(self):
        gold_path = self.plan / "design" / self.rows[0]["evaluator_only_gold_path"]
        gold = json.loads(gold_path.read_text())
        gold["probes"][1]["expected"]["notebook_title"] = "Changed target"
        self.write(gold_path, gold)
        with self.assertRaisesRegex(exporter.ExportError, "Frozen plan input mismatch"):
            self.export()
        self.assertFalse(self.output.exists())
        gold["probes"][1]["source_turns"] = ["s11t05"]
        self.write(gold_path, gold)
        self.freeze_fixture()
        with self.assertRaisesRegex(exporter.ExportError, "must precede"):
            self.export()

    def test_existing_export_is_never_overwritten(self):
        self.export()
        original = (self.output / "manifest.json").read_bytes()
        with self.assertRaisesRegex(exporter.ExportError, "already exists"):
            self.export()
        self.assertEqual(original, (self.output / "manifest.json").read_bytes())

    def test_design_prefixed_references_and_nonprobe_outcomes_work(self):
        for row in self.rows:
            row["scenario_path"] = "design/" + row["scenario_path"]
            row["evaluator_only_gold_path"] = "design/" + row["evaluator_only_gold_path"]
        self.write(self.plan / "design/run-matrix.json", {"runs": self.rows})
        self.freeze_fixture()
        self.write(self.runtime / self.rows[0]["run_id"] / "probe-outcomes.json", {
            "outcomes": [{"turn_id": "s01t02", "status": "application_failure"}]})
        result = self.export()
        self.assertEqual(12, result["input_counts"]["missing_answers"])
        self.assertNotIn("application_failure", (self.output / "missing.json").read_text())

    def test_sidecar_cannot_remove_a_visible_answer(self):
        self.ledger(self.rows[0], count=51)
        self.write(self.runtime / self.rows[0]["run_id"] / "probe-outcomes.json", {
            "outcomes": [{"turn_id": "s11t01", "status": "not_observed"}]})
        with self.assertRaisesRegex(exporter.ExportError, "not observed for an archived answer"):
            self.export()
        self.assertFalse(self.output.exists())

    def test_answer_content_is_never_redacted_to_improve_masking(self):
        records = self.ledger(self.rows[0], count=51)
        records[-1]["patient_text"] = "OFFLINE STUB: a visible mention of flat_full_history must remain."
        path = self.runtime / self.rows[0]["run_id"] / "accepted-turns.jsonl"
        path.write_bytes(b"".join(json.dumps(r).encode() + b"\n" for r in records))
        self.export()
        self.assertIn(records[-1]["patient_text"], [c["response"] for c in self.cards()])


if __name__ == "__main__":
    unittest.main()
