# Audit LLMPatients-Agent — 7 ottobre 2026

Repository: `/Users/marco/Sites/LLMPatients-Agent`. Nessun commit/push eseguito
da questo agente; il coordinatore gestisce entrambe le operazioni. Nessun `.tex`
modificato. Conservate le modifiche utente iniziali a `readme.md`, `LICENSE`
e `data/patients/13e1a19b-1a70-4fea-ac44-61f19c78b5d9.yaml`.

## Architettura

FastAPI espone inizializzazione paziente, turno conversazionale, finalizzazione
sessione ed export. LangGraph carica profili YAML, filtra input, classifica
topic/emozione, aggiorna emozioni simboliche, costruisce prompt, chiama il runner
e registra memoria. Factory provider: Vertex AI, Ollama, vLLM locale. MiniLM
produce embeddings per la memoria semantica; evidenze fattuali persistono in
JSONL con citazioni/verifica/quarantena. RunLogger salva sessioni JSON per
terapeuta. Questionari leggono YAML e salvano risposte/punteggi JSON.

La memoria delle sessioni/API e i checkpoint LangGraph sono process-local.
Il rate limiter Vertex usa SQLite condiviso e ha test multiprocesso, ma non
rende automaticamente distribuiti sessioni API e checkpoint.

## Difetti corretti

1. App Compose e documentazione utilizzavano `/patients`, mentre Agent esponeva
   solo `/patient`. Aggiunta route alias con identico handler; route precedente
   preservata. Test HTTP copre creazione attraverso plurale e rilevamento
   esistenza attraverso singolare.
2. Compose documentava una porta host configurabile senza pubblicarla. Aggiunto
   `${LLMPATIENTS_AGENT_PORT:-8000}:8000`.
3. `EmotionTraits.normalized_baseline()` convertiva valori reali `0` in `0.5`
   tramite `or`. Corretto lookup senza alterare i valori zero; regressione test
   copre zero maiuscolo/minuscolo e fallback default.
4. `scripts/run_eval_suite.py` importava `agent.eval` cancellato in commit
   `beb838c`. Ripristinato engine da `beb838c^`, aggiunti import runtime lazy,
   controllo scenari duplicati e preflight `--validate-only`, eseguito anche
   prima della creazione di output o del caricamento modelli.
5. Replay CLI ora configura memoria/log sotto `--output-dir` prima import
   runtime. Nuovi override `LLMPATIENTS_MEMORY_DIR` e `LLMPATIENTS_RUNS_DIR`
   sono rispettati da builder, logger ed export API.
6. Classificazioni attuali assenti non sono escluse dal denominatore di accuracy:
   con aspettativa presente contano come false. Summary vuoti, malformati o con
   scenari duplicati non sono riportati come successo.
7. Fixture offline evita import transitivo del modello encoder reale e disattiva
   LangChain/LangSmith tracing anche con configurazione locale abilitata.
8. CI usa Python 3.12 e dependency lock dei test ed esegue i contratti offline.
   Generazione legacy opzionale deve prima superare preflight.

## Verifiche ed esiti

Comandi ripetibili dopo installazione del lock in Python 3.12:

```sh
python -m pip install -r agent/requirements-test-lock.txt
PYTHONDONTWRITEBYTECODE=1 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 \
  LANGCHAIN_TRACING=false LANGCHAIN_TRACING_V2=false LANGSMITH_TRACING=false \
  python -m unittest discover -s agent -t . -p 'test_*.py' -v
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_*.py' -v
python scripts/run_eval_suite.py --validate-only
python scripts/run_eval_suite.py --validate-only \
  --scenarios goal_sleep_recovery redteam_role_swap
python -m pip install -r agent/requirements-runtime.txt
python scripts/check_encoder.py
git diff --check
```

- 102 test Agent PASS; 7 test aggiuntivi legacy PASS.
- Ripetuti anche in venv temporanea nuova con 69 distribuzioni risolte e senza
  Torch o SentenceTransformers ereditati. Lock transitive completo salvato in
  `agent/requirements-test-lock.txt`; non contiene wheel hashes. `uv` assente.
- Smoke HTTP usa vero FastAPI/TestClient e vero grafo LangGraph, paziente/LLM/
  encoder sintetici, filesystem temporaneo: creazione alias, risposta/emozione/
  timeline, chiusura con memoria completa, chiusura ripetuta, ripresa sessione.
