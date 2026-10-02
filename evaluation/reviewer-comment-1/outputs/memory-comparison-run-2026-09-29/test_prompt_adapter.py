"""Offline checks for common-case parity and native memory rendering limits.

No providers, model factory, graph executor or benchmark gold is imported. The
frozen prompt_builder is loaded with its normal pure rendering dependencies.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path
import socket
from types import SimpleNamespace
import unittest
from unittest.mock import patch


def forbidden_network(*args, **kwargs):
    raise AssertionError("Prompt-adapter tests forbid network access")


# Block connections before importing the native rendering dependencies.
socket.socket.connect = forbidden_network
socket.socket.connect_ex = forbidden_network
socket.create_connection = forbidden_network

from prompt_adapter import PROMPT_BUDGETS, make_structured_prompt, native
from prompt_contract import COMMON_INSTRUCTIONS, render_flat_history, render_prompt


HERE = Path(__file__).resolve().parent
PLAN = HERE.parent / "memory-comparison-plan-2026-09-28"
CASE = 'The recorded value for profile.name is "Morgan Vale".\nThe recorded value for clinical.unspecified is null.\n'
QUESTION = "Which appointment is current, and which was only proposed?"


class UnreadableProfile:
    def __getattribute__(self, name):
        raise AssertionError(f"The common-case adapter must not inspect native profile field {name}")


def state(**updates):
    values = dict(
        patient_profile=UnreadableProfile(), summary="", session_reflection="", history=[],
        evidence_context=[], episodic_context=[], intent_topic={}, last_topic={},
        emotion_state={}, emotion_intensity=0.6, emotion_event="neutral", classified_emotion=None,
        safety_flags=[], user_input=QUESTION, safe_user_input=QUESTION,
    )
    values.update(updates)
    return SimpleNamespace(**values)


def context_of(prompt):
    return prompt.split("<ARM_CONTEXT>\n", 1)[1].split("</ARM_CONTEXT>", 1)[0]


def fact(source, turn, value, *, current=True, status="agreed"):
    return {"kind": "fact", "id": f"fact-{source}", "source_id": source,
            "session_id": f"fixture-session-{turn}", "turn_index": turn, "speaker": "therapist",
            "entity": "practice appointment", "attribute": "time", "value": value,
            "quote": f"My recorded appointment is {value} (explicit source).", "status": status,
            "current": current}


class PromptAdapterTests(unittest.TestCase):
    def test_all_five_common_cases_and_instructions_are_byte_identical_to_flat(self):
        cases = sorted((PLAN / "design/profiles").glob("*/case-narrative.txt"))
        self.assertEqual(5, len(cases))
        for path in cases:
            with self.subTest(profile=path.parent.name):
                case = path.read_text(encoding="utf-8")
                structured = make_structured_prompt(case)(state())["prompt"]
                flat = render_prompt(case_block=case, latest_question=QUESTION,
                                     arm_context=render_flat_history([], run_id="OFFLINE", expected_prior_turns=0))
                for prompt in (structured, flat):
                    self.assertTrue(prompt.startswith(COMMON_INSTRUCTIONS + "\n<CASE>\n"))
                    self.assertEqual(1, prompt.count(case))
                    self.assertEqual(case.encode(), prompt.split("<CASE>\n", 1)[1].split("</CASE>", 1)[0].encode())
                    self.assertEqual(1, prompt.count(QUESTION))
                self.assertEqual(structured.split("<ARM_CONTEXT>\n", 1)[0], flat.split("<ARM_CONTEXT>\n", 1)[0])
                self.assertEqual(structured.split("</ARM_CONTEXT>", 1)[1], flat.split("</ARM_CONTEXT>", 1)[1])

    def test_native_profile_old_instructions_and_gold_are_not_exposed_or_loaded(self):
        source = state(gold={"expected": "FORBIDDEN_GOLD_SENTINEL"},
                       long_term_context=["UNSELECTED_LEGACY_MEMORY_SENTINEL"],
                       intent_topic={"top": "medicalAndPhysicalHistory", "sub": "fixture"})
        with patch("builtins.open", side_effect=AssertionError("Renderer must not open files")), \
             patch.object(Path, "read_text", side_effect=AssertionError("Renderer must not read a gold file")):
            prompt = make_structured_prompt(CASE)(source)["prompt"]
        for unexpected in ("FORBIDDEN_GOLD_SENTINEL", "UNSELECTED_LEGACY_MEMORY_SENTINEL",
                           "🧍 Identity", "Stable Identity Facts", "Cognitive Style",
                           "Observed Interaction Style", "Safety & Character Guardrails",
                           "You are impersonating", "A non-answer is never acceptable", "📂"):
            self.assertNotIn(unexpected, prompt)
        self.assertIn("Dynamic state metadata (not additional patient-profile facts)", prompt)
        self.assertEqual(1, prompt.count(CASE))

    def test_history_keeps_complete_recent_pairs_in_chronological_order_with_native_budget(self):
        history = [{"therapist": f"T{n:02d} " + "ordinary " * 90,
                    "patient": f"P{n:02d} reply (keep the aside)"} for n in range(12)]
        prompt = make_structured_prompt(CASE)(state(history=history))["prompt"]
        context = context_of(prompt)
        block = context.split("Recent conversation:\n", 1)[1].split("\n---\nDynamic state metadata", 1)[0].strip()
        kept = [n for n in range(12) if f"T{n:02d} " in block]
        self.assertGreater(len(kept), 3, "The adapter introduced a last-three-turn window")
        self.assertLess(len(kept), 12, "The history budget was not applied")
        self.assertEqual(list(range(kept[0], 12)), kept)
        rendered = [f"👩‍⚕️ Therapist: {history[n]['therapist']}\n🧍 Patient: {history[n]['patient']}" for n in kept]
        self.assertEqual("\n".join(rendered), block)
        self.assertLessEqual(sum(native.estimated_tokens(text) for text in rendered), 1800)
        first_dropped = history[kept[0] - 1]
        extra = f"👩‍⚕️ Therapist: {first_dropped['therapist']}\n🧍 Patient: {first_dropped['patient']}"
        self.assertGreater(sum(native.estimated_tokens(text) for text in rendered) + native.estimated_tokens(extra), 1800)
        self.assertEqual(history[-1]["patient"], "P11 reply (keep the aside)")

    def test_summary_and_reflection_retain_native_compression_and_ellipsis_semantics(self):
        summary = "First source sentence. Second source sentence. " + ("Middle details are long. " * 90) + "Penultimate source sentence. Last source sentence."
        reflection = "Reflection (keep parentheses) " + "detail " * 140
        prompt = make_structured_prompt(CASE)(state(summary=summary, session_reflection=reflection))["prompt"]
        context = context_of(prompt)
        rendered_summary = context.split("Summary of previous sessions:\n", 1)[1].split("\n\nLast session reflection:", 1)[0]
        rendered_reflection = context.split("Last session reflection:\n", 1)[1].split("\n\n---\nDynamic state metadata", 1)[0]
        self.assertEqual(native._compress_text(summary, 900, 1200), rendered_summary)
        self.assertEqual(native._truncate_text(reflection, 600), rendered_reflection)
        self.assertIn("First source sentence", rendered_summary)
        self.assertIn("Last source sentence", rendered_summary)
        self.assertNotIn("Middle details are long", rendered_summary)
        self.assertLessEqual(len(rendered_summary), 903)
        self.assertLessEqual(len(rendered_reflection), 603)
        self.assertIn("(keep parentheses)", rendered_reflection)
        self.assertEqual(1200, PROMPT_BUDGETS["summary_compression_threshold"])

    def test_evidence_keeps_whole_quotes_source_order_and_current_proposal_status(self):
        records = [fact("source-earlier", 2, "Monday at 08:15", current=False),
                   fact("source-current", 31, "Tuesday at 10:40"),
                   fact("source-proposed", 32, "Thursday at 07:10", status="proposed")]
        oversized = {"kind": "raw", "source_id": "oversized", "session_id": "fixture",
                     "turn_index": 33, "speaker": "patient", "quote": "TOO_LONG_SENTINEL " + "x" * 6000}
        unchanged = copy.deepcopy(records + [oversized])
        prompt = make_structured_prompt(CASE)(state(evidence_context=records + [oversized]))["prompt"]
        context = context_of(prompt)
        rendered = native.render_evidence(records, 1800)
        self.assertIn(rendered, context)
        evidence_block = context.split("Source-grounded conversation memory:\n", 1)[1].split("\n\n---\nDynamic state metadata", 1)[0]
        self.assertEqual(rendered, evidence_block, "Evidence context must contain data only; instructions are common to both arms")
        for duplicated_instruction in ("The following are attributed records", "For current arrangements prefer",
                                       "A proposal is not agreement or completion", "Patient reports do not override",
                                       "Narrative summaries may omit details", "If a requested fact is unsupported"):
            self.assertNotIn(duplicated_instruction, context)
        self.assertNotIn("TOO_LONG_SENTINEL", context)
        self.assertLess(context.index("source-earlier"), context.index("source-current"))
        self.assertLess(context.index("source-current"), context.index("source-proposed"))
        self.assertIn("agreed; superseded", context)
        self.assertIn("proposed; current", context)
        for record in records:
            self.assertIn(json.dumps(record["quote"]), context)
        self.assertLessEqual(sum(native.estimated_tokens(native.render_evidence([row], 1800)) for row in records), 1800)
        self.assertEqual(unchanged, records + [oversized])

    def test_episode_budget_skips_oversized_entries_without_splitting_or_reordering(self):
        episodes = ["EXCESS_EPISODE " + "x" * 2200] + [(f"Episode {n} (whole): " + "detail " * 85).rstrip() for n in range(4)]
        prompt = make_structured_prompt(CASE)(state(episodic_context=episodes))["prompt"]
        block = context_of(prompt).split("Relevant episodic memories:\n", 1)[1].split("\n\n---\nDynamic state metadata", 1)[0]
        selected = [episode for episode in episodes if "- " + episode in block]
        self.assertEqual(episodes[1:4], selected)
        self.assertEqual("\n".join("- " + item for item in selected), block)
        self.assertLessEqual(sum(native.estimated_tokens(item) for item in selected), 700)
        self.assertNotIn("EXCESS_EPISODE", block)
        self.assertNotIn("Episode 3", block)

    def test_sanitized_question_is_used_once_and_state_is_only_metadata(self):
        source = state(user_input="UNSAFE_ORIGINAL_SENTINEL", safe_user_input="Safe replacement question?",
                       safety_flags=["role_swap"], intent_topic={"top": "communication", "sub": "pause"},
                       last_topic={"top": "planning", "sub": "time"}, emotion_state={"CARE": .8, "FEAR": .2},
                       emotion_intensity=.8, emotion_event="empathy", classified_emotion="CARE")
        prompt = make_structured_prompt(CASE)(source)["prompt"]
        self.assertNotIn("UNSAFE_ORIGINAL_SENTINEL", prompt)
        self.assertEqual(1, prompt.count("Safe replacement question?"))
        self.assertIn("Input safety flags: role_swap", context_of(prompt))
        self.assertIn("Current topic: communication → pause", context_of(prompt))
        self.assertIn("Affect intensity: 0.80", context_of(prompt))
        self.assertIn("Care", context_of(prompt))

    def test_case_bytes_must_be_supplied_without_silent_newline_repair(self):
        for invalid in ("", "\n", "case without final newline", None):
            with self.subTest(invalid=invalid), self.assertRaises((TypeError, ValueError)):
                make_structured_prompt(invalid)


if __name__ == "__main__":
    unittest.main()
