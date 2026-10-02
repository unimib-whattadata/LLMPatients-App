# Modifiche da valutare per il commit

**Inventario storico precedente alla gestione del rate limit e alla migrazione OpenRouter.** L’elenco aggiornato è in [COMMIT-NOTES.md](COMMIT-NOTES.md).

Stato verificato il 27 settembre 2026. Nessun commit o push è stato eseguito.

## LLMPatients-Agent

Quattro file appartengono alla correzione verificata in questo audit:

- `agent/core/llm_provider_vertex.py`: controllo del motivo di terminazione, rifiuto delle risposte troncate e recupero entro un limite esplicito.
- `agent/core/langgraph_builder.py`: budget delle chiamate interne e finalizzazione coerente della memoria; stato conservato quando la finalizzazione fallisce.
- `agent/test_vertex_generation.py`: regressioni del provider.
- `agent/test_session_memory.py`: regressioni della finalizzazione della memoria.

Prove: 13 nuovi test e 7 test esistenti superati; chiusura e riapertura reali in processi distinti. Patch e risultati sono in `runtime/`.

Erano già presenti modifiche a `.DS_Store`, `agent/.DS_Store`, `data/.DS_Store`, `readme.md`, oltre a `LICENSE` e al profilo `data/patients/13e1a19b-1a70-4fea-ac44-61f19c78b5d9.yaml`. Non sono attribuite all'audit e vanno considerate separatamente.

## LLMPatients-App

Due file appartengono all'audit:

- `scripts/test-backend.ts`: caricamento dell'ambiente e configurazione del test.
- `scripts/backend-scenario.ts`: attesa dell'analisi asincrona, verifica della risposta reale e pulizia delle risorse.

Prova: percorso reale App–Agent–valutatore superato; database temporaneo eliminato. Patch e risultati sono in `runtime/`.

Le cartelle `.tmp-*`, `assets/` e `output/` erano già presenti e non appartengono a queste modifiche.

## LLMPatient---APPLICATION

Il manoscritto è invariato. I nuovi materiali sono sotto `outputs/`:

- `reviewer-audit-2026-09-27`: ricostruzione storica e primi controlli.
- `reviewer-tests-2026-09-27`: archivio della campagna regionale interrotta per capacità del servizio.
- `reviewer-tests-global-2026-09-27`: prosecuzione che riutilizza i risultati regionali, con metadati di provenienza e analisi per endpoint.

Il dossier sperimentale deve essere archiviato insieme ai manifest, agli scenari e ai dati grezzi cui le analisi fanno riferimento. Le due cartelle di campagna non rappresentano esperimenti indipendenti.

`git diff --check` è passato nei repository Agent e App. Il completamento del dossier scientifico è attestato solo dal rapporto finale e dal controllo conclusivo, non dal presente elenco di file.
