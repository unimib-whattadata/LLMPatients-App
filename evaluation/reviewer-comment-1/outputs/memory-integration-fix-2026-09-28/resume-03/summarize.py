"""Offline accounting of this continuation, including the copied prefix once."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from observe import rows

HERE = Path(__file__).resolve().parent
RUNTIME = HERE / "runtime"


def read(path):
    return json.loads(path.read_text())


def main():
    launch_at = read(HERE / "launch.json")["started_at"]
    sessions = [read(p) for p in sorted(RUNTIME.glob("sessions/session_*/session.json"))]
    native = [r for p in sorted(RUNTIME.glob("sessions/session_*/openrouter-api-records.jsonl")) for r in rows(p)]
    events = [r for p in sorted(RUNTIME.glob("sessions/session_*/generation-events.jsonl")) for r in rows(p)]
    requests = [r for r in native if r["event"] == "request"]
    if len({r["record_id"] for r in requests}) != len(requests):
        raise RuntimeError("Duplicate native requests would double count the copied prefix")
    outcomes = [r for r in native if r["event"] != "request"]
    if len({r["record_id"] for r in outcomes}) != len(outcomes):
        raise RuntimeError("Duplicate native outcomes")
    errors = [r for r in outcomes if r["event"] != "response"]
    new_errors = [r for r in errors if r["timestamp"] > launch_at]
    first_new_error = min((r["timestamp"] for r in new_errors), default=None)
    new_fatals = [r for r in events if r["event"] == "fatal" and r["timestamp"] > launch_at]
    first_fatal = min((r["timestamp"] for r in new_fatals), default=None)
    invalid_outcomes = [r for r in events if r["event"] == "outcome"
                        and r["timestamp"] > launch_at and not r.get("accepted")]
    invalid_ids = {r["native_record_id"] for r in invalid_outcomes}
    by_stage = {r["native_record_id"]: r.get("stage") for r in events if r.get("native_record_id")}
    costs = defaultdict(lambda: {"responses": 0, "input_tokens": 0, "output_tokens": 0,
                                "reported_response_usd": 0., "missing_response_cost": 0})
    for r in outcomes:
        if r["event"] != "response":
            continue
        usage = r.get("response", {}).get("usage", {})
        bucket = costs[by_stage.get(r["record_id"], "unknown")]
        bucket["responses"] += 1
        bucket["input_tokens"] += usage.get("prompt_tokens", 0)
        bucket["output_tokens"] += usage.get("completion_tokens", 0)
        if usage.get("cost") is None:
            bucket["missing_response_cost"] += 1
        else:
            bucket["reported_response_usd"] += usage["cost"]
    review = read(RUNTIME / "probe-review.json")
    observed = [p for p in review["probes"] if p["response"] is not None]
    assessment = read(HERE / "probe-assessment.json") if (HERE / "probe-assessment.json").exists() else {"judgments": []}
    judgments = assessment["judgments"]
    if judgments:
        assert {j["turn_id"] for j in judgments} == {p["turn_id"] for p in observed}
        assert len({j["turn_id"] for j in judgments}) == len(judgments)
    completed = [s for s in sessions if s["status"] == "completed"]
    stopped = [s for s in sessions if s["status"] == "stopped"]
    changed_turns = [t for s in sessions for t in s["turns"]
                     if t.get("safe_user_input") != t["therapist_text"] or t.get("safety_flags")]
    application_failure = read(HERE / "application-failure.json") if (HERE / "application-failure.json").exists() else None
    last_stop = stopped[-1].get("finished_at") if stopped else None
    status = "completed" if len(completed) == 11 else "stopped" if stopped or (RUNTIME / "STOP").exists() else "running"
    result = {"generated_at": datetime.now(timezone.utc).isoformat(), "status": status,
        "completed_sessions": len(completed), "planned_sessions": 11,
        "accepted_turns": sum(len(s["turns"]) for s in sessions), "planned_turns": 55,
        "sanitized_turn_ids": [t["turn_id"] for t in changed_turns],
        "application_failure": application_failure,
        "requests_after_final_stop": sum(r["timestamp"] > last_stop for r in requests) if last_stop else 0,
        "observed_probes": len(observed), "planned_probes": 6, "assessed_probes": len(judgments),
        "probe_results": dict(Counter(j["result"] for j in judgments)),
        "consolidation_status": dict(Counter(s["memory_status"] for s in completed)),
        "native_counts_cumulative": dict(Counter(r["event"] for r in native)),
        "native_counts_this_attempt": dict(Counter(r["event"] for r in native if r["timestamp"] > launch_at)),
        "costs_by_stage": dict(costs),
        "reported_response_usd": sum(c["reported_response_usd"] for c in costs.values()),
        "reported_error_usd": sum((r.get("response", {}).get("usage") or {}).get("cost") or 0 for r in errors),
        "reported_invalid_response_usd": sum((r.get("response", {}).get("usage") or {}).get("cost") or 0
                                             for r in outcomes if r["record_id"] in invalid_ids),
        "errors_with_missing_cost": sum((r.get("response", {}).get("usage") or {}).get("cost") is None for r in errors),
        "requests_after_first_new_provider_error": sum(r["timestamp"] > first_new_error for r in requests) if first_new_error else 0,
        "requests_after_first_new_fatal": sum(r["timestamp"] > first_fatal for r in requests) if first_fatal else 0,
        "new_fatals": new_fatals,
        "new_invalid_outcomes": [{k: r.get(k) for k in ("native_record_id", "stage", "turn_id", "timestamp", "finish_reasons", "accepted")}
                                 for r in invalid_outcomes],
        "validated_fact_entries": sum(s["memory_consolidation"]["validated_facts"] for s in completed),
        "rejected_fact_entries": sum(s["memory_consolidation"]["rejected_facts"] for s in completed),
        "attempt_started_at": launch_at,
        "sessions": [{"index": s["session_index"], "status": s["status"], "turns": len(s["turns"]),
                      "memory_status": s.get("memory_status"), "consolidation": s.get("memory_consolidation"),
                      "restored_total_turns": s.get("restored_before_resume", s.get("restored_before_first_request", {})).get("total_turns"),
                      "error": s.get("error")} for s in sessions],
        "new_error_records": [{k: r.get(k) for k in ("record_id", "timestamp", "event", "http_status", "error")} for r in new_errors],
        "native_journals": [{"path": str(p.relative_to(HERE)), "bytes": p.stat().st_size,
                             "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                            for p in sorted(RUNTIME.glob("sessions/session_*/openrouter-api-records.jsonl"))]}
    (HERE / "results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    lines = ["# Continuità nelle undici sessioni: ripresa del test corretto", "",
        f"Stato: **{status}**. Sessioni finalizzate: **{len(completed)}/11**. Scambi conservati: **{result['accepted_turns']}/55**.", "",
        "I primi 40 scambi provengono dal checkpoint precedente e non sono stati rigenerati. "
        "La classificazione fallita del primo turno della nona sessione è stata ripetuta; "
        "la richiesta precedente e il suo costo restano nel registro. La copia dei log è contata una sola volta.", "",
        "## Risultati", "", "| Sessione | Stato | Scambi | Memoria | Fatti validati | Respinti | Batch invalidi |",
        "|---|---|---:|---|---:|---:|---:|"]
    for s in result["sessions"]:
        c = s["consolidation"] or {}
        lines.append(f"| {s['index']} | {s['status']} | {s['turns']} | {s['memory_status'] or 'non finalizzata'} | "
                     f"{c.get('validated_facts', '—')} | {c.get('rejected_facts', '—')} | {c.get('invalid_batches', '—')} |")
    lines += ["", "`partial` indica che alcune proposte di memoria sono state respinte o non erano "
              "leggibili: restano archiviati i fatti validati e le fonti originali. Non significa che "
              "tutte le informazioni siano state ricordate correttamente.", "",
              f"Domande di verifica raggiunte: **{len(observed)}/6**; valutate: **{len(judgments)}**.", ""]
    if changed_turns:
        lines += [f"**{len(changed_turns)} scambio archiviato è stato alterato dal filtro dell'input** "
                  f"({', '.join(t['turn_id'] for t in changed_turns)}). Il suo esito rimane nei dati; "
                  "non è una somministrazione integra della domanda di memoria.", ""]
    if judgments:
        lines += ["| Domanda | Esito | Motivazione |", "|---|---|---|"]
        for j in judgments:
            lines.append(f"| {j['turn_id']} | {j['result']} | {j['reason'].replace('|', '/').replace(chr(10), ' ')} |")
        lines += ["", "Valutazione semantica di Codex secondo il gold fissato prima delle inferenze; "
                  "non una valutazione clinica indipendente.", ""]
    else:
        lines += ["Non è ancora disponibile un punteggio di continuità. I probe non osservati non sono errori del modello.", ""]
    lines += ["## Chiamate e arresti", "",
        f"- Eventi nativi cumulativi: `{result['native_counts_cumulative']}`.",
        f"- Eventi nativi di questa ripresa: `{result['native_counts_this_attempt']}`.",
        f"- Costo dichiarato delle risposte: **USD {result['reported_response_usd']:.6f}**; "
        f"costo dichiarato degli errori: USD {result['reported_error_usd']:.6f} "
        f"({result['errors_with_missing_cost']} errori privi di costo dichiarato).",
        f"- Completamenti non validi in questa ripresa: **{len(invalid_outcomes)}**; "
        f"costo dichiarato USD {result['reported_invalid_response_usd']:.6f}, già incluso nel costo delle risposte.",
        f"- Richieste dopo il primo nuovo arresto: **{result['requests_after_first_new_fatal']}**.", ""]
    if stopped:
        error = stopped[-1].get("error", {})
        details = error.get("details") or {}
        description = ("falso positivo del filtro dell'input: `call` è stato rilevato dentro `recall`"
                       if application_failure else
                       "completamento privo di contenuto utilizzabile, con finish reason "
                       f"`{details.get('finish_reasons')}`" if details.get("kind") == "incomplete_generation" else
                       f"errore `{error.get('type')}`, codice upstream `{details.get('upstream_code')}`")
        lines += [f"La sessione {stopped[-1]['session_index']} si è fermata per {description}, "
                  f"nella fase `{details.get('stage') or 'sanitize_user_input'}`. I dati già prodotti sono conservati. "
                  f"Richieste dopo l'arresto di questo tentativo: {result['requests_after_final_stop']}.", ""]
    lines += ["## Metodo e limiti", "",
        "OpenRouter `google/gemini-2.5-pro`. Temperature: paziente 0,7; classificazione 0; "
        "memoria 0,2. Budget di output: 4096/4096/8192; top-p 0,95; thinking budget 1024; "
        "nessun seed API. Il top-k richiesto dall'adapter è omesso dal trasporto. "
        "Richieste seriali distanziate almeno cinque secondi; unico recupero consentito "
        "4096→8192 per MAX_TOKENS. Prompt, parametri effettivi e risposte sono nei log nativi.", "",
        "È una prova di regressione su un solo profilo simulato (Alex), con 11 sessioni di cinque "
        "scambi e sei probe già fissati. Le route Python, il grafo e la memoria persistente sono "
        "esercitati in processi nuovi; non viene provata la UI né un percorso di undici fasi cliniche. "
        "Il recupero della sessione interrotta usa un aggancio esplicito del controllo sperimentale: "
        "non dimostra il recupero automatico dell'API dopo un arresto. Il test non misura superiorità "
        "rispetto alla baseline e non sostituisce le repliche su più profili.", "",
        "## Artefatti", "",
        "- Protocollo e continuità: `PROTOCOL.md`, `lineage.json`, `manifest.json`.",
        "- Test offline: `test_resume.py`, `offline-tests.log`, `offline-gate.json`.",
        "- Risposte e log originali più continuazione: `runtime/sessions/`.",
        "- Memoria e registro: `runtime/memory/`, `runtime/runs/`.",
        "- Probe: `runtime/probe-review.json`; giudizi in `probe-assessment.json` quando disponibili.",
        "- Contabilità: `results.json`; analisi riproducibile con `summarize.py`.",
        "- Implementazione congelata: `../integration/source/`, `../integration/manifest.json`.",
        "- Archivio precedente immutato: `../resume-02/runtime/`; primo arresto in `../integration/runtime/`.", ""]
    (HERE / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({k: result[k] for k in ("status", "completed_sessions", "accepted_turns", "observed_probes", "reported_response_usd")}))


if __name__ == "__main__":
    main()
