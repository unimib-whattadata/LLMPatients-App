# Continuità nelle undici sessioni: ripresa del test corretto

Stato: **completed**. Sessioni finalizzate: **11/11**. Scambi conservati: **55/55**.

I primi 51 scambi provengono dal checkpoint precedente e non sono stati rigenerati. Tra questi, s11t01 è stato alterato dal filtro: resta un esito negativo end-to-end, non valutabile come richiamo della memoria. Dopo la correzione della regex sono stati proseguiti soltanto i quattro turni pianificati rimanenti. Errori, risposte e costi precedenti restano archiviati e vengono contati una sola volta.

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
| 11 | completed | 5 | complete | 11 | 0 | 0 |

`partial` indica che alcune proposte di memoria sono state respinte o non erano leggibili: restano archiviati i fatti validati e le fonti originali. Non significa che tutte le informazioni siano state ricordate correttamente. In questa traiettoria tutti i batch hanno JSON valido: i dieci stati partial derivano da proposte respinte dai controlli. Le voci validate hanno superato controlli automatici su fonte, citazione e stato; non sono giudizi clinici indipendenti.

Domande di verifica raggiunte: **6/6**; valutate: **6**.

**1 scambio archiviato è stato alterato dal filtro dell'input** (s11t01). Il suo esito rimane nei dati; non è una somministrazione integra della domanda di memoria.

Secondo il criterio completo fissato prima del test: **4/6 risposte pienamente corrette**, **1 parziale**, **1 fallimento del filtro**. La domanda bloccata resta nel denominatore; non si attribuisce il suo errore alla memoria e non la si sostituisce con una risposta rigenerata.

| Domanda | Esito | Motivazione |
|---|---|---|
| s10t01 | correct | La risposta riporta Alex Carter e trenta anni, come nel profilo congelato. |
| s11t01 | incorrect | La domanda è stata sostituita dal filtro: call è stato riconosciuto dentro recall. La risposta non contiene il titolo. Fallimento del percorso applicativo; richiamo della memoria non valutabile in questo turno. |
| s11t02 | partial | Riporta Rina Holt e venerdì alle 18:20; distingue il precedente mercoledì e la proposta per sabato mattina. Omette 17:45 e 09:30, richiesti dal criterio congelato: risposta parziale, senza valori contraddittori. L’omissione non dimostra da sola che gli orari siano stati persi dalla memoria. |
| s11t03 | correct | Plover Annex è il luogo attuale; Larch Reading Room è quello sostituito. La domanda con recall è stata somministrata senza sanitizzazione. |
| s11t04 | correct | Folded Map è indicata come completata; Silver Button come attività telefonica ancora pianificata. |
| s11t05 | correct | Dichiara che il dettaglio non era stato stabilito e che fornire un cognome sarebbe una supposizione; non inventa cognomi né identifica il prenotante con Rina. |

Valutazione semantica di Codex secondo il gold fissato prima delle inferenze; non una valutazione clinica indipendente.

## Fonti conservate e correzione

Fonti grezze: **55**. Fonti eligibili nelle sessioni finalizzate: **54**. La prima risposta della sessione 11 resta con `usable=false`: non entra nei batch di fatti. Il suo scambio resta nella cronologia e può comparire nei riassunti narrativi.

La modifica aggiunge confini di parola alla regex `run|execute|call`, impedendo che `recall` attivi il controllo sui comandi. Il modulo corretto è caricato prima del grafo e identificato da hash. Il resto del runtime congelato è invariato. Sette test di produzione coprono anche tutti i 55 input; i test offline della continuazione verificano ripristino, conservazione, esclusione della fonte bloccata e arresto al nuovo errore del provider.

## Chiamate e arresti

- Eventi nativi cumulativi: `{'request': 158, 'response': 156, 'error': 2}`.
- Eventi nativi di questa ripresa: `{'request': 12, 'response': 12}`.
- Costo dichiarato delle risposte di questa ripresa: **USD 0.141630**.
- Costo dichiarato delle risposte: **USD 2.043122**; costo dichiarato degli errori: USD 0.000000 (0 errori privi di costo dichiarato).
- Completamenti non validi in questa ripresa: **0**; costo dichiarato USD 0.000000, già incluso nel costo delle risposte.
- Nuovi errori del provider: **0**; nuovi arresti: **0**. Richieste successive a un nuovo arresto: **0**.

## Metodo e limiti

OpenRouter `google/gemini-2.5-pro`. Temperature: paziente 0,7; classificazione 0; memoria 0,2. Budget di output: 4096/4096/8192; top-p 0,95; thinking budget 1024; nessun seed API. Il top-k richiesto dall'adapter è omesso dal trasporto. Richieste seriali distanziate almeno cinque secondi; unico recupero consentito 4096→8192 per MAX_TOKENS. Prompt, parametri effettivi e risposte sono nei log nativi.

È una prova di regressione su un solo profilo simulato (Alex), con 11 sessioni di cinque scambi e sei probe già fissati. Le route Python, il grafo e la memoria persistente sono esercitati in processi nuovi; non viene provata la UI né un percorso di undici fasi cliniche. Il recupero della sessione interrotta usa un aggancio esplicito del controllo sperimentale: non dimostra il recupero automatico dell'API dopo un arresto. Il codice del filtro è cambiato dopo il turno 51: questo percorso interrotto documenta una regressione tecnica, non una conferma indipendente con codice invariato. Il test non misura superiorità rispetto alla baseline e non sostituisce le repliche su più profili.

## Artefatti

- Protocollo e continuità: `PROTOCOL.md`, `lineage.json`, `manifest.json`.
- Test offline: `test_resume.py`, `offline-tests.log`, `offline-gate.json`.
- Risposte e log originali più continuazione: `runtime/sessions/`.
- Memoria e registro: `runtime/memory/`, `runtime/runs/`.
- Probe: `runtime/probe-review.json`; giudizi in `probe-assessment.json`.
- Contabilità: `results.json`; analisi riproducibile con `summarize.py`.
- Implementazione originale congelata: `../integration/source/`, `../integration/manifest.json`.
- Unica modifica del runtime: `source/agent/core/safety.py`; patch e test in `analysis/`.
- Archivio precedente immutato: `../resume-03/runtime/`; primo arresto in `../integration/runtime/`.

