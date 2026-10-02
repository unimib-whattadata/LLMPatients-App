# Replica e test del revisore — 27 settembre 2026

## Stato

Campagna **in corso**. Questo dossier continua l'audit precedente, conservato in
`../reviewer-audit-2026-09-27/`. Non confondere risultati parziali con campagna conclusa.

Obiettivi autorizzati:

1. Correggere e verificare il troncamento della memoria: **completato**, 20 test
   software e una chiusura/riapertura reale in processi diversi.
2. Completare 20 PHQ-9 per ciascuno dei cinque profili: **in corso**, 100
   somministrazioni previste, 1.000 risposte individuali inclusi gli item funzionali.
3. Confrontare cinque percorsi di 11 sessioni per ciascuna delle due condizioni:
   **in corso**, 110 sessioni e 550 risposte previste. Baseline narrativa completa
   con tutta la storia, sistema completo con la propria memoria persistente.
4. Ricalcolare e qualificare l'evidenza misstep sul corpus saturo: **completato**.
   Il test backend reale App–Agent–detector è passato; non costituisce una nuova
   stima di precisione clinica.

## Evidenze e riproduzione

- `phq-source/`: codice e dati congelati **prima** della correzione della memoria.
  I primi tre run per paziente provengono, senza alterazioni, dall'audit iniziale.
  I vecchi run 04 interrotti e privi di log API completi rimangono nel vecchio
  dossier e sono esclusi dalla continuazione.
- `phq/`: ogni run completo include item, punteggio, metadati e tentativi API.
  Dal run 04 i tentativi sono salvati incrementalmente in JSONL.
- `phq-campaign-manifest.json`, `phq-campaign-status.json`, `phq-summary.json`:
  parametri, stato del processo e conteggi intermedi.
- `longitudinal-source/`: codice corretto congelato prima dei percorsi.
- `longitudinal/protocol.md`, `scenarios.json`, `verify_scenarios.py`,
  `manifest.json`: protocollo e criteri fissati prima dei risultati. Trenta
  asserzioni primarie per condizione, valutate alla sessione 11.
- `longitudinal/results/`: trascrizioni, prompt, risposte grezze, memorie,
  ripristini e monitoraggio del processo. Ogni sessione usa un processo nuovo.
- `runtime/`: diagnosi del difetto, patch, regressioni e integrazione App reale.
- `runtime-environment.json`: interprete, versioni dei pacchetti e revisione
  locale del modello di embedding. I percorsi delle credenziali sono riferimenti
  all'ambiente originale; le credenziali non sono incluse nel dossier.

Gli script sono sotto `scripts/`. L'interprete usato è Python 3.12 bundled di
Codex, con i pacchetti del `.venv` Agent e, per il grafo, un overlay SciPy 1.16.3.
SciPy 1.15.3 non si carica sul sistema macOS di questa verifica. Questo adattamento
dell'ambiente va dichiarato per la riproduzione.

Comandi di esecuzione usati dalla radice del repository del paper:

```sh
PYTHONPATH=/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages \
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
outputs/reviewer-tests-2026-09-27/scripts/complete_phq9.py --workers 2

PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages \
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
outputs/reviewer-tests-2026-09-27/scripts/run_longitudinal.py --workers 2
```

I runner riprendono i dati già completi senza rigenerarli. Un conflitto fra log
API, ledger Agent e trascrizione dopo un'interruzione richiede riconciliazione;
non viene selezionata automaticamente una nuova risposta.

## Analisi e completamento

`scripts/await_campaigns.py` osserva i processi già avviati e lancia le analisi
rigorose quando ciascuna campagna dichiara il completamento. Non effettua
chiamate al modello e non riavvia gli esperimenti. Stato e comandi eseguiti
sono registrati in `completion-observer.json`; i log delle analisi sono in
`analysis/*-strict.log`.

I controlli finali richiedono tutte le 100 somministrazioni, 1.000 risposte agli
item, 110 sessioni e 550 risposte longitudinali. `build_final_report.py` genera
`REPORT.md` solo dopo il superamento di questi controlli e delle verifiche
runtime. Il rapporto generato richiede comunque una revisione dei dati e delle
conclusioni prima di dichiarare concluso il lavoro.

Le analisi intermedie con `--allow-partial` rimangono esplicitamente incomplete.
`analysis/pathway-scope.md` chiarisce il ruolo delle fasi didattiche nell'App e
il perimetro effettivo del confronto di continuità.

## Limiti stabiliti prima dei risultati

- La configurazione PHQ attuale è verificabile; quella storica del manoscritto
  e quella del revisore non sono completamente ricostruibili dai materiali
  disponibili. Nessun seed del provider viene inventato.
- Cinque coppie di percorsi costituiscono un confronto tecnico descrittivo,
  non una validazione clinica, una stima su studenti o una prova causale isolata
  della struttura del profilo. La baseline ha storia integrale; il sistema
  completo seleziona e comprime il contesto secondo la propria implementazione.
- I non-match lessicali non vengono chiamati automaticamente contraddizioni.
- Gli errori del servizio, le risposte di fallback e le prove fallite rimangono
  archiviati e visibili. I rifiuti o la mancata memoria non vengono riscritti.

## Modifiche software

Agent: `agent/core/llm_provider_vertex.py`, `agent/core/langgraph_builder.py`,
`agent/test_vertex_generation.py`, `agent/test_session_memory.py`.

App: `scripts/test-backend.ts`, `scripts/backend-scenario.ts`.

Patch revisionabili in `runtime/`. Nessun commit o modifica del manoscritto è
stato eseguito; le modifiche preesistenti dei progetti sono state preservate.
