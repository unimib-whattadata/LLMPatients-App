"""Write the completed report only after both full analyses and runtime gates pass."""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
AGENT = Path("/Users/marco/Sites/LLMPatients-Agent")


def read(name):
    return json.loads((OUT / name).read_text())


def pct(value):
    return f"{value * 100:.1f}%"


def metric(value):
    return f"{value['correct']}/{value['planned_assertions']} ({pct(value['end_to_end_accuracy'])})"


def valid_metric(value):
    denominator = value["runtime_valid_assertions"]
    if not denominator:
        return "0 risposte valide; non stimabile"
    return f"{value['correct']}/{denominator} ({pct(value['valid_only_accuracy'])})"


def main():
    phq = read("analysis/phq-validation.json")
    longitudinal = read("analysis/longitudinal-summary.json")
    audit = read("analysis/longitudinal-audit.json")
    runtime = read("runtime/memory_fix_results.json")
    backend = read("runtime/app-backend-real.json")
    misstep = read("runtime/app-backend-sensitivity-audit.json")
    assert phq["status"] == "complete" and phq["complete_administrations"] == 100
    assert phq["item_answers"] == 1000 and not phq["validation_errors"]
    assert all(row["n"] == 20 for row in phq["profiles"].values())
    assert longitudinal["complete"] and longitudinal["integrity_valid"]
    assert longitudinal["analysis_mode"] == "strict"
    assert longitudinal["completed_sessions"] == 110 and longitudinal["observed_responses"] == 550
    provenance = longitudinal["response_provenance_checks"]
    assert provenance["valid_patient_responses_checked"] == longitudinal["valid_responses"]
    assert provenance["valid_patient_responses_verified"] == longitudinal["valid_responses"]
    assert longitudinal["api_response_id_audit"]["all_present_ids_globally_unique"]
    assert not longitudinal["api_response_id_audit"]["returned_api_responses_without_id"]
    assert longitudinal["pooling_permitted"]
    assert all(v["primary"]["complete"] and v["secondary"]["complete"] for v in longitudinal["by_condition"].values())
    assert runtime["new_regression_tests_passed"] == 13 and runtime["existing_tests_passed"] == 7
    assert runtime["live_test"]["sessions_finalized"] == ["finalized", "finalized"]
    assert all(runtime["live_test"]["recall"].values())
    assert backend["status"] == "passed" and backend["exitCode"] == 0
    assert all(backend[k] for k in ("realPatientResponseVerified", "backendPassed", "finalizationVerified", "databaseCleanupVerified"))
    for path, expected in read("runtime/agent-memory-fix-sha256.json").items():
        assert hashlib.sha256((AGENT / path).read_bytes()).hexdigest() == expected, path

    names = {"alex_carter_001": "Alex Carter", "jason_smith_001": "Jason Smith",
             "daniel_isherwood_001": "Daniel Isherwood", "crystal_smith_001": "Crystal Smith",
             "juanita_delgado_001": "Juanita Delgado"}
    lines = ["# Verifica conclusiva della revisione", "", "## Material Passport", "",
             "- Origin Skill: ARS-Codex / experiment-agent",
             "- Origin Mode: run + validate",
             f"- Analysis timestamp: {datetime.now(timezone.utc).isoformat()}",
             "- Verification status: completati i test specificati e verificata la provenienza dei risultati. Modello storico e configurazione del revisore restano parzialmente sconosciuti.",
             "- Dati: cinque profili sintetici; nessun nuovo partecipante umano o giudizio clinico.", "",
             "## Cosa è stato completato", "",
             "- **100 PHQ-9**, 20 per ciascuno dei cinque pazienti, con **1.000 risposte individuali** archiviate.",
             f"- **110 sessioni longitudinali e 550 turni valutati**: cinque percorsi di 11 sessioni per ciascuna condizione, cinque turni per sessione; {longitudinal['valid_responses']} risposte valide e {longitudinal['runtime_invalid_responses']} esiti tecnici non validi.",
             "- Correzione della memoria troncata, **20 test software** e riapertura reale della memoria in un processo nuovo.",
             f"- Backend reale App–Agent–valutatore: **PASS**, {backend['elapsedSeconds']:.1f} secondi; database temporaneo eliminato.",
             "- Ricalcolo della valutazione misstep storica e verifica dei suoi limiti di disegno.", "",
             "## 1. Replica PHQ-9", "",
             "| Paziente | Pubblicato | Nuova media ± DS (20 run) | Intervallo | Run ≥10 | Revisore, media dichiarata |",
             "|---|---:|---:|---:|---:|---:|"]
    for pid, name in names.items():
        row = phq["profiles"][pid]
        reviewer = row["reviewer_reported_mean_unverified"]
        lines.append(f"| {name} | {row['archived_published_score']} | {row['mean']:.2f} ± {row['sample_sd']:.2f} | {row['min']}–{row['max']} | {row['n_at_least_10']}/20 | {reviewer if reviewer is not None else '—'} |")
    daniel = phq["profiles"]["daniel_isherwood_001"]
    counts = phq["api_counts_for_complete_administrations"]
    lines += ["", f"Daniel raggiunge la soglia in **{daniel['n_at_least_10']}/20** somministrazioni. Il suo valore pubblicato di 10 è confermato dal JSON storico, ma non deve essere interpretato come separazione stabile garantita. Il PHQ-9 misura sintomi depressivi; Daniel è un profilo centrato sul binge eating e il manoscritto include anche il BES come controllo specifico.", "",
              "**Configurazione osservata:** Vertex AI, `gemini-2.5-pro`, regione `us-central1`, temperatura 0,1, limite iniziale 220 token, top-p 0,95, top-k 40, stop sequences archiviate, nessun seed impostato. Ogni item è indipendente e non attraversa il grafo o la memoria. Il contesto seleziona campi del profilo e tronca il caso clinico a 400 caratteri.", "",
              f"Le risposte provengono da {counts['api_attempts']} tentativi API, con {counts.get('failed_api_attempts', 0)} tentativi falliti archiviati. Gli ID delle {phq['unique_response_ids']} risposte restituite sono univoci. {counts.get('accepted_answers_without_STOP', 0)} risposte intere sono state accettate dal runner originale pur con un motivo di terminazione diverso da STOP: la replica conserva quel comportamento e lo segnala, senza sostituire le risposte.", "",
              "I primi tre run per paziente sono quelli già completati nell'audit iniziale. I run 04 allora interrotti, privi di registrazione API completa, sono conservati nel vecchio dossier ma esclusi; la continuazione li ricomincia secondo una decisione documentata prima dei nuovi risultati. Tutti i run completi sono mantenuti.", "",
              "**Perché il revisore non replica:** la causa esatta non è identificabile senza il suo codice e gli item grezzi. I 50 prompt ricostruiti dal codice storico coincidono con quelli attuali; gli output storici non attestano modello/versione, seed e configurazione completa. Una reimplementazione con un modello o un contesto diverso non è lo stesso esperimento. La nuova replica rende verificabile la configurazione attuale, senza attribuirla retroattivamente ai dati storici.", "",
              "Fonti: [validazione PHQ](analysis/phq-validation.json), [risposte per item](analysis/phq-items.csv), [prompt esatti](analysis/phq-exact-prompts.json), [audit storico](../reviewer-audit-2026-09-27/REPORT.md).", "",
              "## 2. Continuità su undici sessioni", "",
              "La versione corretta del sistema viene confrontata con una baseline narrativa che riceve lo stesso YAML clinico completo e tutta la propria storia. Ogni sessione riparte in un processo nuovo; il sistema completo ricarica lo stato e la memoria da disco. Testi del terapeuta, profili, parametri iniziali di generazione e criteri sono fissati prima dei risultati.", "",
              "| Condizione | Prove primarie finali | Prove secondarie | Risposte tecnicamente non valide |",
              "|---|---:|---:|---:|"]
    for condition, label in [("full", "Sistema completo"), ("baseline", "Baseline narrativa + storia integrale")]:
        row = longitudinal["by_condition"][condition]
        lines.append(f"| {label} | {metric(row['primary'])} | {metric(row['secondary'])} | {row['runtime_invalid_responses']}/275 |")
    lines += ["", "Le percentuali seguenti considerano soltanto le risposte tecnicamente valide, mantenendo nel denominatore anche i mancati ricordi. Sono descrittive: non indicano quale sarebbe stato il risultato dei turni rimasti senza risposta.", "",
              "| Condizione | Prove primarie su risposte valide | Prove secondarie su risposte valide |",
              "|---|---:|---:|"]
    for condition, label in [("full", "Sistema completo"), ("baseline", "Baseline narrativa + storia integrale")]:
        row = longitudinal["by_condition"][condition]
        lines.append(f"| {label} | {valid_metric(row['primary'])} | {valid_metric(row['secondary'])} |")
    if (OUT / "runtime/operational-events.jsonl").exists():
        lines += ["", "Durante una sequenza di errori di capacità HTTP 429 è stato sospeso temporaneamente l'avvio di nuove sessioni longitudinali, lasciando terminare quelle già avviate. Le operazioni sono registrate in [eventi di esecuzione](runtime/operational-events.jsonl). Gli esiti tecnici già osservati sono conservati; i parametri e gli input scientifici restano quelli congelati. Il confronto va letto anche alla luce dei diversi momenti di disponibilità del servizio."]
    lines += ["", "| Paziente | Sistema completo, prove finali | Baseline, prove finali |", "|---|---:|---:|"]
    for row in longitudinal["paired_primary"]:
        lines.append(f"| {names[row['patient_id']]} | {row['full_primary_correct']}/6 | {row['baseline_primary_correct']}/6 |")
    lines += ["", "| Misura primaria | Sistema completo | Baseline |", "|---|---:|---:|"]
    for key, label in [("identity_preservation", "Nome ed età"), ("current_fact_recall", "Titolo e pianificazione aggiornati"), ("withheld_fact_recall", "Titolo introdotto in S2, non interrogato fino a S11")]:
        rows = {r["condition"]: r for r in longitudinal["by_metric"] if r["metric"] == key and r["is_primary"]}
        lines.append(f"| {label} | {metric(rows['full'])} | {metric(rows['baseline'])} |")
    lines += ["", "Sono prove lessicali conservative con risposte attese tracciate alla loro introduzione. Citare sia un valore vecchio sia quello attuale viene classificato come ambiguo; un non-match non è automaticamente una contraddizione. Le risposte di fallback rimangono nel denominatore complessivo e sono anche riportate separatamente.", "",
              "Il confronto riguarda **intere configurazioni**, comprese selezione e compressione del contesto. Cinque coppie di percorsi, una generazione per condizione, non identificano l'effetto causale della sola struttura e non dimostrano validità clinica o efficacia formativa. I fatti sono dati del percorso di esercitazione; il test non equivale a undici sedute cliniche validate da esperti.", "",
              "Le fasi del percorso sono definite nell'App come organizzazione didattica e suggerimenti al terapeuta. L'Agent registra `step_id` nei metadati, senza selezionare un prompt del paziente in base alla fase; il confronto usa i testi prefissati e misura la continuità della memoria. Vedi [perimetro del percorso](analysis/pathway-scope.md).", "",
              f"Nei log sono registrati {sum('Episode future still running' in r['text'] for r in audit['process_warnings'])} avvisi relativi alla soglia di dieci secondi per il consolidamento asincrono. Le evidenze dei processi, delle risposte e della memoria restano disponibili; gli avvisi non sono nascosti o trasformati in richiamo corretto.", "",
              "Fonti: [protocollo](longitudinal/protocol.md), [risultati](analysis/longitudinal-report.md), [audit delle fonti e del runtime](analysis/longitudinal-audit.json), [riepilogo](analysis/longitudinal-summary.json).", "",
              "## 3. Corpus misstep", "",
              "I ricalcoli coincidono con i numeri archiviati. Il corpus contiene 20 trascrizioni e 300 turni del terapeuta: 150 errori deliberati, concentrati in dieci trascrizioni. Quindici frasi con errore distinte sono ripetute dieci volte.", "",
              "| Riferimento del detector | Precisione | Sensibilità/recall | F1 |", "|---|---:|---:|---:|"]
    for reference in ("Rater 1", "Rater 2", "Either", "Both", "Seeded"):
        row = misstep["panel_b"][reference]
        lines.append(f"| {reference} | {row['precision']:.3f} | {row['recall']:.3f} | {row['f1']:.3f} |")
    lines += ["", f"L'accordo tra clinici è κ={misstep['agreement']['All']['kappa']:.3f} sul totale e κ={misstep['agreement']['Appropriate']['kappa']:.3f} nel sottoinsieme appropriate. Entrambi marcano tutti i 150 errori deliberati. Le etichette di condizione sono state rimosse dai fogli, ma non è stata misurata la capacità dei clinici di indovinare la condizione dal testo.", "",
              "Il revisore ha quindi ragione sul limite di trasferibilità. Questi risultati possono essere presentati come **analisi su un corpus artificiale saturo**, con precisioni descrittive del corpus; non come precisione attesa nelle sessioni reali degli studenti. Il test backend passato prova il funzionamento del percorso eseguito, non risolve questo limite scientifico.", "",
              "Fonti: [audit del corpus](runtime/app-backend-sensitivity-audit.md), [ricalcoli](runtime/app-backend-sensitivity-audit.json).", "",
              "## 4. Correzioni e verifica del software", "",
              "Il provider accettava una risposta parziale prima di controllare il motivo di terminazione; inoltre `str(FinishReason.MAX_TOKENS)` restituiva `2`, rendendo inefficace il confronto testuale. Ora il provider scarta i completamenti incompleti e applica un recupero con limite esplicito. Per le chiamate interne Gemini il budget iniziale è 4096. La finalizzazione segnala un errore se non ottiene entrambe le memorie e mantiene la sessione disponibile per riprovare.", "",
              "Il test backend caricava in modo incompleto l'ambiente e attendeva soltanto cinque secondi per un'analisi asincrona. Il test corretto ha osservato una valutazione reale completata in circa 13,6 secondi; verifica inoltre risposte REAL, assenza di fallback e pulizia delle connessioni e del database temporaneo.", "",
              "Fonti: [correzione memoria](runtime/runtime_memory_fix.md), [risultati delle regressioni e del test reale](runtime/memory_fix_results.json), [backend](runtime/app-backend-findings.md), [esito backend](runtime/app-backend-real.json).", "",
              "## 5. Controllo dell'interpretazione statistica: 11/11", "",
              "| Rischio | Trattamento |", "|---|---|",
              "| Paradosso di Simpson | Risultati longitudinali riportati anche per paziente, con denominatori uguali; i profili PHQ non sono ridotti a un solo valore medio. |",
              "| Fallacia ecologica | Nessuna inferenza su pazienti reali, clinici o studenti dai profili sintetici. |",
              "| Selezione/Berkson | Cinque casi scelti intenzionalmente; non un campione rappresentativo. |",
              "| Collider bias | Nessun modello causale aggiustato per variabili post-trattamento. |",
              "| Base rate neglect | Il 50% di errori deliberati è dichiarato; nessuna precisione proiettata come osservata su studenti. |",
              "| Regressione verso la media | Le differenze dalle singole misure storiche non sono presentate come miglioramento clinico. |",
              "| Survivorship bias | Run completi conservati, errori API archiviati, risposte di fallback nel denominatore; parziali storici esclusi documentati. |",
              "| Look-elsewhere effect | Nessun test di significatività; tutte le misure primarie e secondarie previste sono rendicontate. |",
              "| Scelte analitiche multiple | Protocollo locale e criteri congelati prima dei percorsi; non presentati come preregistrazione esterna. |",
              "| Correlazione/causalità | Nessuna attribuzione causale alla sola struttura del profilo o all'efficacia didattica. |",
              "| Causalità inversa | Introduzione e interrogazione dei fatti sono ordinate temporalmente; nessuna inferenza causale clinica. |", "",
              "## 6. Cosa aggiornare nella revisione", "",
              "1. Aggiungere protocollo esatto, modello osservato, parametri, assenza di seed e archivio per item della nuova replica; indicare quali metadati storici mancano.",
              "2. Ridimensionare la separazione PHQ basata sulla singola soglia e distinguere il controllo dei sintomi depressivi dalla coerenza di un profilo centrato sul binge eating.",
              "3. Inserire il nuovo confronto come verifica tecnica di continuità della versione corretta, riportandone anche fallimenti, limiti e risultato della baseline.",
              "4. Qualificare il corpus misstep come saturo e la precisione come interna a quel corpus; dichiarare che l'efficacia dell'accecamento non è stata misurata.", "",
              "Le modifiche software sono in Agent (provider, builder e due test) e App (due script di test); le patch sono in `runtime/`. Il manoscritto non è stato riscritto e non sono stati eseguiti commit. L'ambiente del test usa Python 3.12 e un overlay SciPy 1.16.3, documentati in [runtime-environment.json](runtime-environment.json).", ""]
    (OUT / "REPORT.md").write_text("\n".join(lines))
    print("Wrote", OUT / "REPORT.md")


if __name__ == "__main__":
    main()
