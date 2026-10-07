# Audit del punto 2 del revisore

Verifica svolta sui file locali di `/Users/marco/Sites/LLMPatients-App/evaluation/misstep` e sul manoscritto in `/Users/marco/Sites/LLMPatient---APPLICATION`. Commit App letto: `edde4b8ae92638d866662a055de7ca031a8bc3db`. Nessuna nuova chiamata LLM. Nessun manoscritto, workbook o risultato storico modificato. Nessun AGENTS.md trovato negli antenati o nelle sottocartelle pertinenti.

## Esito

I calcoli pubblicati sono riproducibili dagli archivi. La critica metodologica del revisore è fondata: il corpus è saturo di errori deliberati e la precisione misurata non dimostra la precisione su sessioni reali con errori radi. Il sospetto di riconoscimento delle condizioni da parte dei valutatori rimane un'ipotesi plausibile, non un fatto dimostrato.

## Esecuzioni effettuate

1. Import dinamico dello script `automatic_detector/compute_panel_b_metrics.py`, sostituzione della sola costante `OUTPUT_PATH` con `/tmp/llmpatient_panel_b_metrics_audit.csv`, chiamata di `main()`. Usato Python bundled `/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`. Esito: exit 0, tutte e cinque le righe di Panel B coincidono con le asserzioni del manoscritto.
2. `/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 /tmp/llmpatient_misstep_audit.py`. Ricalcolo indipendente delle matrici (non usa la funzione metriche dello script originale), κ, categorie, condizioni, rating e scansione metadata nei workbook. Il loader originale viene riutilizzato solo per leggere gli XLSX, riparando in memoria il namespace XML già noto. Esito: exit 0, `/tmp/llmpatient_misstep_audit.json`.
3. Validati tutti i 600 valori binari (Yes/No senza mancanti), le 300 battute terapeuta nei due workbook contro i file sorgente, 20 trascrizioni × 3 sessioni × 5 turni terapeuta, e tutti gli indici delle evidenze del detector (1–15).

L'import Python aveva creato il solo file `automatic_detector/__pycache__/compute_panel_b_metrics.cpython-312.pyc`; questo artefatto temporaneo è stato rimosso e lo script audit ora disattiva la scrittura di bytecode. Nessun altro file del repository è stato modificato dall'audit.

## Corpus e accecamento

- 5 pazienti × 2 generatori (full/prompt-only) × 2 script (appropriate/seeded) = 20 trascrizioni, 300 turni terapeuta.
- Esattamente 150/300 turni sono positivi per costruzione. Le dieci trascrizioni seeded contengono 15/15 turni positivi.
- Solo **2 sequenze di testo terapeuta** e **30 battute distinte**: la medesima sequenza di 15 errori è ripetuta dieci volte, con risposte paziente diverse. Questo restringe la varietà degli errori testati.
- Nei workbook completati l'ordine rimane T001…T020: full T001–T010, baseline T011–T020; appropriate negli ID dispari e seeded negli ID pari. Il builder usa questo stesso ordine, senza shuffle.
- Il builder elimina header e system metadata. Scansione effettiva di tutte le celle dei due workbook: nessuna occorrenza di `full_llmpatients`, `prompt_only_baseline`, `BLINDED_A/B/C/D`, `seeded_misstep`, `gpt-`, `gemini`, `vertex_ai` o `_System metadata:`.
- Le istruzioni vietano di inferire o registrare il sistema generatore e di usare la chiave delle condizioni. Non viene raccolta una stima del rater sulla condizione; nessun test empirico di efficacia dell'accecamento trovato. La rimozione delle etichette è verificata, l'assenza di riconoscimento dal contenuto non lo è.

Riferimenti: `main.tex:761`, `main.tex:763`; `supplementary_material.tex:161`; `transcripts/internal_transcript_condition_key.csv:2`; `clinician_evaluation/build_blinded_clinician_evaluation_workbook.mjs:11`, `:55`, `:195`, `:403`; `clinician_evaluation/verify_blinded_clinician_evaluation_workbook.mjs:126`.

## Ricalcolo dei risultati

### Panel A e accordo

