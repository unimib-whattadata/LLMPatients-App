"""Offline checks of reporting only; no production imports or API calls."""
import copy
import unittest
from types import SimpleNamespace

import run_integration as harness


class CollectionTests(unittest.TestCase):
    def fixtures(self, *, partial=False, invalid=False):
        source = {"id": "turn1", "type": "conversation_turn", "usable": True}
        batch = {"id": "batch1", "type": "fact_batch", "source_ids": ["turn1"],
                 "facts": [{"id": "valid1"}] if not invalid else [], "rejected_facts": []}
        if partial:
            batch["rejected_facts"] = [{"index": 1, "reason": "unsupported status", "proposal": {"value": "rejected"}}]
        if invalid:
            batch.update(validation_error="Invalid JSON", extraction_response="{broken")
        status = "partial" if partial or invalid else "complete"
        stats = {"status": status, "source_turns": 1, "processed_sources": 1,
                 "validated_facts": len(batch["facts"]), "rejected_facts": len(batch["rejected_facts"]),
                 "invalid_batches": int(invalid)}
        ledger = {"final_state": {"memory_consolidation": stats}}
        public = {"memory_status": status, "memory_warnings": ["Sources retained; extraction partial"] if status == "partial" else []}
        response = SimpleNamespace(model_dump=lambda **kwargs: public)
        return response, ledger, [source, batch], public

    def test_complete_does_not_count_unverified_claims(self):
        response, ledger, records, _ = self.fixtures()
        evidence = harness.collect_consolidation_evidence(response, ledger, records)
        self.assertEqual("complete", evidence["memory_status"])
        self.assertEqual(["valid1"], evidence["consolidation_evidence"]["validated_fact_ids"])
        self.assertEqual([], evidence["consolidation_evidence"]["quarantined_fact_proposals"])

    def test_partial_keeps_rejected_and_accepted_separate_without_mutation(self):
        response, ledger, records, _ = self.fixtures(partial=True)
        original = copy.deepcopy(records)
        evidence = harness.collect_consolidation_evidence(response, ledger, records)
        self.assertEqual("partial", evidence["memory_status"])
        self.assertEqual(1, evidence["memory_consolidation"]["validated_facts"])
        self.assertEqual(1, evidence["memory_consolidation"]["rejected_facts"])
        self.assertEqual(["valid1"], evidence["consolidation_evidence"]["validated_fact_ids"])
        self.assertEqual(records, original)

    def test_invalid_batch_has_no_accepted_facts_and_retains_response(self):
        response, ledger, records, _ = self.fixtures(invalid=True)
        evidence = harness.collect_consolidation_evidence(response, ledger, records)
        self.assertEqual("partial", evidence["memory_status"])
        self.assertEqual(0, evidence["memory_consolidation"]["validated_facts"])
        self.assertEqual(1, evidence["memory_consolidation"]["invalid_batches"])
        self.assertTrue(evidence["consolidation_evidence"]["invalid_extraction_batches"][0]["extraction_response_retained"])

    def test_api_cannot_label_partial_memory_complete(self):
        response, ledger, records, public = self.fixtures(partial=True)
        public["memory_status"] = "complete"
        with self.assertRaisesRegex(RuntimeError, "disagree"):
            harness.collect_consolidation_evidence(response, ledger, records)

    def test_partial_requires_native_warning_and_accurate_counts(self):
        response, ledger, records, public = self.fixtures(partial=True)
        public["memory_warnings"] = []
        with self.assertRaisesRegex(RuntimeError, "warnings"):
            harness.collect_consolidation_evidence(response, ledger, records)
        public["memory_warnings"] = ["Partial"]
        ledger["final_state"]["memory_consolidation"]["validated_facts"] = 2
        with self.assertRaisesRegex(RuntimeError, "validated_facts"):
            harness.collect_consolidation_evidence(response, ledger, records)

    def test_reused_artifacts_and_therapist_are_isolated(self):
        harness.verify_reused_artifacts()
        self.assertEqual("memory_integration_fix_alex_20260928", harness.THERAPIST_ID)
        self.assertNotEqual(harness.BENCHMARK, harness.PREDECESSOR)
        for relative in ("integration/scenario.json", "integration/gold.json"):
            self.assertEqual((harness.BENCHMARK / relative).read_bytes(),
                             (harness.PREDECESSOR / relative).read_bytes())


if __name__ == "__main__":
    unittest.main()
