# Modifiche locali da rivedere per il commit

Rilevazione del 27 settembre 2026. Sono completi 100 PHQ (1.000 risposte) e 110 sessioni longitudinali (550 turni). Le analisi complete di integrità, provenienza e scoring sono passate. Nessun commit è stato creato durante questo lavoro.

## LLMPatients-Agent

Correzioni alla gestione delle risposte incomplete, alla finalizzazione della memoria e al rate limit condiviso:

- `.env.example`
- `agent/api/app.py`
- `agent/core/langgraph_builder.py`
- `agent/core/llm_provider_base.py`
- `agent/core/llm_provider_vertex.py`
- `agent/core/vertex_rate_limit.py` (nuovo)
- `agent/test_session_memory.py` (nuovo)
- `agent/test_vertex_generation.py` (nuovo)
- `agent/test_vertex_rate_limit.py` (nuovo)

In `readme.md`, le modifiche di questo lavoro sono la tabella delle variabili del limiter e la sezione **Vertex rate limiting and temporary capacity failures**. Il file contiene anche modifiche precedenti a licenza e citazioni: selezionare i singoli blocchi se si prepara un commit dedicato alle correzioni.

I test locali del runtime sono documentati in `runtime/rate-limit-implementation.json`. Le correzioni al runtime di ricerca sono verificate anche nei test del trasporto OpenRouter e nel controllo del recupero da un timeout reale.

## LLMPatients-App

Verifica dello scenario backend e della finalizzazione delle sessioni:

- `scripts/backend-scenario.ts`
- `scripts/test-backend.ts`

La prova backend e il controllo dei tipi sono documentati negli artefatti `runtime` della campagna.

## LLMPatient---APPLICATION

Git segnala `outputs/` come directory non tracciata. Contiene l'audit del revisore, le campagne archiviate e questa continuazione:

- `outputs/reviewer-audit-2026-09-27/`
- `outputs/reviewer-tests-2026-09-27/`
- `outputs/reviewer-tests-global-2026-09-27/`
- `outputs/reviewer-tests-openrouter-2026-09-27/`

L'adattatore OpenRouter, i launcher della campagna e gli emendamenti di tracciabilità sono nella directory di questa continuazione. Usano `google/gemini-2.5-pro`. I sorgenti sperimentali congelati e i risultati precedenti sono conservati con i rispettivi hash.

La chiave OpenRouter è conservata nel file locale `config/openrouter-api-key.txt` del progetto Agent, escluso da Git. Il valore non è riportato in questi artefatti.

## Modifiche precedenti presenti nei progetti

Lo stato Git include anche file `.DS_Store`, `LICENSE`, un profilo paziente UUID e le modifiche di licenza/citazione del README nel progetto Agent; nel progetto App compaiono directory temporanee di slide, `assets/` e `output/`. Questi elementi non sono stati aggiunti dalle correzioni di questa campagna. Vanno valutati separatamente quando si prepara il commit.

## Riferimenti operativi

- `CONTINUATION.json`: stato e processi della campagna.
- `runtime/phq-completion.json`: completamento e verifica dei questionari.
- `openrouter-provider-amendment.json`: passaggio dichiarato a OpenRouter.
- `openrouter-error-handling-amendment.json`: gestione degli errori nativi dentro HTTP 200.
- `runtime/openrouter-first-inband-recovery.json`: timeout reale riconosciuto e recuperato.
- `REPORT.md`: rapporto dell’intera campagna, prodotto dopo il completamento e il superamento delle analisi complete; lo stato della revisione finale è registrato in `CONTINUATION.json`.
