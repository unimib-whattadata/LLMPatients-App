# Continuità nelle undici sessioni: ripresa del test corretto

Stato: **stopped**. Sessioni finalizzate: **5/11**. Scambi conservati: **26/55**.

Le prime due risposte provengono dal checkpoint precedente e non sono state rigenerate. La classificazione del terzo turno, non consolidata prima dell'errore, è stata ripetuta; la richiesta precedente e il suo costo restano nel registro. La copia dei log è contata una sola volta.

## Risultati

| Sessione | Stato | Scambi | Memoria | Fatti validati | Respinti | Batch invalidi |
|---|---|---:|---|---:|---:|---:|
| 1 | completed | 5 | partial | 11 | 1 | 0 |
| 2 | completed | 5 | partial | 27 | 1 | 0 |
| 3 | completed | 5 | partial | 18 | 7 | 0 |
| 4 | completed | 5 | partial | 23 | 2 | 0 |
| 5 | completed | 5 | partial | 21 | 1 | 0 |
| 6 | stopped | 1 | non finalizzata | — | — | — |

`partial` indica che alcune proposte di memoria sono state respinte o non erano leggibili: restano archiviati i fatti validati e le fonti originali. Non significa che tutte le informazioni siano state ricordate correttamente.

Domande di verifica raggiunte: **0/6**; valutate: **0**.

Non è ancora disponibile un punteggio di continuità. I probe non osservati non sono errori del modello.

## Chiamate e arresti

- Eventi nativi cumulativi: `{'request': 75, 'response': 74, 'error': 1}`.
- Eventi nativi di questa ripresa: `{'request': 69, 'response': 69}`.
- Costo dichiarato delle risposte: **USD 0.960561**; costo dichiarato degli errori: USD 0.000000 (0 errori privi di costo dichiarato).
- Completamenti non validi in questa ripresa: **1**; costo dichiarato USD 0.004338, già incluso nel costo delle risposte.
- Richieste dopo il primo nuovo arresto: **0**.

La sessione 6 si è fermata per completamento privo di contenuto utilizzabile, con finish reason `['STOP']`, nella fase `classify_topic_and_emotion`. I dati già prodotti sono conservati. Nessun tentativo automatico dopo il nuovo errore.

## Metodo e limiti

OpenRouter `google/gemini-2.5-pro`. Temperature: paziente 0,7; classificazione 0; memoria 0,2. Budget di output: 4096/4096/8192; top-p 0,95; thinking budget 1024; nessun seed API. Il top-k richiesto dall'adapter è omesso dal trasporto. Richieste seriali distanziate almeno cinque secondi; unico recupero consentito 4096→8192 per MAX_TOKENS. Prompt, parametri effettivi e risposte sono nei log nativi.

È una prova di regressione su un solo profilo simulato (Alex), con 11 sessioni di cinque scambi e sei probe già fissati. Le route Python, il grafo e la memoria persistente sono esercitati in processi nuovi; non viene provata la UI né un percorso di undici fasi cliniche. Il recupero della sessione interrotta usa un aggancio esplicito del controllo sperimentale: non dimostra il recupero automatico dell'API dopo un arresto. Il test non misura superiorità rispetto alla baseline e non sostituisce le repliche su più profili.

## Artefatti

- Protocollo e continuità: `PROTOCOL.md`, `lineage.json`, `manifest.json`.
- Test offline: `test_resume.py`, `offline-tests.log`, `offline-gate.json`.
- Risposte e log originali più continuazione: `runtime/sessions/`.
- Memoria e registro: `runtime/memory/`, `runtime/runs/`.
- Probe: `runtime/probe-review.json`; giudizi in `probe-assessment.json` quando disponibili.
- Contabilità: `results.json`; analisi riproducibile con `summarize.py`.
- Implementazione congelata: `../integration/source/`, `../integration/manifest.json`.
- Archivio del primo arresto, immutato: `../integration/runtime/`.

