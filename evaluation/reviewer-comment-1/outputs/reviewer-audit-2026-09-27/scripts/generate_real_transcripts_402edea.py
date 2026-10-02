#!/usr/bin/env python3
"""Generate real transcript sets for the LLMPatients mini-study.

The script produces transcript files from actual model runs:
- full_llmpatients: calls the running LLMPatients-Agent API.
- prompt_only_baseline: calls the same configured LLM with a simple narrative prompt,
  without structured state graph, persistent memory, RAG, or deterministic orchestration.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment check
    raise SystemExit("PyYAML is required. Run this with the LLMPatients-Agent virtualenv.") from exc


PAPER_ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = PAPER_ROOT / "evaluation"
TRANSCRIPTS_DIR = EVAL_DIR / "transcripts"
CONDITION_KEY = TRANSCRIPTS_DIR / "condition_key.csv"
THERAPIST_SCRIPTS = EVAL_DIR / "therapist_scripts.md"
MANIFEST_TEMPLATE = EVAL_DIR / "transcript_manifest_template.csv"
MANIFEST_OUTPUT = EVAL_DIR / "transcript_manifest.csv"

AGENT_ROOT = Path(os.environ.get("LLMPATIENTS_AGENT_ROOT", "/Users/marco/Sites/LLMPatients-Agent"))
PATIENTS_DIR = AGENT_ROOT / "data" / "patients"
DEFAULT_API_BASE = os.environ.get("LLMPATIENTS_AGENT_API", "http://127.0.0.1:8000")
BASELINE_REPLY_MIN_CHARS = 100
BASELINE_REPLY_MIN_TOKENS = 4096
BASELINE_REPLY_MAX_ATTEMPTS = 3
COMPLETE_REPLY_END_RE = re.compile(r"[.!?…][)'\"\]]*$")


@dataclass
class SessionScript:
    title: str
    messages: list[str]


@dataclass
class TranscriptRow:
    transcript_id: str
    patient_id: str
    true_condition: str
    run_id: str
    script_variant: str
    status: str
    source_export_path: str
    notes: str


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def parse_therapist_scripts(path: Path) -> dict[str, list[SessionScript]]:
    text = path.read_text(encoding="utf-8").splitlines()
    scripts: dict[str, list[SessionScript]] = {"appropriate": [], "seeded_misstep": []}
    current_variant: str | None = None
    current_session: SessionScript | None = None

    for line in text:
        if line.startswith("## Appropriate Variant"):
            current_variant = "appropriate"
            current_session = None
            continue
        if line.startswith("## Seeded Misstep Variant"):
            current_variant = "seeded_misstep"
            current_session = None
            continue
        session_match = re.match(r"^### Session \d+:\s*(.+)$", line)
        if session_match and current_variant:
            current_session = SessionScript(title=session_match.group(1).strip(), messages=[])
            scripts[current_variant].append(current_session)
            continue
        turn_match = re.match(r'^\d+\.\s+"(.*)"\s*$', line)
        if turn_match and current_session:
            current_session.messages.append(turn_match.group(1))

    for variant, sessions in scripts.items():
        if len(sessions) != 3 or any(len(session.messages) != 5 for session in sessions):
            raise ValueError(f"Expected 3 sessions x 5 turns for {variant}, found {sessions!r}")
    return scripts


def read_condition_key() -> list[TranscriptRow]:
    with CONDITION_KEY.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return [
            TranscriptRow(
                transcript_id=row["transcript_id"],
                patient_id=row["patient_id"],
                true_condition=row["true_condition"],
                run_id=row["run_id"],
                script_variant=row["script_variant"],
                status=row.get("status", ""),
                source_export_path=row.get("source_export_path", ""),
                notes=row.get("notes", ""),
            )
            for row in reader
        ]


def write_condition_key(rows: list[TranscriptRow]) -> None:
    with CONDITION_KEY.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            lineterminator="\n",
            fieldnames=[
                "transcript_id",
                "patient_id",
                "true_condition",
                "run_id",
                "script_variant",
                "status",
                "source_export_path",
                "notes",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


def load_manifest_codes() -> dict[str, str]:
    if not MANIFEST_TEMPLATE.exists():
        return {}
    with MANIFEST_TEMPLATE.open(newline="", encoding="utf-8") as f:
        return {row["transcript_id"]: row["condition_code"] for row in csv.DictReader(f)}


def write_manifest(rows: list[TranscriptRow], manifest_codes: dict[str, str], provider: str, model: str) -> None:
    with MANIFEST_OUTPUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            lineterminator="\n",
            fieldnames=[
                "transcript_id",
                "patient_id",
                "run_id",
                "condition_code",
                "script_variant",
                "session_count",
                "generated_at",
                "model_provider",
                "model_name",
                "notes",
            ],
        )
        writer.writeheader()
        for row in rows:
            generated_at = ""
            if row.status == "completed":
                match = re.search(r"generated_at=([^;]+)", row.notes or "")
                generated_at = match.group(1) if match else ""
            writer.writerow(
                {
                    "transcript_id": row.transcript_id,
                    "patient_id": row.patient_id,
                    "run_id": row.run_id,
                    "condition_code": manifest_codes.get(row.transcript_id, ""),
                    "script_variant": row.script_variant,
                    "session_count": 3,
                    "generated_at": generated_at,
                    "model_provider": provider,
                    "model_name": model,
                    "notes": "real model-generated transcript" if row.status == "completed" else row.notes,
                }
            )


def post_json(api_base: str, path: str, payload: dict[str, Any], timeout: int = 240) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{api_base.rstrip('/')}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{path} returned HTTP {exc.code}: {body}") from exc


def get_nested(data: dict[str, Any], *keys: str, default: Any = "") -> Any:
    current: Any = data
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return current if current is not None else default


def as_sentence_list(value: Any) -> str:
    if isinstance(value, list):
        return "; ".join(str(item) for item in value if item is not None)
    if isinstance(value, dict):
        items = []
        for key, item in value.items():
            if item:
                items.append(f"{key}: {item}")
        return "; ".join(items)
    return str(value or "")


def load_patient_case(patient_id: str) -> dict[str, Any]:
    path = PATIENTS_DIR / f"{patient_id}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Patient profile not found: {path}")
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def build_baseline_case_narrative(patient: dict[str, Any]) -> tuple[str, str]:
    profile = patient.get("profile", {})
    clinical = patient.get("clinical", {})
    details = clinical.get("details", {})
    name = profile.get("name") or get_nested(patient, "identifiers", "patientId", default="the patient")

    narrative_parts = [
        f"Name: {name}.",
        f"Age/gender: {profile.get('age', 'not specified')}, {profile.get('gender', 'not specified')}.",
        f"Brief description: {profile.get('smallDescription', '')}",
        f"Diagnosis/context: {profile.get('diagnosis', '')}",
        f"Psychological profile: {profile.get('psychologicalProfile', '')}",
        f"Clinical case narrative: {clinical.get('clinicalCase', '')}",
        f"Current medications: {as_sentence_list(clinical.get('currentMedications')) or 'None reported'}",
        f"Therapy goals: {as_sentence_list(get_nested(patient, 'therapy', 'objectives', default=[]))}",
        f"Family/development: {as_sentence_list(details.get('familyHistory'))}",
        f"Education/employment/housing: {as_sentence_list(details.get('educationAndEmployment'))}",
        f"Social relationships: {as_sentence_list(details.get('socialRelationshipsAndInteractions'))}",
        f"Prior treatments: {as_sentence_list(details.get('treatmentsAndInterventions'))}",
        f"Session behavior and interpersonal style: {as_sentence_list(details.get('behaviorDuringTestAdministration'))}",
    ]
    narrative = "\n".join(part for part in narrative_parts if part.strip() and not part.endswith(": "))
    return name, narrative


def clean_patient_reply(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^\s*(Patient|Therapist|Assistant)\s*:\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.split("\nTherapist:")[0].strip()
    cleaned = cleaned.split("\nPatient:")[0].strip()
    return cleaned or "[NO RESPONSE]"


def env_positive_int(name: str, default: int) -> int:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    try:
        parsed = int(raw_value)
        if parsed <= 0:
            raise ValueError
        return parsed
    except ValueError:
        return default


def baseline_reply_token_budget(llm: Any) -> int:
    configured = getattr(llm, "max_tokens", None)
    if isinstance(configured, int) and configured > 0:
        default = configured
    else:
        default = env_positive_int("max_tokens", BASELINE_REPLY_MIN_TOKENS)
    requested = env_positive_int("BASELINE_REPLY_MAX_TOKENS", default)
    return max(requested, BASELINE_REPLY_MIN_TOKENS)


def patient_reply_integrity_issues(reply: str, *, min_chars: int = BASELINE_REPLY_MIN_CHARS) -> list[str]:
    issues = []
    stripped = (reply or "").strip()
    if stripped in {"", "[NO RESPONSE]"}:
        issues.append("empty response")
        return issues
    if len(stripped) < min_chars:
        issues.append(f"short response ({len(stripped)} chars)")
    if not COMPLETE_REPLY_END_RE.search(stripped):
        issues.append("response does not end as a complete sentence")
    return issues


def baseline_turn(
    *,
    llm: Any,
    patient_name: str,
    case_narrative: str,
    session_title: str,
    session_history: list[tuple[str, str]],
    therapist_message: str,
) -> str:
    prior = "\n".join(
        f"Therapist: {therapist}\nPatient: {patient}"
        for therapist, patient in session_history
    ) or "[No earlier turns in this session.]"
    prompt = f"""You are role-playing as a virtual patient for psychotherapy training.

