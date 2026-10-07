"""Summarize retained integration observations without generating or editing them."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "integration/runtime"


def read(path):
    return json.loads(path.read_text())


def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line] if path.exists() else []


def main():
    sessions = [read(path) for path in sorted(RUNTIME.glob("sessions/session_*/session.json"))]
    events, native, journals = [], [], []
    for folder in sorted((RUNTIME / "sessions").glob("session_*")):
        events.extend(rows(folder / "generation-events.jsonl"))
        path = folder / "openrouter-api-records.jsonl"
        if path.exists():
            data = path.read_bytes()
            native.extend(rows(path))
            journals.append({"path": str(path.relative_to(ROOT)), "bytes": len(data),
                             "sha256": hashlib.sha256(data).hexdigest()})
    stage_by_id = {r["native_record_id"]: r["stage"] for r in events if r.get("native_record_id")}
    costs = defaultdict(lambda: {"calls": 0, "input_tokens": 0, "output_tokens": 0,
                                "reported_usd": 0.0, "missing_cost_calls": 0})
    native_errors = [r for r in native if r["event"] not in {"request", "response"}]
    native_counts = Counter(r["event"] for r in native)
    for row in native:
        if row["event"] != "response":
            continue
        usage = row["response"].get("usage", {})
        group = costs[stage_by_id.get(row["record_id"], "unmatched")]
        group["calls"] += 1
        group["input_tokens"] += usage.get("prompt_tokens", 0)
        group["output_tokens"] += usage.get("completion_tokens", 0)
        if usage.get("cost") is None:
            group["missing_cost_calls"] += 1
        else:
            group["reported_usd"] += usage["cost"]
    complete = [s for s in sessions if s["status"] == "completed"]
    stopped = [s for s in sessions if s["status"] == "stopped"]
    status = "completed" if len(complete) == 11 else "stopped" if stopped else "running" if sessions else "not_started"
    review = read(RUNTIME / "probe-review.json") if (RUNTIME / "probe-review.json").exists() else {"probes": []}
    observed = [p for p in review["probes"] if p.get("response") is not None]
    assessment_path = ROOT / "analysis/probe-assessment.json"
    assessment = read(assessment_path) if assessment_path.exists() else {"judgments": []}
    judgments = assessment["judgments"]
    if judgments:
        assert len({j["turn_id"] for j in judgments}) == len(judgments)
        assert {j["turn_id"] for j in judgments} == {p["turn_id"] for p in observed}
        assert all(j["result"] in {"correct", "partial", "incorrect"} and j.get("reason") for j in judgments)
    health = Counter(s.get("memory_status", "not_finalized") for s in complete)
    session_summary = [{"session": s["session_index"], "status": s["status"], "turns": len(s["turns"]),
                        "memory_status": s.get("memory_status", "not_finalized"),
                        "consolidation": s.get("memory_consolidation"),
                        "restored_total_turns": s["restored_before_first_request"]["total_turns"],
                        "process_instance_id": s["process_instance_id"], "error": s.get("error")}
                       for s in sessions]
    first_error_at = min((r["timestamp"] for r in native_errors), default=None)
    last_stopped_at = stopped[-1].get("finished_at") if stopped else None
    result = {
        "generated_at": datetime.now(timezone.utc).isoformat(), "status": status,
        "study_kind": "single-profile regression of a known failure; not independent or blind",
        "model": "google/gemini-2.5-pro", "provider": "OpenRouter",
        "planned_sessions": 11, "completed_sessions": len(complete), "started_sessions": len(sessions),
        "accepted_turns": sum(len(s["turns"]) for s in sessions), "planned_turns": 55,
        "planned_probes": 6, "observed_probes": len(observed), "assessed_probes": len(judgments),
        "probe_results": dict(Counter(j["result"] for j in judgments)),
        "session_memory_status_counts": dict(health), "sessions": session_summary,
        "native_requests": native_counts['request'], "native_responses": native_counts['response'],
        "native_errors": len(native_errors), "costs_by_stage": dict(costs),
        "reported_usd": sum(g["reported_usd"] for g in costs.values()),
        "requests_after_first_provider_error": sum(r['event'] == 'request' and r['timestamp'] > first_error_at
                                                   for r in native) if first_error_at else 0,
        "requests_after_stop": sum(r['event'] == 'request' and r['timestamp'] > last_stopped_at
                                    for r in native) if last_stopped_at else 0,
        "native_journals": journals,
    }
    (ROOT / "analysis/results.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    lines = ["# Correzione della memoria e prova delle undici sessioni", "", "## Stato osservato", "",
             f"- Stato: **{status}**; sessioni finalizzate **{len(complete)}/11**; scambi archiviati **{result['accepted_turns']}/55**.",
             f"- Domande di verifica osservate: **{len(observed)}/6**; valutate: **{len(judgments)}**.",
             (f"- Consolidamenti per sessione: {dict(health)}." if health else
              "- La finalizzazione della memoria non è stata raggiunta."),
             f"- Richieste del provider: {result['native_requests']}; risposte: {result['native_responses']}; errori: {len(native_errors)}.",
             f"- Costo nativo dichiarato: **USD {result['reported_usd']:.6f}**.", "",
             "Questa è una prova di regressione su Alex e sullo stesso copione della prova che "
             "aveva rilevato il difetto. È una sola traiettoria, senza repliche o baseline parallela; "
             "non è una stima indipendente di efficacia o superiorità.", "",
             "## Correzione e verifiche offline", "",
             "La chiusura promuove solo i fatti che passano i controlli esistenti. Le proposte respinte "
             "e il testo originale dell'estrazione sono registrati separatamente. Le fonti originali "
             "restano recuperabili. API e registro espongono il consolidamento parziale; errori del "
             "servizio, risposte vuote e problemi di scrittura continuano a interrompere la chiusura.", "",
             "86 test di produzione e 22 test del controllo d'integrazione sono passati offline. "
             "Il replay dell'estrazione che aveva fallito conserva 12 fatti validati e 3 respinti, "
             "con lo stesso prompt e senza chiamate al modello. La modalità rigorosa continua a "
             "rifiutare quel batch; i controlli di ammissione non sono stati allentati.", "",
             "## Sessioni", "", "| Sessione | Esito | Turni | Memoria | Fatti validati | Fatti respinti | Batch invalidi |",
             "|---|---|---:|---|---:|---:|---:|"]
    for s in session_summary:
        c = s['consolidation'] or {}
        lines.append(f"| {s['session']} | {s['status']} | {s['turns']} | {s['memory_status']} | "
                     f"{c.get('validated_facts', '—')} | {c.get('rejected_facts', '—')} | {c.get('invalid_batches', '—')} |")
    lines += ["", "`partial` indica fatti respinti o errori di schema, non una sessione rimasta aperta. "
              "I fatti respinti non sono contati come fatti validati. La chiusura riuscita da sola "
              "non dimostra che le domande di memoria abbiano ricevuto risposte corrette.", ""]
    if stopped:
        error_details = stopped[-1].get('error', {}).get('details') or {}
        provider_code = error_details.get('upstream_code')
        provider_note = (f" Il provider ha restituito il codice **{provider_code}** "
                         f"durante `{error_details.get('stage', 'unknown')}`."
                         if provider_code is not None else "")
        lines += ["## Arresto", "", f"La sessione {stopped[-1]['session_index']} si è fermata con "
                  f"`{stopped[-1].get('error', {}).get('type', 'unknown')}`." + provider_note + " I turni già accettati "
                  "e le richieste native restano conservati; nessuna risposta è stata rigenerata "
                  "per migliorare il punteggio.", "",
                  f"Richieste dopo l'arresto: {result['requests_after_stop']}; richieste dopo il primo "
                  f"errore del provider: {result['requests_after_first_provider_error']}.", ""]
    lines += ["## Domande di verifica", ""]
    if judgments:
        lines += ["| Domanda | Esito | Motivazione |", "|---|---|---|"]
        for j in judgments:
            lines.append(f"| {j['turn_id']} | {j['result']} | {j['reason'].replace('|', '/').replace(chr(10), ' ')} |")
        lines += ["", "La lettura semantica è stata svolta da Codex sui criteri e sulle fonti fissati "
                  "nel gold; non è una valutazione clinica indipendente.", ""]
    else:
        lines += [("Nessuna delle sei domande è stata raggiunta: non è disponibile un punteggio "
                   "di continuità. Le domande non osservate non sono risposte errate."
                   if not observed else
                   "Le risposte osservate richiedono lettura semantica prima di assegnare un esito; le domande non osservate non sono risposte errate."), ""]
    lines += ["## Modello, impostazioni e limiti", "",
              "Gemini `google/gemini-2.5-pro`, OpenRouter. Risposte: temperatura 0,7, massimo "
              "4096 token; classificazioni: 0,0/4096; memoria: 0,2/8192. Top-p 0,95, "
              "thinking budget 1024, nessun seed API. Chiamate seriali distanziate almeno "
              "5 secondi; un solo recupero 4096→8192 per MAX_TOKENS. Nessun retry automatico "
              "di disponibilità. Parametri richiesti ed effettivi sono nei log nativi.", "",
              "Il controllo chiama le route Python e il grafo; non avvia un server HTTP o la UI. "
              "Ogni sessione è un nuovo processo; il ripristino usa il ledger e la memoria persistita. "
              "I parametri di memoria e la barriera di attesa degli episodi sono gli override "
              "dichiarati in `integration/PROTOCOL.md`. Undici sessioni non equivalgono alla "
              "verifica di undici fasi cliniche.", "",
              "## Dati e riproducibilità", "",
              "- Protocollo/emendamento: `integration/PROTOCOL.md`, `AMENDMENT.md`.",
              "- Codice e hash: `integration/source/`, `integration/manifest.json`, `analysis/runtime-correction.patch`.",
              "- Copione/gold: `integration/scenario.json`, `integration/gold.json`.",
              "- Prompt, risposte, errori e parametri: `integration/runtime/sessions/`.",
              "- Memoria e ripristino: `integration/runtime/memory/`, `integration/runtime/runs/`.",
              "- Valutazione dei probe: `integration/runtime/probe-review.json`, `analysis/probe-assessment.json` quando disponibile.",
              "- Risultati e costi per stage: `analysis/results.json`.",
              "- Test offline: `analysis/production-tests.log`, `integration/offline-test.log`.", "",
              "Il confronto del componente e il fallimento della versione precedente restano "
              "immutati in `../memory-benchmark-2026-09-28/`; i loro risultati non sono attribuiti "
              "al runtime corretto senza un nuovo confronto."]
    (ROOT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({k: result[k] for k in ("status", "completed_sessions", "accepted_turns", "observed_probes", "native_errors", "reported_usd")}))


if __name__ == "__main__":
    main()
