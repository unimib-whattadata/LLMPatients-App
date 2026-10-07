# Correzione della memoria e prova delle undici sessioni

## Stato osservato

- Stato: **stopped**; sessioni finalizzate **0/11**; scambi archiviati **2/55**.
- Domande di verifica osservate: **0/6**; valutate: **0**.
- La finalizzazione della memoria non è stata raggiunta.
- Richieste del provider: 6; risposte: 5; errori: 1.
- Costo nativo dichiarato: **USD 0.046165**.

Questa è una prova di regressione su Alex e sullo stesso copione della prova che aveva rilevato il difetto. È una sola traiettoria, senza repliche o baseline parallela; non è una stima indipendente di efficacia o superiorità.

## Correzione e verifiche offline

La chiusura promuove solo i fatti che passano i controlli esistenti. Le proposte respinte e il testo originale dell'estrazione sono registrati separatamente. Le fonti originali restano recuperabili. API e registro espongono il consolidamento parziale; errori del servizio, risposte vuote e problemi di scrittura continuano a interrompere la chiusura.

86 test di produzione e 22 test del controllo d'integrazione sono passati offline. Il replay dell'estrazione che aveva fallito conserva 12 fatti validati e 3 respinti, con lo stesso prompt e senza chiamate al modello. La modalità rigorosa continua a rifiutare quel batch; i controlli di ammissione non sono stati allentati.

## Sessioni

| Sessione | Esito | Turni | Memoria | Fatti validati | Fatti respinti | Batch invalidi |
|---|---|---:|---|---:|---:|---:|
| 1 | stopped | 2 | not_finalized | — | — | — |

`partial` indica fatti respinti o errori di schema, non una sessione rimasta aperta. I fatti respinti non sono contati come fatti validati. La chiusura riuscita da sola non dimostra che le domande di memoria abbiano ricevuto risposte corrette.

## Arresto

La sessione 1 si è fermata con `IntegrationAbort`. Il provider ha restituito il codice **429** durante `generate_response`. I turni già accettati e le richieste native restano conservati; nessuna risposta è stata rigenerata per migliorare il punteggio.

Richieste dopo l'arresto: 0; richieste dopo il primo errore del provider: 0.

## Domande di verifica

Nessuna delle sei domande è stata raggiunta: non è disponibile un punteggio di continuità. Le domande non osservate non sono risposte errate.

## Modello, impostazioni e limiti

Gemini `google/gemini-2.5-pro`, OpenRouter. Risposte: temperatura 0,7, massimo 4096 token; classificazioni: 0,0/4096; memoria: 0,2/8192. Top-p 0,95, thinking budget 1024, nessun seed API. Chiamate seriali distanziate almeno 5 secondi; un solo recupero 4096→8192 per MAX_TOKENS. Nessun retry automatico di disponibilità. Parametri richiesti ed effettivi sono nei log nativi.

Il controllo chiama le route Python e il grafo; non avvia un server HTTP o la UI. Ogni sessione è un nuovo processo; il ripristino usa il ledger e la memoria persistita. I parametri di memoria e la barriera di attesa degli episodi sono gli override dichiarati in `integration/PROTOCOL.md`. Undici sessioni non equivalgono alla verifica di undici fasi cliniche.

## Dati e riproducibilità

- Protocollo/emendamento: `integration/PROTOCOL.md`, `AMENDMENT.md`.
- Codice e hash: `integration/source/`, `integration/manifest.json`, `analysis/runtime-correction.patch`.
- Copione/gold: `integration/scenario.json`, `integration/gold.json`.
- Prompt, risposte, errori e parametri: `integration/runtime/sessions/`.
- Memoria e ripristino: `integration/runtime/memory/`, `integration/runtime/runs/`.
- Valutazione dei probe: `integration/runtime/probe-review.json`, `analysis/probe-assessment.json` quando disponibile.
- Risultati e costi per stage: `analysis/results.json`.
- Test offline: `analysis/production-tests.log`, `integration/offline-test.log`.

Il confronto del componente e il fallimento della versione precedente restano immutati in `../memory-benchmark-2026-09-28/`; i loro risultati non sono attribuiti al runtime corretto senza un nuovo confronto.
