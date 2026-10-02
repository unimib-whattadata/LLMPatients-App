"""Summarize saved outcomes; never generate or modify experimental responses."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from contexts import ARMS
from resource_usage import collect


def read(path):
    return json.loads(path.read_text())


def main():
    results = read(ROOT / "analysis/results.json")
    resources = collect()
    (ROOT / "analysis/resource-usage.json").write_text(json.dumps(resources, indent=2, ensure_ascii=False) + "\n")
    status = read(ROOT / "run/status.json")
    reviewed = ROOT / "analysis/semantic-adjudication.json"
    judgments = read(reviewed) if reviewed.exists() else {}
    if isinstance(judgments, dict) and "judgments" in judgments:
        judgments = judgments["judgments"]
    if isinstance(judgments, list):
        judgments = {j["review_id"]: j for j in judgments}
    counts = defaultdict(lambda: Counter())
    patients = defaultdict(lambda: Counter())
    categories = defaultdict(lambda: Counter())
    coverage = Counter((row["patient_id"], row["arm"]) for row in results["scores"])
    complete_patients = {pid for pid, _ in coverage if all(coverage[pid, arm] == 8 for arm in ARMS)}
    unresolved = []
    for row in results["scores"]:
        score = row["score"]
        judgment = judgments.get(row["review_id"])
        if judgment is not None:
            if not isinstance(judgment.get("correct"), bool):
                raise ValueError("Semantic judgments must contain an explicit boolean correctness decision")
            correct = judgment["correct"]
        elif not score["semantic_review"]:
            correct = score["strict_pass"]
        else:
            correct = None
            unresolved.append(row["review_id"])
        counters = [patients[row["patient_id"], row["arm"]]]
        if row["patient_id"] in complete_patients:
            counters.extend([counts[row["arm"]], categories[row["category"], row["arm"]]])
        for counter in counters:
            counter["complete"] += 1
            counter["resolved"] += correct is not None
            counter["correct"] += correct is True
    def display(counter):
        return f"{counter['correct']}/{counter['complete']}" if counter["complete"] == counter["resolved"] else "Da valutare"
    stop_lines = []
    stop_path = ROOT / "analysis/stop-evidence.json"
    if status["status"].startswith("stopped") and stop_path.exists():
        stop = read(stop_path)
        native_cost = stop.get("reported_usd_native_responses", stop.get("reported_usd_completed_responses"))
        stop_cost = stop.get("stop_request_reported_cost", stop.get("error_request_reported_cost"))
        stop_cost_note = ("già compreso nel totale" if stop.get("stop_cost_included_in_native_total")
                          else "dichiarato separatamente dal provider")
        prepared_counts = Counter(row["patient_id"] for row in resources["preparation"]["sessions"])
        answer_counts = Counter(row["patient_id"] for row in results["scores"])
        remaining = []
        for pid in read(ROOT / "schedule.json")["patients"]:
            prep_left, answers_left = 11 - prepared_counts[pid], 56 - answer_counts[pid]
            if prep_left or answers_left:
                name = pid.removesuffix("_001").replace("_", " ").title()
                remaining.append(f"{name}: {prep_left} sessioni e {answers_left} risposte")
        stop_lines = ["## Arresto e lavoro restante", "",
                      f"Motivo archiviato: **{stop['stop_reason']}**. "
                      "Il controllo ha arrestato la campagna. "
                      f"Richieste successive all'errore che ha fermato questa esecuzione: **{stop['requests_after_first_error']}**. "
                      "Nessun retry automatico è stato effettuato dopo questo arresto. "
                      "L'archivio conserva anche l'arresto precedente e la successiva ripresa autorizzata dall'utente.", "",
                      f"Costo dichiarato dal provider per le risposte native archiviate: **USD {native_cost:.6f}**. "
                      f"La chiamata che ha fermato l'esecuzione riporta USD {stop_cost}, {stop_cost_note}.", "",
                      "Restano " + "; ".join(remaining) + "; il controllo applicativo separato. "
                      "Quest'ultimo **non è stato avviato**. Una ripresa richiede una nuova istruzione "
                      "dell'utente e deve conservare tutte le risposte già completate.", ""]
        if stop.get("failure_kind") == "empty_final_answer":
            stop_lines += ["La richiesta d'arresto ha ricevuto HTTP 200 e terminazione STOP, "
                           "ma nessun testo finale. È conservata come completamento non valido, "
                           "fuori dalle risposte valutabili e inclusa nei costi nativi. "
                           "Non è una risposta semantica corretta o errata, né un caso MAX_TOKENS. "
                           "Non risultano nuovi eventi d'errore HTTP/in-band in questa ripresa; "
                           "i due eventi precedenti restano nell'archivio.", ""]
    lines = ["# Continuità della memoria: esecuzione e risultati", "", "## Material Passport", "",
             "- Materiali interamente sintetici; ARS-Codex, esperimento eseguito su richiesta dell'utente.",
             f"- Aggiornamento: {datetime.now(timezone.utc).isoformat()}.",
             "- Modello: `google/gemini-2.5-pro`, OpenRouter.",
             f"- Stato del confronto: **{status['status']}**.",
             f"- Sessioni preparate: **{results['prepared_sessions']}/55**; risposte finali: **{results['completed_answers']}/280**.",
             "- Cinque traiettorie appaiate previste; dialoghi sorgente prefissati e uguali fra condizioni; una risposta per domanda e condizione.", "",
             *stop_lines,
             "## Risultati sui profili completi", "",
             f"Il confronto seguente usa **{len(complete_patients)}/5 profili completi**, con tutte le otto domande in ogni condizione. "
             + ("Le condizioni sono confrontate sugli stessi cinque percorsi e sulle stesse domande."
                if len(complete_patients) == 5 else
                "Eventuali risposte di profili incompleti sono riportate separatamente; non si aggregano campioni con domande differenti fra condizioni."),
             ("Il confronto e la lettura semantica sono completi." if results['completed_answers'] == 280 and not unresolved
              else "Un confronto incompleto non consente una conclusione finale fra le condizioni."), "",
             "| Condizione | Corrette sui profili completi | Previste su tutti i 5 profili |",
             "|---|---:|---:|"]
    for arm in ARMS:
        lines.append(f"| {arm} | {display(counts[arm])} | 40 |")
    lines += ["", f"Risposte archiviate ancora da valutare semanticamente: **{len(unresolved)}**.", ""]
    if results['completed_answers'] == 280 and not unresolved:
        lines += ["## Interpretazione del confronto", "",
                  "L'unità del confronto è il percorso del paziente: cinque percorsi appaiati, "
                  "con una sola generazione per domanda e condizione. Le 280 risposte non sono "
                  "280 osservazioni indipendenti; non si stima la variabilità tra repliche.", ""]
        retrieval_arms = ('raw_4000', 'raw_8000', 'structured_4000', 'structured_8000')
        if all(counts[arm]['correct'] == counts['history_full']['correct'] == 40 for arm in retrieval_arms):
            lines += ["Cronologia completa, recupero dei dialoghi originali e recupero con fatti "
                      "strutturati ottengono tutti 40/40. In questo corpus non emerge un vantaggio "
                      "di accuratezza dei fatti strutturati sul recupero dei dialoghi, né una "
                      "superiorità sulla cronologia completa. La condizione con sola sintesi ottiene "
                      f"{counts['summary_4000']['correct']}/40 a 4.000 token e "
                      f"{counts['summary_8000']['correct']}/40 a 8.000 token.", "",
                      "Il risultato sostiene l'utilità del recupero rispetto alla sola sintesi "
                      "con contesto limitato. Il minore contesto nelle domande finali non implica "
                      "un risparmio complessivo: includendo sintesi ed estrazioni, il costo "
                      "osservato delle configurazioni di memoria è maggiore in questo protocollo. "
                      "Le estrazioni respinte e il fallback sui dialoghi originali limitano "
                      "ulteriormente l'attribuzione del risultato ai soli fatti strutturati.", ""]
    lines += ["## Per paziente", "",
              ("Tutti i profili hanno otto risposte valutate in ciascuna condizione."
               if len(complete_patients) == 5 else
               "Per i profili incompleti denominatori e domande possono differire: le frazioni parziali non misurano una superiorità tra condizioni."), "",
              "| Paziente | " + " | ".join(ARMS) + " |",
              "|---|" + "---:|" * len(ARMS)]
    for pid in sorted({s["patient_id"] for s in results["scores"]}):
        label = pid if pid in complete_patients else pid + " (incompleto)"
        lines.append("| " + label + " | " + " | ".join(display(patients[pid, arm]) for arm in ARMS) + " |")
    lines += ["", "## Per categoria sui profili completi", "", "| Categoria | " + " | ".join(ARMS) + " |",
              "|---|" + "---:|" * len(ARMS)]
    for category in sorted({s["category"] for s in results["scores"]}):
        lines.append("| " + category + " | " + " | ".join(display(categories[category, arm]) for arm in ARMS) + " |")
    lines += ["", "## Preparazione e disponibilità", "",
              f"Richieste native: {results['native_requests']}; risposte native archiviate: {results['native_responses']}; errori nativi: {results['native_errors']}.",
              f"Sessioni con almeno un'estrazione respinta: **{len(results['sessions_with_extraction_failure'])}/{results['prepared_sessions']}**.",
              "In queste sessioni il confronto del componente conserva i dialoghi originali recuperabili. "
              "Questo fallback sperimentale va distinto dalla chiusura nativa dell'applicazione.", "",
              "Il controllo applicativo in `integration/` ha uno stato separato. "
              "La preparazione dei file e il superamento dei test offline non equivalgono alla sua esecuzione live.", "",
              "## Token e costi osservati", "",
              "| Stage/condizione | Chiamate | Token input | Token output | USD dichiarati | Costo mancante |",
              "|---|---:|---:|---:|---:|---:|"]
    for name, data in sorted(results["costs_by_stage"].items()):
        lines.append(f"| {name} | {data['calls']} | {data['prompt_tokens']} | {data['completion_tokens']} | {data['reported_usd']:.6f} | {data['missing_cost_calls']} |")
    lines += ["", "Le quantità sopra riguardano tutte le risposte native archiviate, anche quelle di "
              "preparazione o prive di testo finale utilizzabile. I costi eventualmente non comunicati per richieste "
              "fallite non sono contabilizzati come zero."]
    costs = results["costs_by_stage"]
    if results["completed_answers"] == 280:
        lines += ["", "### Costo attribuito a ogni configurazione", "",
                  "Ogni riga comprende cinque percorsi e 40 domande finali; le sintesi comuni "
                  "sono attribuite integralmente a ciascuna configurazione che le usa. I costi "
                  "locali dell'encoder sono registrati separatamente, senza convertirli in USD.", "",
                  "| Configurazione | Risposte USD | Sintesi USD | Estrazioni USD | Totale USD |",
                  "|---|---:|---:|---:|---:|"]
        for arm in ARMS:
            query = costs.get(arm, {}).get("reported_usd", 0)
            summary = 0 if arm == "history_full" else costs.get("summary", {}).get("reported_usd", 0)
            extraction = costs.get("extraction", {}).get("reported_usd", 0) if arm.startswith("structured") else 0
            lines.append(f"| {arm} | {query:.6f} | {summary:.6f} | {extraction:.6f} | {query + summary + extraction:.6f} |")
    lines += ["", "Il costo operativo di ogni configurazione comprende le proprie risposte, tutte le sintesi "
              "che richiede e, per structured, tutte le estrazioni. Il costo delle sintesi comuni non è zero "
              "solo perché viene condiviso durante il benchmark. I token di ragionamento e le latenze "
              "sono nei record nativi. La risposta storica vuota in raw_8000 resta inclusa nel suo "
              "costo operativo, pur non essendo una delle 40 risposte valutate.", "",
              "## Contesto e tempi osservati", "",
              "| Condizione | N risposte | Memoria stimata media / massima | Generazione mediana / p95 (s) | CPU costruzione contesto (s) |",
              "|---|---:|---:|---:|---:|"]
    for arm in ARMS:
        group = resources["by_arm"].get(arm, {})
        memory = group.get("memory_estimated_tokens", {})
        latency = group.get("answer_elapsed_seconds", {})
        if not memory.get("n"):
            continue
        cpu = group.get("retrieval_cpu_seconds", {}).get("sum")
        cpu_label = f"{cpu:.3f}" if cpu is not None else "n/a"
        lines.append(f"| {arm} | {memory['n']} | {memory['mean']:.1f} / {memory['max']} | "
                     f"{latency['median']:.2f} / {latency['p95_nearest_rank']:.2f} | {cpu_label} |")
    init_cpu = sum(row["cpu_seconds"] for row in resources["encoder_initialization"])
    init_wall = sum(row["wall_seconds"] for row in resources["encoder_initialization"])
    lines += ["", "La stima della memoria esclude profilo, domanda e istruzioni. I token effettivi del "
              "provider sono nella tabella dei costi. Le durate sono osservazioni descrittive, dipendenti "
              "anche dal provider e dall'ordine di esecuzione; p95 usa il rango superiore. Il tempo CPU "
              "comprende la costruzione del contesto e l'eventuale recupero, ma esclude l'inizializzazione dell'encoder.", "",
              f"Inizializzazioni encoder osservate: {len(resources['encoder_initialization'])}; "
              f"CPU complessiva {init_cpu:.3f}s, tempo trascorso {init_wall:.3f}s. "
              "I totali osservati conservano anche i caricamenti aggiuntivi dopo riprese autorizzate, "
              "recuperati dagli snapshot. In una configurazione distribuita separatamente il caricamento "
              "condiviso va attribuito una volta per paziente; i riavvii sono un costo operativo aggiuntivo.", "",
              "## Valutazione semantica", "",
              "Le condizioni sono nascoste al valutatore, che ha letto le risposte insieme a fonti e gold "
              "prespecificati. Il valutatore Codex ha anche partecipato alla preparazione del corpus: "
              "questa lettura non costituisce una valutazione clinica indipendente. Tutte le decisioni "
              "e le relative motivazioni sono archiviate.", "",
              "## Limiti e dati", "",
              "Questo confronto misura il componente di memoria con dialoghi prefissati. "
              "Il controllo API/grafo con risposte intermedie generate è separato in `integration/`. "
              "Nessuna superiorità dell'intero sistema o generalizzazione clinica segue da questi soli dati.",
              "", "Protocollo e hash: `PROTOCOL.md`, `manifest.json`, `environment.json`. "
              "Fonti e gold: `corpus/`. Prompt e risposte: `run/<patient_id>/answers/`. "
              "Tutte le richieste, inclusi gli errori: `run/native.jsonl`. "
              "Valutazione automatica: `analysis/results.json`; lettura semantica: "
              "`analysis/blinded-review.json` e, quando presente, `analysis/semantic-adjudication.json`."]
    integration_summary = ROOT / "analysis/integration-summary.md"
    if integration_summary.exists():
        position = lines.index("## Limiti e dati")
        lines[position:position] = integration_summary.read_text().strip().splitlines() + [""]
    (ROOT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({"report": str(ROOT / "REPORT.md"), "unresolved": len(unresolved)}))


if __name__ == "__main__":
    main()
