# Ripresa dopo la ricarica del credito — 30 settembre 2026

## Material Passport

- Origin Skill: experiment-agent
- Origin Mode: run
- Origin Date: 2026-09-30
- Verification Status: UNVERIFIED — il confronto scientifico non è ancora completo;
  i controlli del checkpoint e del recupero sono documentati separatamente.
- Version Label: memory_comparison_resume07
- Materiale: dialoghi di pazienti simulati, richieste ed esiti del servizio.

## Arresto e autorizzazione

Il controller `resume-06` si è fermato il 30 settembre alle 04:09:08
Europe/Rome, dopo l'errore HTTP 402 delle 04:08:57. OpenRouter ha indicato che
la richiesta avrebbe superato il credito disponibile considerando anche le
richieste in corso, con `Retry-After: 120`. L'errore riguarda la risposta al
quinto scambio dell'esecuzione 290. Non contiene una risposta visibile del
paziente e non è stato ritentato automaticamente.

Dopo questa segnalazione, l'utente ha comunicato «Ho aggiunto crediti». La
ripresa continua l'esperimento già autorizzato dal suo punto di arresto. La
disponibilità effettiva del servizio viene verificata dalla richiesta pendente;
non viene eseguita una generazione esplorativa separata.

## Checkpoint

- **289 esecuzioni di sessione concluse e 1.449 scambi salvati**.
- **2.788 richieste HTTP, 2.755 risposte e 33 errori di servizio** archiviati.
- **20 probe** già raccolti; valutazione semantica ancora da completare.
- Dalla ripresa 06: 20 timeout 504 e 2 errori 429 recuperati, poi il 402 terminale.
- Run interrotto: `jason_smith_001__r01__flat_full_history`.
- Sessione della traiettoria: 10; domanda pendente: `s10t05`.
- Nella traiettoria: 49 scambi salvati, di cui quattro nella sessione corrente.
- Identificativo nativo dell'errore: `7555992b-469b-4b6f-8f0f-bde4e9881659`.

Il prompt pendente contiene tutti i 49 scambi precedenti della baseline:
61.615 byte UTF-8, SHA-256
`5344dc1f03deac04b4fea6d3a91ba36e827f62724e9847428f906f43b5500cde`.
La prova di identità prevista dal protocollo è `s10t01`, già salvata;
`s10t05` conserva la domanda originale di chiusura della sessione.

## Recupero

Il worker ricostruisce il prompt dalla storia salvata e ne verifica l'identità
con la richiesta fallita, insieme alle opzioni di generazione. Il generatore
nativo produce soltanto lo scambio mancante. Il cinquantesimo scambio viene
aggiunto al registro della traiettoria, poi la sessione della baseline viene
chiusa secondo le convenzioni originali. Dal blocco 291 il controller richiama
il worker originale. Rimangono da acquisire 201 scambi in questa ripresa,
incluso quello pendente.

Non viene applicato un aggiornamento emotivo alla baseline e non viene creata
memoria strutturata per questo braccio. I risultati già acquisiti, comprese
eventuali risposte parziali o sbagliate, sono conservati. Nessuna risposta viene
selezionata in base alla sua accuratezza.

## Impostazioni conservate

Modello `google/gemini-2.5-pro` su OpenRouter, prompt, configurazioni, calendario,
limiti e procedura di valutazione restano quelli congelati. Il confronto prevede
cinque profili, tre ripetizioni, due sistemi, undici sessioni e cinque scambi
per sessione: 330 esecuzioni, 1.650 scambi e 180 probe complessivi.

`timeout_retries.py` è una copia **byte per byte** del file congelato in
`resume-06`. Restano tre tentativi complessivi per prompt e configurazione:
timeout con attese 30/60 secondi, 429 con attese 60/120 secondi e rispetto di
`Retry-After` entro il limite di 300 secondi. Il canale globale conserva almeno
cinque secondi fra le richieste. Restano disabilitati i fallback di modello e
il riavvio automatico del job. Un ulteriore 402 conserva l'arresto.

## Evidenze della ripresa

- `checkpoint-audit.json`: riconciliazione del checkpoint e della richiesta 402.
- `snapshot/` e `snapshot-manifest.json`: copia del runtime prima della ripresa,
  inclusi l'errore e il ticket di richiesta rimasto aperto.
- `offline-results.json`: test mirati del recupero, controller e audit, con hash
  del codice verificato; nessuna chiamata live durante questi test.
- `native-preflight.json`: prova su copia temporanea con generatore nativo,
  risposta fittizia esplicita e rete vietata; controllo della conservazione dei
  49 scambi della traiettoria e del runtime originale.
- `manifest.json`: pacchetto congelato e collegamento al manifest di `resume-06`.
- `resolved-stop.json` e `resolution.json`: risoluzione del solo arresto noto,
  dopo il controllo di identità e sotto il lock del canale globale.
- `started.json` e `state.json`: avvio, processo e heartbeat del controller.
- `../../runtime/jason_smith_001__r01__flat_full_history/sessions/session_10/`:
  ricevuta, prova del recupero, prompt, risposte e tutti i tentativi nativi.

Il file originale di avvio e i precedenti pacchetti congelati sono conservati.
Le fixture offline non contribuiscono alle risposte o ai punteggi del modello.
