# Continuità nelle undici sessioni: ripresa del test corretto

Stato: **stopped**. Sessioni finalizzate: **10/11**. Scambi conservati: **51/55**.

I primi 40 scambi provengono dal checkpoint precedente e non sono stati rigenerati. La classificazione fallita del primo turno della nona sessione è stata ripetuta; la richiesta precedente e il suo costo restano nel registro. La copia dei log è contata una sola volta.

## Risultati

| Sessione | Stato | Scambi | Memoria | Fatti validati | Respinti | Batch invalidi |
|---|---|---:|---|---:|---:|---:|
| 1 | completed | 5 | partial | 11 | 1 | 0 |
| 2 | completed | 5 | partial | 27 | 1 | 0 |
| 3 | completed | 5 | partial | 18 | 7 | 0 |
| 4 | completed | 5 | partial | 23 | 2 | 0 |
| 5 | completed | 5 | partial | 21 | 1 | 0 |
| 6 | completed | 5 | partial | 18 | 3 | 0 |
| 7 | completed | 5 | partial | 26 | 4 | 0 |
| 8 | completed | 5 | partial | 18 | 1 | 0 |
| 9 | completed | 5 | partial | 25 | 4 | 0 |
| 10 | completed | 5 | partial | 18 | 2 | 0 |
| 11 | stopped | 1 | non finalizzata | — | — | — |

`partial` indica che alcune proposte di memoria sono state respinte o non erano leggibili: restano archiviati i fatti validati e le fonti originali. Non significa che tutte le informazioni siano state ricordate correttamente.

Domande di verifica raggiunte: **2/6**; valutate: **2**.

**1 scambio archiviato è stato alterato dal filtro dell'input** (s11t01). Il suo esito rimane nei dati; non è una somministrazione integra della domanda di memoria.

| Domanda | Esito | Motivazione |
|---|---|---|
| s10t01 | correct | La risposta riporta Alex Carter e trenta anni, come nel profilo congelato. |
| s11t01 | incorrect | La domanda è stata sostituita dal filtro: call è stato riconosciuto dentro recall. La risposta non contiene il titolo. Fallimento del percorso applicativo; richiamo della memoria non valutabile in questo turno. |

Valutazione semantica di Codex secondo il gold fissato prima delle inferenze; non una valutazione clinica indipendente.

## Chiamate e arresti

- Eventi nativi cumulativi: `{'request': 146, 'response': 144, 'error': 2}`.
- Eventi nativi di questa ripresa: `{'request': 30, 'response': 30}`.
- Costo dichiarato delle risposte: **USD 1.901493**; costo dichiarato degli errori: USD 0.000000 (0 errori privi di costo dichiarato).
- Completamenti non validi in questa ripresa: **0**; costo dichiarato USD 0.000000, già incluso nel costo delle risposte.
- Richieste dopo il primo nuovo arresto: **0**.

La sessione 11 si è fermata per falso positivo del filtro dell'input: `call` è stato rilevato dentro `recall`, nella fase `sanitize_user_input`. I dati già prodotti sono conservati. Richieste dopo l'arresto di questo tentativo: 0.

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
- Archivio precedente immutato: `../resume-02/runtime/`; primo arresto in `../integration/runtime/`.

