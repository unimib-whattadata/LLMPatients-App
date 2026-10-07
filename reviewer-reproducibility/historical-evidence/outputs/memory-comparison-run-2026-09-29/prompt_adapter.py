"""Experimental common-case adapter for the structured comparison arm.

Install the callable returned by make_structured_prompt as the native graph's
build_prompt node before compiling that graph. This module performs no model
calls, profile rendering, file reads, or gold loading. The complete common case
replaces the native identity, cognitive-style and topic-specific case sections.

Memory selection and local size estimates retain the frozen prompt_builder's
semantics. Budgets apply to the memory payloads, not section headings; native
character truncation may append a three-character ellipsis after the cutoff.
"""
from __future__ import annotations

from agent.core import prompt_builder as native
from prompt_contract import render_prompt


PROMPT_BUDGETS = {
    "evidence_estimated_tokens": native.EVIDENCE_TOKEN_BUDGET,
    "episodic_estimated_tokens": native.NARRATIVE_MEMORY_TOKEN_BUDGET,
    "recent_history_estimated_tokens": native.RECENT_HISTORY_TOKEN_BUDGET,
    "summary_max_chars": native.SUMMARY_MAX_CHARS,
    "summary_compression_threshold": native.SUMMARY_COMPRESSION_THRESHOLD,
    "reflection_max_chars": native.REFLECTION_MAX_CHARS,
}


def _memory_context(state) -> str:
    """Use the native memory components without an additional patient profile."""
    text = ""
    summary = getattr(state, "summary", "")
    if summary:
        summary = native._compress_text(
            summary.strip(), native.SUMMARY_MAX_CHARS, native.SUMMARY_COMPRESSION_THRESHOLD,
        )
        text += f"\nSummary of previous sessions:\n{summary}\n"

    reflection = getattr(state, "session_reflection", "")
    if reflection:
        reflection = native._truncate_text(reflection.strip(), native.REFLECTION_MAX_CHARS)
        text += f"\nLast session reflection:\n{reflection}\n"

    history = getattr(state, "history", [])
    if history:
        recent, used = [], 0
        for entry in reversed(history):
            turn = f"👩‍⚕️ Therapist: {entry['therapist']}\n🧍 Patient: {entry['patient']}"
            cost = native.estimated_tokens(turn)
            if used + cost > native.RECENT_HISTORY_TOKEN_BUDGET:
                break
            recent.append(turn)
            used += cost
        text += "\nRecent conversation:\n" + "\n".join(reversed(recent)) + "\n"

    evidence = native.render_evidence(
        getattr(state, "evidence_context", []) or [], native.EVIDENCE_TOKEN_BUDGET,
    )
    if evidence:
        # Source labels and quotations are data. The interpretive instructions
        # live exclusively in the identical COMMON_INSTRUCTIONS of both arms.
        text += "\nSource-grounded conversation memory:\n" + evidence + "\n"

    episodes = getattr(state, "episodic_context", [])
    if episodes:
        selected, used = [], 0
        for memory in episodes:
            if not memory:
                continue
            clean = memory.strip()
            cost = native.estimated_tokens(clean)
            if used + cost > native.NARRATIVE_MEMORY_TOKEN_BUDGET:
                continue
            selected.append(f"- {clean}")
            used += cost
        text += "\nRelevant episodic memories:\n" + "\n".join(selected) + "\n"
    return text


def _state_metadata(state) -> str:
    """Only allowlisted turn-level fields; never read state.patient_profile."""
    topic = getattr(state, "intent_topic", None) or {}
    previous = getattr(state, "last_topic", None) or {}
    bands = native._select_emotion_bands(getattr(state, "emotion_state", None) or {})
    classified = getattr(state, "classified_emotion", None)
    detected = (native.EMOTION_LABELS.get(classified.strip().upper(), classified)
                if classified else "unknown")
    intensity = getattr(state, "emotion_intensity", None)
    intensity = max(0.0, min(1.0, 0.6 if intensity is None else intensity))
    if intensity >= 0.7:
        description = "high tension, emotions close to the surface"
    elif intensity <= 0.3:
        description = "muted and contained affect"
    else:
        description = "steady but noticeable emotional pull"
    lines = [
        "---", "Dynamic state metadata (not additional patient-profile facts)",
        f"Last discussed topic: {previous.get('top', 'unknown')} → {previous.get('sub', 'unknown')}",
        f"Current topic: {topic.get('top', 'unknown')} → {topic.get('sub', 'unknown')}",
        f"Prior emotional tone (last turn): {detected}",
        f"Affect intensity: {intensity:.2f} ({description})",
        f"Therapist-triggered context event: {getattr(state, 'emotion_event', 'neutral')}",
    ]
    if bands:
        lines.append("Dominant affect systems:")
        for label, value in bands:
            display = native.EMOTION_LABELS.get(label, label.title())
            hint = native.EMOTION_SYSTEM_HINTS.get(label, "colors tone and reactions")
            lines.append(f"- {display} ({value:.2f}): {hint}")
    else:
        lines.append("Dominant affect systems: Seeking (baseline)")
    flags = getattr(state, "safety_flags", None) or []
    if flags:
        lines.append("Input safety flags: " + ", ".join(flags))
    return "\n".join(lines) + "\n"


def make_structured_prompt(case_block: str):
    """Return a native-compatible build_prompt(state) -> {'prompt': str} node.

    case_block is passed unchanged to the same render_prompt used by the flat
    arm. It must be the verified case-narrative.txt contents, including its final
    newline. The adapter never infers a case from the native profile or a gold.
    """
    if not isinstance(case_block, str):
        raise TypeError("case_block must be a string")
    if not case_block.strip() or not case_block.endswith("\n"):
        raise ValueError("case_block must be nonempty and end with a newline")

    def build_prompt(state):
        question = getattr(state, "safe_user_input", None) or getattr(state, "user_input", None) or ""
        context = _memory_context(state) + "\n" + _state_metadata(state)
        return {"prompt": render_prompt(case_block=case_block, arm_context=context, latest_question=question)}

    return build_prompt