| Riferimento script | TP | FP | TN | FN | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|
| Rater 1 | 150 | 72 | 78 | 0 | .676 | 1.000 |
| Rater 2 | 150 | 5 | 145 | 0 | .968 | 1.000 |
| Either | 150 | 74 | 76 | 0 | .670 | 1.000 |
| Both | 150 | 3 | 147 | 0 | .980 | 1.000 |

377 Yes e 223 No complessivi confermati. Tabella 2×2 tra raters: entrambi Yes=153; solo Rater1=69; solo Rater2=2; entrambi No=76. Accordo 76.333%, κ=.518970, categorie coincidenti 128/153=83.660%: tutti i valori pubblicati tornano.

**Soli script appropriate:** entrambi Yes=3; solo Rater1=69; solo Rater2=2; entrambi No=76. Accordo 79/150=52.667%, κ=.0166205. Tutti i 71 disaccordi binari appartengono a questa metà. Nei seeded l'accordo è 100%; κ è indefinito, perché entrambi danno sempre Yes. Questo conferma la localizzazione del disaccordo osservata dal revisore; non dimostra da solo la sua ipotesi causale sull'accecamento.

Le macro-categorie aggregate coincidono: struttura136, empatia123, interpretazione44, confini40, sicurezza34. Le confidences non sono complete: Rater2 ha 55 confidence mancanti nei 150 seeded; ciò non incide sui conteggi binari ma impedisce di dire che ogni errore sia stato segnato ad alta confidenza.

Riferimenti: `main.tex:786`, `:800`, `:822`; entrambi i workbook, fogli T001–T020, `E16:E30` (Yes/No), `F16:F30` (categoria), `G16:G30` (confidence). Lettura delle etichette documentata in `automatic_detector/compute_panel_b_metrics.py:80`.

### Panel B

| Riferimento | TP | FP | TN | FN | Precision | Recall | F1 | Accuracy |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Rater1 | 159 | 34 | 44 | 63 | .824 | .716 | .766 | .677 |
| Rater2 | 134 | 59 | 86 | 21 | .694 | .865 | .770 | .733 |
| Either | 161 | 32 | 44 | 63 | .834 | .719 | .772 | .683 |
| Both | 132 | 61 | 86 | 21 | .684 | .863 | .763 | .727 |
| Script | 131 | 62 | 88 | 19 | .679 | .873 | .764 | .730 |

193 turni flagged. Nei 150 appropriate, 62 flagged=41.333%; 30 sono Yes per almeno un clinico, 1 per entrambi. Sono conteggi contro referenze non adjudicate: chiamarli tutti errori reali del detector sarebbe eccessivo.

Gli output archiviati riportano `gemini-3.1-pro-preview`, detector `step-missteps-v1`, timestamp 2026-06-25 17:50–18:06 UTC. I pazienti del corpus erano generati con `gemini-2.5-pro`. Il codice attuale del detector usa temperatura 0 e restituisce categorie/evidenze. I flag a livello turno sono derivati da tali evidenze e non costituiscono predizioni binarie native; il manoscritto lo dichiara.

Il runner chiama il detector una volta per transcript set, assegnando `stepId:1` a tutti i messaggi e `stepNumber:1` alla richiesta; non conserva nel prompt le vere tre fasi/sessioni. Questo può influenzare omissioni/struttura e va considerato nella riproduzione, senza attribuirgli automaticamente tutti i falsi positivi.

Riferimenti: `main.tex:788`, `:811`, `:844`, `:846`; `automatic_detector/misstep_corpus_app_results.json:7`; `automatic_detector/evaluate-misstep-corpus.ts:85`, `:94`, `:222`, `:229`; `src/server/services/misstep-evaluator.ts:930`, `:947`, `:1336`.

## Prevalenza e precisione

Sui riferimenti script sensibilità=131/150=.87333, specificità=88/150=.58667. Applicando puramente a titolo illustrativo `PPV = sensitivity*p / (sensitivity*p + (1-specificity)*(1-p))`:

| Prevalenza ipotetica p | PPV calcolato |
|---:|---:|
| 50% | 67.88% |
| 20% | 34.56% |
| 10% | 19.01% |
| 5% | 10.01% |

