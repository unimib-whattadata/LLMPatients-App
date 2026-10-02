"""Read-only source-to-response audit of the archived s11t02 partial answer.

Uses Python's standard library only. Never imports a provider, native graph,
retriever, or credential file. Writes only into this separate audit directory.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUTPUTS = HERE.parents[1]
FIX = OUTPUTS / "memory-integration-fix-2026-09-28"
FINAL = FIX / "safety-recall-fix"
SNAPSHOT = FINAL / "snapshots/completed-20260928T203601Z"
MEMORY_NAME = "memory_integration_fix_alex_20260928__alex_carter_001.jsonl"


def read(path):
    return json.loads(path.read_text())


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    # Bind the audit to the already archived evidence, not a regenerated answer.
    snapshot = read(SNAPSHOT / "snapshot-manifest.json")
    for relative, expected in snapshot["copied_files"].items():
        assert sha(SNAPSHOT / relative) == expected, relative
        assert sha(FINAL / relative) == expected, relative
    paths = {
        "session": FINAL / "runtime/sessions/session_11/session.json",
        "generation_events": FINAL / "runtime/sessions/session_11/generation-events.jsonl",
        "native_records": FINAL / "runtime/sessions/session_11/openrouter-api-records.jsonl",
        "memory": FINAL / "runtime/memory" / MEMORY_NAME,
        "gold": FIX / "integration/gold.json",
        "score": FINAL / "probe-assessment.json",
        "versioning_code": FIX / "integration/source/agent/core/factual_memory.py",
    }
    session = read(paths["session"])
    turn = next(t for t in session["turns"] if t["turn_id"] == "s11t02")
    events = rows(paths["generation_events"])
    outcomes = [e for e in events if e.get("event") == "outcome"
                and e.get("turn_id") == "s11t02" and e.get("stage") == "generate_response"]
    assert len(outcomes) == 1 and outcomes[0]["accepted"]
    outcome = outcomes[0]
    native = [r for r in rows(paths["native_records"])
              if r["record_id"] == outcome["native_record_id"]]
    request, response = (next(r for r in native if r["event"] == kind)
                         for kind in ("request", "response"))
    assert len(native) == 2
    body = request["request"]
    assert len(body["messages"]) == 1 and body["messages"][0]["role"] == "user"
    prompt = body["messages"][0]["content"]
    assert prompt == turn["prompt"]
    choice = response["response"]["choices"][0]
    answer = choice["message"]["content"]
    assert answer == outcome["text"]
    assert not turn["safety_flags"] and turn["safe_user_input"] == turn["therapist_text"]
    memory = rows(paths["memory"])
    raw = {r["id"]: r for r in memory if r["type"] == "conversation_turn"}
    targets = []
    for target in ("17:45", "09:30"):
        evidence = [e for e in turn["retrieved_evidence"]
                    if target in json.dumps(e, ensure_ascii=False)]
        raw_sources = [r for r in raw.values()
                       if target in r["therapist_text"] and r["turn_index"] < turn["total_turns"]]
        prior_batches = [r for r in memory if r["type"] == "fact_batch"
                         and r["created_at"] < request["timestamp"]]
        stored_facts = [{"batch_id": b["id"], "batch_created_at": b["created_at"], "fact": f}
                        for b in prior_batches for f in b["facts"]
                        if target in json.dumps(f, ensure_ascii=False)]
        assert evidence and raw_sources and stored_facts and target in prompt
        assert target not in answer and target not in turn["patient_text"]
        for item in evidence:
            assert item["source_id"] in raw
            assert raw[item["source_id"]]["created_at"] < request["timestamp"]
            assert raw[item["source_id"]]["turn_index"] < turn["total_turns"]
        targets.append({
            "target": target, "introduced_before_probe": True,
            "raw_sources": [{k: r[k] for k in ("id", "session_id", "turn_index", "created_at", "therapist_text")}
                            for r in raw_sources],
            "stored_facts_before_request": stored_facts,
            "retrieved_evidence": evidence,
            "native_prompt_occurrences": prompt.count(target),
            "raw_response_occurrences": answer.count(target),
            "api_response_occurrences": turn["patient_text"].count(target),
            "present_in_narrative_summary": target in (turn.get("summary_in_state") or ""),
            "present_in_reflection": target in (turn.get("reflection_in_state") or ""),
        })
    time_facts = [e for e in turn["retrieved_evidence"]
                  if e.get("kind") == "fact" and e.get("attribute") == "time"]
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": "verified_against_archived_bytes", "live_requests": 0,
        "turn_id": "s11t02", "native_record_id": request["record_id"],
        "request_at": request["timestamp"], "response_at": response["timestamp"],
        "requested_model": body["model"], "served_model": response["response"]["model"],
        "served_backend": response["response"].get("provider"),
        "native_finish_reason": choice.get("native_finish_reason"),
        "finish_reason": choice["finish_reason"], "generation_settings": {k: v for k, v in body.items() if k != "messages"},
        "usage": response["response"]["usage"], "safety_flags": turn["safety_flags"],
        "state_prompt_equals_transmitted_prompt": True,
        "raw_patient_response": answer, "api_patient_response": turn["patient_text"],
        "targets": targets,
        "time_fact_metadata": [{k: e.get(k) for k in ("entity", "attribute", "value", "status", "current", "source_id")}
                               for e in time_facts],
        "conclusion": "Both exact times were persisted, retrieved and transmitted. The observed defect is omission in the generated answer, not demonstrated storage or retrieval loss. The original partial score remains unchanged.",
        "causal_limits": "The record does not identify why the model omitted the times. Brevity guidance and nonuniform entity labels are observed context, not established causes. No response was regenerated.",
        "versioning_observation": "The old and current agreed times have different entity labels and both carry current=true. current_facts groups by normalized entity, attribute, speaker and status; it does not establish cross-label semantic entity equivalence. Chronological source quotes remain available.",
        "snapshot_files_verified": len(snapshot["copied_files"]),
        "inputs": {name: {"path": str(p), "sha256": sha(p)} for name, p in paths.items()},
    }
    (HERE / "omission-evidence.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (HERE / "transmitted-prompt.txt").write_text(prompt)
    lines = ["# Verifica dei due orari omessi", "", "## Material Passport", "",
             "- Modalità: audit locale dei dati archiviati.",
             "- Verifica: corrispondenza dei byte, delle fonti precedenti e del prompt trasmesso.",
             "- Chiamate al modello: zero. Punteggio originale: invariato (parziale).", "",
             "## Risultato", "",
             "**17:45 e 09:30 erano presenti nella memoria e nel prompt effettivamente inviato a OpenRouter.** "
             "Mancano sia nella risposta grezza del modello sia in quella restituita dall'API.", "",
             "| Orario | Fonti precedenti | Memoria fattuale | Evidenza recuperata | Occorrenze nel prompt | Nella risposta |",
             "|---|---|---|---|---:|---|"]
    for item in targets:
        lines.append(f"| {item['target']} | presenti | presente | presente | {item['native_prompt_occurrences']} | assente |")
    lines += ["", "Il modello riporta correttamente Rina Holt e venerdì alle 18:20; distingue il mercoledì "
              "precedente dalla proposta del sabato. Omette i due orari esatti. È un'omissione nella risposta: "
              "questa traccia non mostra una perdita delle informazioni durante il salvataggio o il recupero.", "",
              "La risposta termina con `STOP`, con 100 token di testo e 813 token di ragionamento contabilizzati "
              "nel log, a fronte di un limite di 4096. Non risulta un'interruzione MAX_TOKENS. "
              "Il filtro non ha alterato questo turno. La modifica tipografica dell'API non riguarda gli orari.", "",
              "## Osservazione aggiuntiva sulle versioni", "",
              "Nel contesto, l'appuntamento vecchio e quello aggiornato sono entrambi marcati `current=true`, "
              "ma con nomi di entità diversi. Il codice calcola la versione corrente all'interno della stessa "
              "chiave entità/attributo/parlante/stato; non unifica automaticamente questi due nomi. "
              "La cronologia e le citazioni esatte consentono comunque di distinguere i valori. "
              "Non è dimostrato che questa marcatura abbia causato l'omissione.", "",
              "## Tracciabilità", "",
              f"- Record nativo: `{request['record_id']}`; richiesta `{request['timestamp']}`.",
              "- Evidenze, fonti, hash e impostazioni: `omission-evidence.json`.",
              "- Prompt realmente trasmesso: `transmitted-prompt.txt`.",
              "- Riproduzione dell'audit: `python3 audit_omissions.py` (nessuna rete).",
              f"- Verificati {len(snapshot['copied_files'])} file dello snapshot finale, senza modificarli.", ""]
    (HERE / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({"status": result["status"], "targets_in_transmitted_prompt": [r["target"] for r in targets],
                      "score_unchanged": "partial", "live_requests": 0,
                      "snapshot_files_verified": result["snapshot_files_verified"]}))


if __name__ == "__main__":
    main()