Use only the following case narrative. Do not use a structured patient hierarchy, long-term memory,
external tools, retrieval, safety orchestration, or hidden state. You only know the case narrative
and the turns already shown in this same session.

Case narrative:
{case_narrative}

Current session: {session_title}
Prior turns in this same session:
{prior}

Therapist: {therapist_message}

Respond as {patient_name} in first person. Keep the reply clinically plausible for psychotherapy
training, 2-5 sentences, and do not mention being an AI, a simulation, or a language model.
Patient:"""
    token_budget = baseline_reply_token_budget(llm)
    last_reply = ""
    last_issues: list[str] = []

    for attempt in range(1, BASELINE_REPLY_MAX_ATTEMPTS + 1):
        attempt_prompt = prompt
        if attempt > 1:
            attempt_prompt = prompt.replace(
                "\nPatient:",
                "\nImportant: the previous response was incomplete or too short. "
                "Regenerate the full patient reply from scratch as 2-5 complete "
                "first-person sentences, ending with a complete sentence.\nPatient:",
            )
        attempt_budget = token_budget * attempt
        raw_reply = llm.generate(attempt_prompt, temperature=0.7, max_tokens=attempt_budget)
        last_reply = clean_patient_reply(raw_reply)
        last_issues = patient_reply_integrity_issues(last_reply)
        if not last_issues:
            return last_reply

    raise ValueError(
        "Baseline generation produced an incomplete patient reply after "
        f"{BASELINE_REPLY_MAX_ATTEMPTS} attempts: {', '.join(last_issues)}. "
        f"Last reply: {last_reply!r}"
    )


def generate_full_transcript(
    *,
    row: TranscriptRow,
    scripts: list[SessionScript],
    api_base: str,
    generated_at: str,
) -> list[dict[str, Any]]:
    therapist_id = f"eval_{row.transcript_id}_{int(time.time())}"
    sessions = []

    for session_index, session in enumerate(scripts, start=1):
        session_id = f"{row.transcript_id}_S{session_index}_{int(time.time())}"
        turns = []
        for step_id, therapist_message in enumerate(session.messages, start=1):
            response = post_json(
                api_base,
                "/chat-response",
                {
                    "external_patient_id": row.patient_id,
                    "user_message": therapist_message,
                    "session_id": session_id,
                    "step_id": step_id,
                    "therapist_id": therapist_id,
                },
            )
            turns.append(
                {
                    "therapist": therapist_message,
                    "patient": clean_patient_reply(response.get("message", "")),
                    "emotion": response.get("emotion", ""),
                    "topic": response.get("topic", ""),
                    "reasoning_time": response.get("reasoning_time", ""),
                }
            )
        post_json(
            api_base,
            "/session-end",
            {
                "external_patient_id": row.patient_id,
                "session_id": session_id,
                "therapist_id": therapist_id,
            },
            timeout=360,
        )
        sessions.append(
            {
                "index": session_index,
                "title": session.title,
                "session_id": session_id,
                "turns": turns,
            }
        )

    return sessions


def generate_baseline_transcript(
    *,
    row: TranscriptRow,
    scripts: list[SessionScript],
    llm: Any,
) -> list[dict[str, Any]]:
    patient = load_patient_case(row.patient_id)
    patient_name, case_narrative = build_baseline_case_narrative(patient)
    sessions = []

    for session_index, session in enumerate(scripts, start=1):
        session_history: list[tuple[str, str]] = []
        turns = []
        for therapist_message in session.messages:
            patient_reply = baseline_turn(
                llm=llm,
                patient_name=patient_name,
                case_narrative=case_narrative,
                session_title=session.title,
                session_history=session_history,
                therapist_message=therapist_message,
            )
            session_history.append((therapist_message, patient_reply))
            turns.append(
                {
                    "therapist": therapist_message,
                    "patient": patient_reply,
                    "emotion": "",
                    "topic": "",
                    "reasoning_time": "",
                }
            )
        sessions.append(
            {
                "index": session_index,
                "title": session.title,
                "session_id": f"{row.transcript_id}_S{session_index}",
                "turns": turns,
            }
        )
    return sessions


def render_transcript(
    *,
    row: TranscriptRow,
    sessions: list[dict[str, Any]],
    generated_at: str,
    provider: str,
    model: str,
    condition_code: str,
) -> str:
    lines = [
        f"# {row.transcript_id}",
        "",
        f"Transcript ID: {row.transcript_id}",
        f"Patient: {row.patient_id}",
        f"Condition code: {condition_code or '[not assigned]'}",
        f"Script variant: {row.script_variant}",
        "Session count: 3",
        f"Generated at: {generated_at}",
        f"Model provider: {provider}",
        f"Model name: {model}",
        "Generation note: patient turns were generated by the assigned system and were not manually rewritten.",
        "",
    ]

    for session in sessions:
        lines.extend([f"## Session {session['index']}: {session['title']}", ""])
        for turn_index, turn in enumerate(session["turns"], start=1):
            lines.append(f"**Therapist {turn_index}:** {turn['therapist']}")
            lines.append("")
            lines.append(f"**Patient {turn_index}:** {turn['patient']}")
            metadata = []
            if turn.get("emotion"):
                metadata.append(f"emotion={turn['emotion']}")
            if turn.get("topic"):
                metadata.append(f"topic={turn['topic']}")
            if turn.get("reasoning_time") != "":
                metadata.append(f"reasoning_time={turn['reasoning_time']}")
            if metadata:
                lines.append("")
                lines.append(f"_System metadata: {'; '.join(metadata)}_")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def load_agent_llm() -> tuple[Any, str, str]:
    sys.path.insert(0, str(AGENT_ROOT))
    from agent.core.llm_runner import create_llm_runner  # type: ignore

    provider = os.getenv("model_provider", "local")
    model = os.getenv("model_id", "")
    llm = create_llm_runner()
    provider = os.getenv("model_provider", provider)
    model = os.getenv("model_id", model)
    return llm, provider, model


def mark_row(
    rows: list[TranscriptRow],
    transcript_id: str,
    *,
    status: str,
    source_export_path: str,
    notes: str,
) -> None:
    for row in rows:
        if row.transcript_id == transcript_id:
            row.status = status
            row.source_export_path = source_export_path
            row.notes = notes
            return


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate LLMPatients evaluation transcripts.")
    parser.add_argument("--api-base", default=DEFAULT_API_BASE)
    parser.add_argument("--only", nargs="*", default=None, help="Optional transcript IDs to generate.")
    parser.add_argument("--force", action="store_true", help="Regenerate completed transcripts.")
    parser.add_argument("--limit", type=int, default=None, help="Generate at most N transcripts.")
    args = parser.parse_args()

    TRANSCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    scripts_by_variant = parse_therapist_scripts(THERAPIST_SCRIPTS)
    rows = read_condition_key()
    manifest_codes = load_manifest_codes()
    llm, provider, model = load_agent_llm()
    write_manifest(rows, manifest_codes, provider, model)

    selected = []
    requested = set(args.only or [])
    for row in rows:
        if requested and row.transcript_id not in requested:
            continue
        if row.status == "completed" and not args.force:
            continue
        selected.append(row)
    if args.limit is not None:
        selected = selected[: args.limit]

    print(f"Generating {len(selected)} transcript(s). Provider={provider}; model={model}")

    for index, row in enumerate(selected, start=1):
        generated_at = utc_now()
        output_path = TRANSCRIPTS_DIR / f"{row.transcript_id}.md"
        print(
            f"[{index}/{len(selected)}] {row.transcript_id}: "
            f"{row.patient_id} / {row.true_condition} / {row.script_variant}",
            flush=True,
        )
        try:
            scripts = scripts_by_variant[row.script_variant]
            if row.true_condition == "full_llmpatients":
                sessions = generate_full_transcript(
                    row=row,
                    scripts=scripts,
                    api_base=args.api_base,
                    generated_at=generated_at,
                )
            elif row.true_condition == "prompt_only_baseline":
                sessions = generate_baseline_transcript(row=row, scripts=scripts, llm=llm)
            else:
                raise ValueError(f"Unknown condition: {row.true_condition}")

            output_path.write_text(
                render_transcript(
                    row=row,
                    sessions=sessions,
                    generated_at=generated_at,
                    provider=provider,
                    model=model,
                    condition_code=manifest_codes.get(row.transcript_id, ""),
                ),
                encoding="utf-8",
            )
            mark_row(
                rows,
                row.transcript_id,
                status="completed",
                source_export_path=str(output_path.relative_to(PAPER_ROOT)),
                notes=f"generated_at={generated_at}; generator=evaluation/generate_real_transcripts.py",
            )
            write_condition_key(rows)
            write_manifest(rows, manifest_codes, provider, model)
        except Exception as exc:
            mark_row(
                rows,
                row.transcript_id,
                status="failed",
                source_export_path=str(output_path.relative_to(PAPER_ROOT)),
                notes=f"failed_at={utc_now()}; error={exc}",
            )
            write_condition_key(rows)
            write_manifest(rows, manifest_codes, provider, model)
            print(f"ERROR {row.transcript_id}: {exc}", file=sys.stderr, flush=True)
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
