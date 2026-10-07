# Gate offline della regressione

**22/22 test PASS**, 20,875 s. Il log è `offline-test.log`.

La sorgente è stata copiata solo dopo il segnale «codice pronto»; il manifest
verifica 35 file. SHA256 del manifest:
`87407dce61dba48700c91280afa2c7080181713ccd29ee10d18d72451ef72e8d`.

## Invarianti

- Scenario di 11×5 turni e gold con 6 probe identici byte per byte agli originali.
- Adapter, trasporto OpenRouter e trattamento degli errori in-band identici.
- Profilo Alex canonico identico; terapeuta distinto
  `memory_integration_fix_alex_20260928`.
- Tutti i 44 file precedenti controllati sono invariati.
- La nuova source corrisponde alla produzione; rispetto alla vecchia cambiano
  esclusivamente `factual_memory.py`, `langgraph_builder.py`, `api/app.py` e
  `utils/run_logger.py`.
- Nessuna API o lettura delle credenziali di produzione durante la preparazione.
  `integration/runtime/` non esiste al gate: nessuna traiettoria live avviata.

## Verifiche della correzione

- Sessione nativa completa e ripristino in un secondo processo.
- Sessione nativa finalizzata con `partial`, 1 fatto validato e 1 proposta respinta;
  avviso API e contatori persistiti e ripristinati nel processo successivo.
- JSON non valido conservato con `extraction_response` e `validation_error`;
  stato `partial`, nessun fatto conteggiato come validato per quel batch.
- Errore del provider durante l'estrazione: arresto, 5 turni conservati,
  nessun `fact_batch`, nessuna chiusura del ledger e una sola richiesta di estrazione.
- Conteggi API/ledger/JSONL coerenti; rifiuto del reporting che chiama `complete`
  una memoria parziale o conta proposte respinte come fatti validati.
- Restano PASS i controlli originali su pacing, MAX_TOKENS, errori, latch background,
  config, separazione del gold e isolamento.

I test nativi usano il vero grafo e le vere funzioni API, con risposte del modello
fittizie e rete bloccata; gli artefatti dei test sono in directory temporanee.
Il successo offline verifica il funzionamento delle interfacce. L'esito live
sulle 11 sessioni non è ancora osservato.

## Diff e avvio

`harness.diff` mostra le sole modifiche del harness e dei test: nuova provenienza,
nuovo terapeuta, freeze dopo codice pronto e raccolta/verifica dei consolidamenti.
La logica di generazione e il copione sono preservati. Vedi `../AMENDMENT.md` e
`PROTOCOL.md` per le regole complete.

Dal percorso `integration/`, verifica offline:

```sh
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 run_integration.py verify
```

Avvio live riservato al coordinatore dopo revisione:

```sh
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 run_integration.py run --live
```

È una regressione su uno scenario conosciuto, non una prova indipendente, blind
né un nuovo confronto con baseline. La campagna precedente resta fallita e immutata.
