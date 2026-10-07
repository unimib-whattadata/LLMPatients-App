"""Write the completed report only after both full analyses and runtime gates pass."""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1]
TESTED_AGENT_SNAPSHOT = OUT / "longitudinal-source"


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


def observed_metric(value):
    denominator = value["observed_assertions"]
    if not denominator:
        return "— (nessuna prova)"
    return f"{value['correct']}/{denominator} ({pct(value['observed_end_to_end_accuracy'])})"


def main():
    phq = read("analysis/phq-validation.json")
    longitudinal = read("analysis/longitudinal-summary.json")
    audit = read("analysis/longitudinal-audit.json")
    runtime = read("runtime/memory_fix_results.json")
    backend = read("runtime/app-backend-real.json")
    misstep = read("runtime/app-backend-sensitivity-audit.json")
    amendment = read("endpoint-amendment.json")
    assert amendment["id"] == "vertex-global-continuation-2026-09-27"
    assert amendment["inherited_counts"]["phq_complete_administrations"] == 68
    assert amendment["inherited_counts"]["longitudinal_session_statuses"]["completed"] == 32
    assert phq["status"] == "complete" and phq["complete_administrations"] == 100
    assert phq["item_answers"] == 1000 and not phq["validation_errors"]
    assert all(row["n"] == 20 for row in phq["profiles"].values())
    assert phq["endpoint_amendment"]["id"] == amendment["id"]
    inheritance = phq["inheritance_validation"]
    assert inheritance["verified_original_hashes"] == inheritance["archived_phq_files"] == 224
    assert inheritance["identical_complete_files"] == 204
    assert inheritance["retained_saved_partial_items"] == inheritance["inherited_saved_partial_items"] == 8
    assert sum(phq["accepted_item_endpoint_counts_complete_administrations"].values()) == 1000
    user_resume = phq["user_resume_validation"]
    assert user_resume["resumption_id"] == "user-resume-global-2026-09-27-1348"
    assert user_resume["verified_archived_phq_files"] == 224
    assert user_resume["completed_runs_retained"] == 68
    assert user_resume["identical_completed_files"] == 204
    assert user_resume["partial_answers_retained"] == 8
    assert longitudinal["complete"] and longitudinal["integrity_valid"]
    assert longitudinal["analysis_mode"] == "strict"
    assert longitudinal["completed_sessions"] == 110 and longitudinal["observed_responses"] == 550
    provenance = longitudinal["response_provenance_checks"]
    assert provenance["valid_patient_responses_checked"] == longitudinal["valid_responses"]
    assert provenance["valid_patient_responses_verified"] == longitudinal["valid_responses"]
    assert longitudinal["api_response_id_audit"]["all_present_ids_globally_unique"]
    assert not longitudinal["api_response_id_audit"]["returned_api_responses_without_id"]
    assert longitudinal["pooling_permitted"]
    assert longitudinal["endpoint_amendment_id"] == amendment["id"]
    assert audit["endpoint_amendment"]["archived_input_files_checked"] == 371
    assert all(item["matches"] for item in audit["integrity"])
    resumed_longitudinal = audit["process_resumption"]
    assert resumed_longitudinal["resumption"]["id"] == user_resume["resumption_id"]
    assert resumed_longitudinal["process_resumption_sha256"] == "24c0330e8dfa3157b4526ffac57a91bee951be16b13c22f1390547b5708f3945"
    assert resumed_longitudinal["archived_input_files_checked"] == 375
    assert all(item["retained"] for item in resumed_longitudinal["longitudinal_retention_checks"])
    assert not resumed_longitudinal["uncommitted_visible_stop_outcomes"]
    assert resumed_longitudinal["new_controller_execution_recorded"]
    assert resumed_longitudinal["controller_execution"]["actual_workers"] == 1
    assert sum(row["observed_responses"] for row in longitudinal["endpoint_strata"]) == 550
    assert all(v["primary"]["complete"] and v["secondary"]["complete"] for v in longitudinal["by_condition"].values())
    assert runtime["new_regression_tests_passed"] == 13 and runtime["existing_tests_passed"] == 7
    assert runtime["live_test"]["sessions_finalized"] == ["finalized", "finalized"]
    assert all(runtime["live_test"]["recall"].values())
    assert backend["status"] == "passed" and backend["exitCode"] == 0
    assert all(backend[k] for k in ("realPatientResponseVerified", "backendPassed", "finalizationVerified", "databaseCleanupVerified"))
    for path, expected in read("runtime/agent-memory-fix-sha256.json").items():
        assert hashlib.sha256((TESTED_AGENT_SNAPSHOT / path).read_bytes()).hexdigest() == expected, path
    rate_amendment = read("rate-limit-amendment.json") if (OUT / "rate-limit-amendment.json").exists() else None
    if rate_amendment:
        assert rate_amendment["id"] == "vertex-shared-rate-limit-2026-09-27"
        amendment_hash = hashlib.sha256((OUT / "rate-limit-amendment.json").read_bytes()).hexdigest()
        for validation in (phq["rate_limit_validation"], longitudinal["rate_limit_validation"], audit["rate_limit_validation"]):
            assert validation["id"] == rate_amendment["id"] and validation["amendment_sha256"] == amendment_hash
            assert validation["checkpoint_manifest_sha256"] == "606246a0bc0e5478d462fa362ce069c25a5d436315ab122ebcc4d55373a73660"
            assert validation["overlay_validation"]["integrity_valid"]
            assert not validation["overlay_validation"]["validation_errors"]
            assert validation["overlay_validation"]["verified_checkpoint_files"] == 375
            assert validation["overlay_validation"]["runtime_files_verified"] == len(rate_amendment["runtime_files_sha256"])
            retained = validation["phq_checkpoint_validation"]
            assert retained["verified_archived_files"] == 224 and retained["completed_runs_retained"] == 68
            assert retained["identical_completed_files"] == 204 and retained["partial_answers_retained"] == 12
            assert validation["longitudinal_checkpoint_files"] == 151
            assert validation["longitudinal_checkpoint_identical_to_user_pause"] and validation["longitudinal_retention_verified"]
            assert validation["new_longitudinal_prompt_exception"] is False
            transport = validation["transport_sidecar_validation"]
            assert transport["required_accepted_responses"] == transport["verified_accepted_responses"]
        rate_implementation = read("runtime/rate-limit-implementation.json")
        assert rate_implementation["total_tests_passed"] == 45
        assert rate_amendment["runtime_files_sha256"]["runtime/rate-limit-source/vertex_rate_limit.py"] == rate_implementation["source_sha256"]["agent/core/vertex_rate_limit.py"]
        overlay_preflight = read("runtime/rate-limit-overlay-preflight.json")
        assert overlay_preflight["amendment_id"] == rate_amendment["id"]
        assert overlay_preflight["amendment_sha256"] == amendment_hash == "ec9eafc50a841cfc2897f4b4d01e893b7c0574d732ec4b43d65aa8238c1569f1"
        assert overlay_preflight["tests_passed"] == 18
        assert overlay_preflight["phq_tests"] == overlay_preflight["longitudinal_tests"] == 9
        assert overlay_preflight["inference_started"] is False
        assert all(overlay_preflight[key] is True for key in (
            "original_max_tokens_acceptance_preserved", "generation_arguments_preserved",
            "real_error_outcome_archived_before_pause", "no_api_attempt_logged_for_local_capacity_stop",
            "accepted_in_flight_success_preserved", "patient_fallback_on_capacity_stop_prevented"))

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
    lines += ["", "### PHQ-9 per composizione dell'endpoint", "",
              "La media principale comprende l'intero protocollo continuato. La tabella seguente raggruppa le somministrazioni complete secondo l'endpoint degli item accettati; una somministrazione mista conserva gli item regionali prima della ripresa. Non si calcola un punteggio PHQ-9 a partire da un sottoinsieme di item e non si attribuiscono causalmente le differenze all'endpoint.", "",
              "| Paziente | Endpoint degli item | Run completi | Media ± DS | Run ≥10 |",
              "|---|---|---:|---:|---:|"]
    for composition, group in phq["endpoint_statistics_for_complete_administrations"].items():
        for pid, name in names.items():
            row = group["profiles"].get(pid)
            if not row or not row["n"]:
                continue
            sd = f"{row['sample_sd']:.2f}" if row["sample_sd"] is not None else "non stimabile"
            lines.append(f"| {name} | {composition} | {row['n']} | {row['mean']:.2f} ± {sd} | {row['n_at_least_10']}/{row['n']} |")
    endpoint_counts = phq["accepted_item_endpoint_counts_complete_administrations"]
    lines += ["", "Item accettati per endpoint: " + "; ".join(f"`{region}`: {count}" for region, count in sorted(endpoint_counts.items())) + ". La composizione esatta di ogni run è riportata in `analysis/phq-runs.csv`."]
    daniel = phq["profiles"]["daniel_isherwood_001"]
    counts = phq["api_counts_for_complete_administrations"]
    lines += ["", f"Daniel raggiunge la soglia in **{daniel['n_at_least_10']}/20** somministrazioni. Il suo valore pubblicato di 10 è confermato dal JSON storico, ma non deve essere interpretato come separazione stabile garantita. Il PHQ-9 misura sintomi depressivi ([validazione originale](https://pmc.ncbi.nlm.nih.gov/articles/PMC1495268/)); Daniel è un profilo centrato sul binge eating e il manoscritto include anche il BES come controllo specifico.", "",
              "**Configurazione inviata dal codice:** Vertex AI, `gemini-2.5-pro`, endpoint iniziale `us-central1` e successiva continuazione su `global`, temperatura 0,1, limite iniziale 220 token, top-p 0,95, top-k richiesto 40, stop sequences archiviate, nessun seed impostato. Ogni item è indipendente e non attraversa il grafo o la memoria. Il contesto seleziona campi del profilo e tronca il caso clinico a 400 caratteri.", "",
              "La [scheda ufficiale del modello](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-pro), consultata il 27 settembre 2026, indica top-k 64 fisso. I log provano che il codice richiede 40; le risposte del servizio non attestano il top-k effettivamente applicato. Si distingue quindi la configurazione richiesta da quella interna al servizio. Questa osservazione non identifica la causa della differenza con il revisore e non modifica le richieste del protocollo congelato.", "",
              f"Le risposte provengono da {counts['api_attempts']} tentativi API, con {counts.get('failed_api_attempts', 0)} tentativi falliti archiviati. Gli ID delle {phq['unique_response_ids']} risposte restituite sono univoci. {counts.get('accepted_answers_without_STOP', 0)} risposte intere sono state accettate dal runner originale pur con un motivo di terminazione diverso da STOP: la replica conserva quel comportamento e lo segnala, senza sostituire le risposte.", "",
              "I primi tre run per paziente sono quelli già completati nell'audit iniziale. I run 04 allora interrotti, privi di registrazione API completa, sono conservati nel vecchio dossier ma esclusi e furono ricominciati all'avvio della campagna regionale secondo una decisione documentata prima dei nuovi risultati. Dopo l'interruzione per capacità, tutti i 68 run regionali completi e gli item già salvati dei run parziali sono stati riutilizzati nella continuazione su `global`. I risultati regionali non sono contati come repliche aggiuntive.", "",
              "**Perché il revisore non replica:** la causa esatta non è identificabile senza il suo codice e gli item grezzi. I 50 prompt ricostruiti dal codice storico coincidono con quelli attuali; gli output storici non attestano modello/versione, seed e configurazione completa. Una reimplementazione con un modello o un contesto diverso non è lo stesso esperimento. La nuova replica rende verificabile la configurazione attuale, senza attribuirla retroattivamente ai dati storici.", "",
              "Fonti: [validazione PHQ](analysis/phq-validation.json), [risposte per item](analysis/phq-items.csv), [prompt esatti](analysis/phq-exact-prompts.json), [audit storico](../reviewer-audit-2026-09-27/REPORT.md).", "",
              "## 2. Continuità su undici sessioni", "",
              "La versione corretta del sistema viene confrontata con una baseline narrativa che riceve lo stesso YAML clinico completo e tutta la propria storia. Ogni sessione riparte in un processo nuovo; il sistema completo ricarica lo stato e la memoria da disco. Testi del terapeuta, profili, parametri iniziali di generazione e criteri sono fissati prima dei risultati.", "",
              "| Condizione | Prove primarie finali | Prove secondarie | Risposte tecnicamente non valide |",
              "|---|---:|---:|---:|"]
    for condition, label in [("full", "Sistema completo"), ("baseline", "Baseline narrativa + storia integrale")]:
        row = longitudinal["by_condition"][condition]
        lines.append(f"| {label} | {metric(row['primary'])} | {metric(row['secondary'])} | {row['runtime_invalid_responses']}/275 |")
    full_primary = longitudinal["by_condition"]["full"]["primary"]["correct"]
    baseline_primary = longitudinal["by_condition"]["baseline"]["primary"]["correct"]
    if full_primary > baseline_primary:
        interpretation = "In questo protocollo il sistema completo ottiene più richiami primari corretti della baseline. È un vantaggio descrittivo di queste cinque coppie di percorsi; il disegno non isola l'effetto della sola struttura né autorizza una generalizzazione clinica."
    elif full_primary < baseline_primary:
        interpretation = "In questo protocollo la baseline ottiene più richiami primari corretti del sistema completo. Il nuovo esperimento non sostiene una superiorità del sistema completo nella misura primaria di continuità. Il manoscritto deve riportare questo esito e circoscrivere il contributo architetturale alle proprietà effettivamente verificate."
    else:
        interpretation = "In questo protocollo le due condizioni ottengono lo stesso numero di richiami primari corretti. La misura primaria non mostra un vantaggio descrittivo del sistema completo; il contributo architetturale va distinto da una superiorità empirica non osservata."
    lines += ["", interpretation]
    lines += ["", "Le percentuali seguenti considerano soltanto le risposte tecnicamente valide, mantenendo nel denominatore anche i mancati ricordi. Sono descrittive: non indicano quale sarebbe stato il risultato dei turni rimasti senza risposta.", "",
              "| Condizione | Prove primarie su risposte valide | Prove secondarie su risposte valide |",
              "|---|---:|---:|"]
    for condition, label in [("full", "Sistema completo"), ("baseline", "Baseline narrativa + storia integrale")]:
        row = longitudinal["by_condition"][condition]
        lines.append(f"| {label} | {valid_metric(row['primary'])} | {valid_metric(row['secondary'])} |")
    if (OUT / "runtime/operational-events.jsonl").exists():
        lines += ["", "Durante una sequenza persistente di errori di capacità HTTP 429 sono stati sospesi e poi arrestati i processi regionali. Una diagnosi con lo stesso progetto e modello ha restituito 429 su `us-central1` e 200 su `global`. La campagna è stata proseguita sull'endpoint globale, conservando le 32 sessioni concluse, la sessione parziale e tutti gli esiti tecnici osservati. Le operazioni sono registrate in [eventi di esecuzione](runtime/operational-events.jsonl) e nell'[emendamento operativo](endpoint-amendment.json). Modello e input scientifici restano quelli congelati; endpoint e disponibilità del servizio sono limiti espliciti del confronto.", "",
                  "Le sessioni parziali riprendono dall'ultimo turno salvato. I tentativi falliti dei turni non conclusi restano nel registro; la ripresa può ricostruire diversamente lo stato intermedio non salvato. Il seed Python viene reinizializzato nel nuovo processo, perché il runner originario non salvava lo stato dell'RNG. Non si dichiara una riproduzione byte per byte del turno interrotto; le risposte già accettate sono invece preservate e verificate.", "",
                  "Dopo ulteriori errori del servizio, l'utente ha richiesto l'arresto e successivamente autorizzato la ripresa. Alla pausa erano conservati 68 PHQ completi, 32 sessioni complete e 165 turni complessivi. La ripresa documentata in [process-resumption.json](process-resumption.json) usa lo stesso modello ed endpoint globale, mantiene il checkpoint di 375 file e riduce a uno il numero iniziale di worker per campagna. Le due sessioni parziali conservano rispettivamente tre e due turni già salvati.", "",
                  "Anche la continuazione globale ha incontrato errori 429. Le pause e la riduzione temporanea della concorrenza sono annotate negli eventi operativi e non sostituiscono le risposte osservate. Le latenze includono indisponibilità e pause del processo e non costituiscono un benchmark del solo tempo di generazione. La [documentazione del servizio](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/resources/throughput-quota) descrive la capacità condivisa come possibile causa di 429; l'audit non ha potuto consultare le quote del progetto con l'account di servizio e non ne attribuisce una causa specifica non verificata."]
    if rate_amendment:
        lines += ["", "Una successiva ripresa introduce soltanto un livello esterno per regolare la frequenza delle richieste e le attese condivise dopo errori di capacità. L'[emendamento rate-limit](rate-limit-amendment.json) conserva lo snapshot scientifico, i prompt, i parametri e la regola originale di accettazione delle risposte, compresa quella PHQ per MAX_TOKENS. Il [checkpoint del secondo arresto](resume-stop-input-manifest-20260927T140335Z.json) tutela 375 file: 68 PHQ completi, 12 item parziali già accettati, 32 sessioni complete e 165 turni. Tutti i 151 hash longitudinali coincidono con il checkpoint precedente; non viene introdotta una nuova eccezione sui prompt.", "",
                  "La verifica della memoria resta ancorata ai quattro file dello snapshot `longitudinal-source` già sottoposto ai test, preservando i risultati originali. I successivi cambiamenti dell’Agent live non riscrivono questa prova. Il nuovo limiter ha 45 test offline superati, documentati in [rate-limit-implementation.json](runtime/rate-limit-implementation.json). Altri 18 test dell’[overlay congelato](runtime/rate-limit-overlay-preflight.json), nove per ciascun percorso, verificano la conservazione degli argomenti di generazione e dell’accettazione originale di MAX_TOKENS, l’archiviazione degli errori effettivi prima della pausa e la conservazione delle risposte già accettate. Il livello di trasporto usato è identificato separatamente mediante hash e registri operativi. Disponibilità, tentativi e latenza attraversano politiche operative diverse e non costituiscono un confronto con una sola politica di trasporto."]
    lines += ["", "### Risultati longitudinali per endpoint", "",
              "Gli strati seguenti attribuiscono ogni turno all'endpoint della sua esecuzione. Le risposte globali possono usare memoria e dialoghi regionali precedenti. L'assegnazione dell'endpoint dipende dal momento dell'interruzione, non è randomizzata e non permette di stimare un effetto dell'endpoint.", "",
              "| Endpoint | Condizione | Turni | Esiti tecnici non validi | Prove primarie | Prove secondarie |",
              "|---|---|---:|---:|---:|---:|"]
    for row in longitudinal["endpoint_strata"]:
        label = "Sistema completo" if row["condition"] == "full" else "Baseline"
        lines.append(f"| {row['region']} | {label} | {row['observed_responses']} | {row['runtime_invalid_responses']} | {observed_metric(row['primary'])} | {observed_metric(row['secondary'])} |")
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
              "1. Aggiungere protocollo esatto, modello osservato, parametri, assenza di seed, emendamento dell'endpoint e archivio per item della nuova replica; indicare quali metadati storici mancano.",
              "2. Ridimensionare la separazione PHQ basata sulla singola soglia e distinguere il controllo dei sintomi depressivi dalla coerenza di un profilo centrato sul binge eating.",
              "3. Inserire il nuovo confronto come verifica tecnica di continuità della versione corretta, riportandone anche fallimenti, limiti e risultato della baseline.",
              "4. Qualificare il corpus misstep come saturo e la precisione come interna a quel corpus; dichiarare che l'efficacia dell'accecamento non è stata misurata.", "",
              "Le modifiche software sono in Agent (provider, builder e due test) e App (due script di test); le patch sono in `runtime/`. Il manoscritto non è stato riscritto e non sono stati eseguiti commit. L'ambiente del test usa Python 3.12 e un overlay SciPy 1.16.3, documentati in [runtime-environment.json](runtime-environment.json).", ""]
    (OUT / "REPORT.md").write_text("\n".join(lines))
    print("Wrote", OUT / "REPORT.md")


if __name__ == "__main__":
    main()