- Smoke PHQ-9 percorre runner reale, 10 risposte sintetiche, totale atteso 9,
  persistenza risultato e rimozione partial verificati.
- Encoder MiniLM reale CPU PASS offline: shape `[3,384]`, vettori finiti,
  cosine testo correlato `0.5542458891868591`, non correlato
  `0.2305944710969925`. Revisione cache e script pin:
  `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`.
- SciPy 1.15.3 locale e wheel reinstallata hanno errore Mach-O zero-fill su
  questo Mac. Overlay temporaneo SciPy 1.17.1 ha risolto la prova encoder senza
  cambiare `.venv` o le versioni delle evidenze storiche.
- 10 profili originali caricabili; 30 risultati questionari: punteggi ricalcolati
  tutti identici. 16 memory JSONL / 286 record validi; 16 log JSON validi
  (includere anche gli ignored preesistenti nel reviewer bundle).
- Full preflight esce 2: `goal_relationship_boundaries` e `redteam_prompt_leak`
  referenziano `juanita_perez_001`, profilo assente. Gli altri due scenari
  passano preflight. Dataset e aspettative originali preservati.
- `git diff --check` PASS.

La prima esecuzione clean env ha esposto tentativi di telemetria LangSmith
abilitata da config locale, relativi a sole fixture sintetiche. DNS sandbox ha
bloccato tutte le connessioni. Le fixture, CI e istruzioni sono state corrette
per disabilitare esplicitamente tracing; la suite corretta non tenta upload.

## Pulizia

Rimossi 9 percorsi per 1.014.936 byte: `tests/.DS_Store`, il tracked
`data/patients/.DS_Store`, 7 directory `__pycache__` sotto agent/scripts/tests.
Manifest esatto: `/private/tmp/llmpatients-agent-cleanup.json`.

Conservati dati, memorie, risultati, log, notebook e PDF. Conservato ZIP runtime
anonimo: 34 file, 20 identici al current tree, 12 diversi, 2 non presenti nel
current tree (`config/.env.example`, `data/memory/.gitkeep`). Non è duplicato.
`.venv` non cancellata: è non avviabile per symlink a Python Homebrew rimosso,
ma contiene i pacchetti usati nella prova encoder; le istruzioni richiedono
ricreazione pulita, non trasferimento della directory.

## Presenza configurazione e limiti

Solo presenza rilevata, nessun valore credenziale letto o riportato: `.env`
root assente; `config/.env`, `config/vertex-ai-api-key.json` e
`config/openrouter-api-key.txt` presenti e non vuoti. Agent factory non espone
un provider OpenRouter; eventuale smoke OpenRouter del coordinatore verifica
la disponibilità del modello/provider usato dagli esperimenti separatamente.

Questo agente non ha eseguito generazione live, chiamate cloud di inferenza,
avvio Docker/XPU né scritture sui dati reali. Il coordinatore esegue un eventuale
health prompt live pubblico/sintetico minimo. La presenza di credenziali non
dimostra provider disponibile.

Limiti rimasti: Compose richiede Linux/XPU e mount credenziali host specifico;
endpoint async eseguono grafo sincrono; stato/checkpoint API non sopravvive al
restart come servizio distribuito; adapter Ollama/local restituiscono alcuni
errori come stringhe e il grafo può presentarli come risposte o usare fallback.
Queste condizioni non sono stabilite dal test positivo del modello cloud.

## Artefatti consegnati

- `docs/runtime-validation.md`: istruzioni e distinzione test/runtime/storico.
- `agent/requirements-test.txt`, `agent/requirements-test-lock.txt`,
  `agent/requirements-runtime.txt`: dipendenze direct/risolte/runtime.
- `agent/test_api_smoke.py`, `agent/test_eval_suite.py`: regressioni nuove.
- `agent/eval/__init__.py`, `agent/eval/suite.py`: evaluator restaurato.
- `scripts/check_encoder.py`: prova ripetibile dell'encoder reale.
- Log tmp: `llmpatients-agent-tests.log`, `llmpatients-agent-legacy-tests.log`,
  `llmpatients-agent-clean-tests.log`, `llmpatients-agent-clean-legacy-tests.log`,
  `llmpatients-agent-encoder.log`, `llmpatients-agent-clean-install.log`.
- `llmpatients-agent-data-validation.json` e cleanup JSON in `/private/tmp`.
