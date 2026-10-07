# Verifica e correzione della memoria — 27 settembre 2026

La causa del troncamento è ora confermata da risposte reali di Vertex. Con il codice precedente, la reflection termina con `MAX_TOKENS`: budget 320, 303 token di ragionamento e 13 token visibili. La summary termina anch'essa con `MAX_TOKENS`: budget 512, 487 token di ragionamento e 21 token visibili. Entrambi i testi si interrompono a metà frase. I dati sono in `original_memory_api_records.json`; prompt, safety settings e budget originali sono archiviati insieme alle risposte.

Due errori del provider permettevano di salvare questi risultati. Restituiva immediatamente `response.text` quando presente, senza controllare il motivo di terminazione. Inoltre convertiva il motivo dell'SDK con `str()`: per l'enum `MAX_TOKENS` questo produce `"2"`, mentre il codice confrontava la stringa `"MAX_TOKENS"`.

## Modifica eseguita

In `agent/core/llm_provider_vertex.py` il provider legge ora il nome dell'enum prima di accettare il testo. Scarta qualsiasi completamento `MAX_TOKENS`, anche se contiene testo, e ritenta con un budget crescente entro un limite esplicito. Il tetto predefinito è 8192, configurabile con `VERTEX_MAX_RECOVERY_TOKENS`; il numero di tentativi resta limitato da `VERTEX_MAX_ATTEMPTS`. Se non ottiene un completamento, restituisce un risultato vuoto come gli altri fallimenti del provider. I candidati interrotti per altri motivi non vengono recuperati come testo valido. Modello, regione, temperatura, top-p/top-k, stop sequences e safety settings non sono stati cambiati.

In `agent/core/langgraph_builder.py` un helper assegna almeno 4096 token alle chiamate interne di Vertex Gemini: classificazione, riepilogo episodio, reflection e summary. I budget precedenti restano per gli altri provider. Questo evita che il budget destinato a poche frasi sia consumato quasi interamente dal ragionamento del modello.

La finalizzazione genera entrambe le memorie prima di persisterle. Se una generazione fallisce, solleva `SessionMemoryError`, conserva la memoria precedente e lascia attiva la sessione dell'API per consentire un nuovo tentativo. Non comunica una finalizzazione riuscita con memoria mancante. La reflection include inoltre le ultime battute anche quando esistono già riepiloghi di episodi, per conservare la parte finale non ancora riassunta.

La patch comprende esclusivamente questi due file e due nuovi file di test: `agent/test_vertex_generation.py` e `agent/test_session_memory.py`. Nessun commit è stato effettuato. Le modifiche preesistenti nei repository sono state preservate. Il diff è `agent-memory-fix.patch`; gli hash dei quattro file sono in `agent-memory-fix-sha256.json`. Il parent ha congelato questa versione prima degli archi longitudinali.

## Verifiche

- **13 regressioni nuove superate:** enum reali dell'SDK, risposta parziale scartata, crescita e limite del budget, retry 429, parametri di generazione conservati, blocchi del modello, mancata persistenza su fallimento, sessione ancora aperta, salvataggio e rilettura senza cache, ultimi turni inclusi, budget dedicati a Vertex Gemini.
- **7 test esistenti superati.** Log: `unit-tests.log`, `existing-tests.log`.
- **Due sessioni reali in processi Python differenti**, stesso paziente e terapeuta, directory persistente isolata. La seconda sessione ha ricaricato summary e history da disco; il conteggio dei turni è passato da 1 a 2. Entrambe le chiusure hanno restituito `finalized`.
- Il test reale ha richiesto **12 tentativi API: 8 risposte complete, tutte `STOP`, e 4 errori 429 recuperati**. Nessuna risposta parziale è stata accettata.
- Nella prima sessione è stata concordata una passeggiata di dieci minuti a Cedar Park martedì. La domanda della seconda sessione chiedeva attività, luogo e giorno senza ripeterli. Daniel ha ricordato correttamente tutti e tre.

Le evidenze del test sono `memory-reopen/phase_1.json`, `memory-reopen/phase_2.json`, `memory-reopen/api_records.jsonl`, le memorie JSONL e i run log nella stessa cartella. `memory_fix_results.json` contiene il riepilogo verificabile e la configurazione effettiva. I file non contengono credenziali o token; le trascrizioni riguardano pazienti sintetici. Il tracing esterno è disabilitato nel wrapper del test.

## Limiti e indicazioni per gli archi

Questa verifica dimostra funzionamento della chiusura, persistenza, riapertura e risposta nel caso provato. Non sostituisce un confronto di 11 sessioni e non dimostra validità clinica.

La history recente ripristinata conteneva ancora il piano; quindi il richiamo corretto non è attribuibile soltanto alla summary. Nella prima summary il modello aveva trasformato Cedar Park/martedì in indicazioni generiche di parco e giorno. Questa perdita di precisione semantica è distinta dal troncamento ed è lasciata visibile al confronto longitudinale: i prompt non sono stati adattati per migliorare artificialmente il singolo esempio.

La gestione preesistente delle future dei riepiloghi di episodio conserva un timeout di 10 secondi e non è stata modificata in questa versione. Gli archi più lunghi devono registrare eventuali future ancora attive alla chiusura. Devono inoltre controllare il fallback letterale di `generate_response`: una risposta HTTP 200, da sola, non prova che Gemini abbia risposto.

Per riprodurre il test con l'overlay temporaneo SciPy 1.16.3 già verificato:

```sh
PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 memory_reopen_probe.py 1
PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:/Users/marco/Sites/LLMPatients-Agent:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 memory_reopen_probe.py 2
```

Eseguire da questa cartella; utilizzare una nuova sottocartella e nuovi identificativi per una nuova replica, per non aggiungere risultati al collaudo archiviato. Il wrapper imposta solo scheduling/retry e isolamento: `VERTEX_MAX_ATTEMPTS=8`, intervallo minimo 3 secondi, storage separato, tracing disabilitato. Modello `gemini-2.5-pro`, regione `us-central1`, temperatura 0.7, budget chat 4096 e budget interni 4096.

Un servizio separato su `127.0.0.1:18001`, avviato da `serve_isolated.py`, è stato dedicato al test App↔Agent. Ha usato profili copiati, memoria e log in `http-isolated`; il suo esito è documentato dal test dell'applicazione, separatamente da questo probe. Dopo il PASS del test App, il readback dell'agente ha confermato 4 generazioni complete `STOP`, 3 errori 429 recuperati, reflection di 393 caratteri e summary di 571 caratteri. Dati: `http-isolated/readback.json`.

Il servizio temporaneo PID 24987 è stato arrestato dopo il completamento del test App. I container Docker preesistenti sono stati lasciati attivi. Non resta alcun servizio dell'audit collegato all'applicazione ordinaria.