Questa è una **analisi matematica condizionale**, non una stima misurata su studenti. Assume sensibilità e specificità invariate pur cambiando popolazione e distribuzione del contesto; l'assunto non è testato. Mostra perché la precisione .68–.83 non è trasferibile direttamente a una base rate realistica. Non prova quale sia la vera prevalenza negli studenti né quale sarebbe la precisione effettiva.

Il manoscritto presenta già l'analisi come esplorativa e human-in-the-loop (`main.tex:759`, `:877`), e dichiara esplicitamente il corpus saturo (`:761`). La correzione necessaria riguarda soprattutto la validità esterna: descrivere la tabella come sensibilità/discriminazione su copioni artificiali saturi e limitare i claim di precisione a quel dataset. La matematica della tabella non richiede correzioni.

## Full versus prompt-only: dati esistenti ma non prova di superiorità

I due workbook contengono 6 rating globali completi per tutte le 20 trascrizioni, compresa la continuità in `B7` (definizione in `A7`). Media continuità:

| Rater | Full (10 trascrizioni) | Prompt-only (10) |
|---|---:|---:|
| 1 | 4.6 | 4.4 |
| 2 | 5.0 | 5.0 |

Il confronto quantitativo è ricostruibile dai dati, ma non è analizzato in Section 4: `main.tex:761` dice esplicitamente che le condizioni sono pooled e non comparate. Tre mini-sessioni da cinque scambi non testano l'arco di 11 sessioni. I rating hanno un forte effetto soffitto, specie Rater2; queste medie descrittive non dimostrano un vantaggio causale della memoria strutturata. Va inoltre verificata altrove la parità di contenuti e configurazione fra le due condizioni.

Riferimenti: `clinician_evaluation/build_blinded_clinician_evaluation_workbook.mjs:25`; `supplementary_material.tex:165`, `:177`; entrambi workbook, fogli T001–T020, `A6:B11`.

## Limiti della verifica

- Riprodotti i calcoli da annotazioni e output archiviati. Non rigenerati i 20 transcript e non rilanciato il detector remoto; questo audit non misura la stabilità odierna del modello.
- Nessuna osservazione diretta della procedura seguita dai clinici; la verifica riguarda i materiali conservati.
- Assenza di adjudication, dati studenti con errori radi, test di riconoscimento delle condizioni e prova della continuità su 11 sessioni nel pacchetto esaminato.

Azioni pertinenti: mantenere risultati come audit su corpus saturo; riportare la robustezza separata delle due metà; progettare corpus con errori sparsi, copioni vari, ordine randomizzato e misura esplicita dell'accecamento per validare precisione trasferibile.

## Approfondimento: generatore storico e correttezza della baseline

Recuperato il generatore **dalla cronologia Git del repository del manoscritto**. Non è nel working tree corrente di App o Agent:

- Origine: `/Users/marco/Sites/LLMPatient---APPLICATION`, commit `402edea570ae5f3f9e69af526a4ad0c4278c35a2`, percorso `evaluation/generate_real_transcripts.py`.
- Introdotto da `0f9232a` il 18 maggio 2026, modificato da `402edea` il 15 giugno, cancellato da `b6a02c2` il 16 giugno.
- Snapshot di sola lettura recuperato: `/tmp/llmpatient_generate_real_transcripts_402edea.py`.
- **Confronto binario effettuato:** tutti e 20 gli attuali `App/evaluation/misstep/transcripts/transcript_Txxx.md` sono identici ai corrispondenti `evaluation/transcripts/Txxx.md` del commit `402edea`. Il codice e i dati coesistono quindi nello stesso archivio storico, pur non essendoci un manifest immutabile della configurazione effettivamente attiva durante ogni esecuzione.

### Contenuto clinico

`build_baseline_case_narrative`, snapshot:231, legge il medesimo file YAML paziente di Agent e lo appiattisce in una narrazione con nome, età/genere, breve descrizione, diagnosi, psychologicalProfile, clinicalCase, farmaci, obiettivi, famiglia, lavoro/casa, relazioni, trattamenti e comportamento osservato.

**Non serializza l'intero profilo.** Omette `clinical.details.clinicalFunctioning` (assi e funzionamento clinico), `clinical.details.medicalAndPhysicalHistory`, gran parte di `demographicAndSocioculturalInformation` (conserva età/genere da `profile`) e `clinical.emotionTraits`. Alcuni fatti possono ricorrere anche nella narrazione di base, quindi l'omissione della sezione non implica necessariamente la perdita di ogni fatto in essa contenuto. Tuttavia la parità del contenuto clinico non è garantita e non è verificata. Controllata la selezione su tutti e cinque gli YAML attuali: le sezioni omesse esistono.

Il full carica `clinical.details` e `clinical.emotionTraits` completi (`Agent/agent/core/patient_profile.py:650`), e il prompt può attingere alle sezioni omesse dalla baseline (`Agent/agent/core/prompt_builder.py:113`, `:209`). Non equivale quindi a una semplice modifica della forma di rappresentazione di identici dati clinici.

### Memoria fra le sessioni: differenza dimostrata dal codice e da esecuzione offline

- Baseline, snapshot:414: `session_history=[]` viene inizializzata **dentro il loop delle sessioni**. Il prompt, snapshot:314, specifica che il paziente conosce solo la narrazione e i turni della stessa sessione. Non vengono passate trascrizioni o riepiloghi delle sessioni precedenti.
- Full, snapshot:358: mantiene lo stesso `therapist_id` nelle tre sessioni; usa session_id separati; dopo ogni sessione invoca `/session-end` per la pipeline di consolidamento. La baseline non compie questo passaggio.
- Eseguito `python3 -B /tmp/llmpatient_baseline_audit.py`: selezionate via AST soltanto le funzioni pure di costruzione prompt e loop baseline, con LLM sostituito da stub locale e messaggi sentinella. Nessuna rete o generazione reale. Nei 15 prompt i marcatori terapeuta visibili sono **1,2,3,4,5 → 1,2,3,4,5 → 1,2,3,4,5**; nessun marcatore di sessioni precedenti compare nei prompt delle sessioni 2 e 3. Questo verifica il reset in esecuzione, non soltanto per lettura statica.

Il test è stato eseguito con Python di sistema perché il Python bundled non dispone di PyYAML e Agent non ha `.venv/bin/python`. Risultati: `/tmp/llmpatient_baseline_audit.json`.

### Modello e decoding

Tutti e 20 gli header riportano `vertex_ai / gemini-2.5-pro`. Il generatore baseline usa `create_llm_runner()` di Agent, configurato dall'ambiente, e chiama `llm.generate(..., temperature=0.7, ...)` (snapshot:345). Nella versione finale il budget minimo è 4096 e sono previsti fino a tre tentativi per risposte corte/incomplete; la versione originale aveva `max_tokens=420`. Le modifiche di budget non toccano né la selezione dei campi né il reset della memoria.

**Limite di provenance:** gli header full vengono scritti con il nome del modello letto dal processo generatore locale (`load_agent_llm`, snapshot:501), mentre la generazione full è svolta dal server HTTP. Lo script non legge né asserisce la configurazione del server; nome uguale negli header prova l'intenzione/configurazione dichiarata, non una verifica indipendente di perfetta uguaglianza del backend remoto, temperatura e decoding in quei due giorni di esecuzione. Full e baseline sono inoltre stati prodotti rispettivamente il 18 maggio e l'8 giugno.

### Risposta al requisito del revisore

Il confronto esistente è una baseline narrativa **con profilo ridotto e amnesia fra le sessioni**, rispetto al sistema completo. Non soddisfa il confronto rigoroso «flat narrative carrying the same clinical content» con storia conversazionale equivalente. È utilizzabile come confronto esplorativo tra due configurazioni, ma non isola il contributo della struttura o della memoria. Per il confronto richiesto occorre mantenere esplicitamente uguali contenuti clinici, modello/decoding, input terapeuta e informazione conversazionale accessibile, variando solo l'organizzazione dei dati o la strategia di memoria; il test su 11 sessioni rimane da effettuare.
