# Controllo di integrazione della memoria in undici sessioni

## Material Passport e stato

ARS-Codex, sottocompito autorizzato del benchmark di memoria. Un profilo canonico
sintetico (`alex_carter_001`), undici sessioni consecutive di cinque scambi.
Copione e gold sono fissati prima delle inferenze; `manifest.json` contiene gli
hash del runtime corrente, del copione, del gold, del harness e del trasporto.
Nessun risultato della precedente campagna viene riusato come memoria iniziale.
`prepare`, `verify`, i test offline e `review` non leggono credenziali e non
effettuano inferenze. L'avvio live richiede l'esplicito comando `run --live`.

## Scopo

Verificare che l'intera catena API → grafo → memoria persistente → nuova sessione
funzioni dopo la chiusura del processo. Tutte le risposte del paziente live,
le classificazioni, le sintesi e le estrazioni sono prodotte dal modello.
Il terapeuta introduce fatti immaginari per esercizi di comunicazione, senza
cambiare il profilo clinico. Si valuta il richiamo delle sue registrazioni
esplicite: una risposta del paziente che contraddice un dato resta un esito
osservato, non riscrive il gold.

Questo è un controllo di integrazione su un solo profilo, distinto dal confronto
dei componenti e dalla validazione clinica. L'API conserva `step_id` nei metadati
del logger, ma non lo inserisce nel payload del grafo. Il test non dimostra
l'esecuzione di undici fasi terapeutiche differenti.

## Copione e valutazione

`scenario.json` contiene soltanto identificatori e messaggi del terapeuta.
`gold.json` è letto dalla preparazione e dall'esportazione per la revisione;
il worker ne verifica soltanto l'hash, senza usarne i contenuti nell'inferenza.
Il controllo di novità confronta i nomi target con corpus componente e copione
precedente, conservando gli hash delle fonti confrontate senza copiare i dialoghi.

| Probe | Controllo |
|---|---|
| S10T1 | Nome ed età dal profilo canonico |
| S11T1 | Titolo introdotto in S1 |
| S11T2 | Persona, appuntamento corrente, precedente e alternativa non concordata |
| S11T3 | Sostituzione esplicita del luogo |
| S11T4 | Attività completata rispetto ad attività solo pianificata |
| S11T5 | Astensione sul cognome mai stabilito nelle fonti |

Il gold specifica tutte le relazioni richieste. Nessuna risposta viene rigenerata
per migliorarne l'accuratezza. `review` esporta risposte, fonti e criteri per
valutazione semantica separata: la semplice presenza di parole corrette non viene
contata automaticamente come successo. Risposte parziali, miste e incerte vanno
distinte dai successi completi; astensione corretta e allucinazione restano separate.

## Runtime e isolamento

`source/` copia byte per byte i moduli `.py` di `agent/core`, `agent/api`,
`agent/utils`, l'inizializzatore del package, il solo profilo Alex e l'albero dei
topic dal working tree corrente dell'Agent. Nessun `.env`, chiave, configurazione
credenziali, memoria o storico è incluso. Non si importa il vecchio runtime
congelato della revisione.

Ogni sessione è un processo Python nuovo. Usa davvero `api.send_message` cinque
volte e `api.end_session` una volta. Il successivo processo ripristina lo stato
con `RunLogger.restore_state` e recupera memoria dal medesimo JSONL isolato.
Non viene iniettata manualmente l'intera cronologia. Le risposte precedenti sono
quelle prodotte dal modello e persistite dal runtime.

Storage live esclusivamente sotto `integration/runtime/`: ledger in `runs/`,
memoria in `memory/`, artefatti e record HTTP nativi per sessione in `sessions/`.
Le cartelle di produzione, i profili e il codice originale restano invariati.
Il test non avvia un server HTTP: esegue le funzioni native asincrone delle route.

La factory viene sostituita prima di importare il grafo con una sottoclasse di
`VertexLLMRunner` che conserva i controlli di tipo Gemini. Non vengono eseguiti
né il costruttore né `generate` di Vertex. `vertexai.init` e `GenerativeModel`
Vertex sono protetti da un'asserzione che ne proibisce l'uso. Il trasporto è
esclusivamente `scripts/openrouter_transport.py`, con la gestione in-band di
`scripts/openrouter_inband_errors.py` del nuovo benchmark.

## Decoding e arresti

| Stage | Temperatura | Output massimo iniziale | Thinking |
|---|---:|---:|---:|
| Risposta del paziente | 0,7 | 4096 | 1024 |
| Classificazione topic/emozione | 0,0 | 4096 | 1024 |
| Episodio, riflessione, sintesi cumulativa, fatti | 0,2 | 8192 | 1024 |

Gemini `google/gemini-2.5-pro`, top-p 0,95, stop `\nTherapist:` e `Therapist:`;
nessun seed API e nessun altro modello. Top-k e policy di sicurezza Vertex non
sono inoltrabili: il trasporto registra entrambe le omissioni. Non si sostituisce
una risposta bloccata con una chiamata a sicurezza meno restrittiva.
I parametri richiesti dal grafo e quelli effettivamente applicati vengono
registrati separatamente, incluso lo stage `_generate_factual_memory`.

Un solo recupero è ammesso se una generazione iniziale a4096 termina con
`MAX_TOKENS`: stesso prompt, output8192. Il testo parziale resta archiviato e
non viene accettato. Se una richiesta già a8192 è incompleta, la prova si ferma.
Qualsiasi errore di disponibilità/HTTP/in-band/trasporto, testo vuoto o altra
terminazione non `STOP` interrompe la prova. Nessun retry di disponibilità.
Gli errori passano al grafo tramite il suo segnale di arresto esistente e un
latch condiviso impedisce ulteriori chiamate anche se un callback lo intercetta.
Non si presentano tali errori come chiamate o errori del servizio Vertex.

Chiamate seriali: lock interprocesso mantenuto durante HTTP, almeno cinque
secondi fra inizi, timeout HTTP120s e processo1200s. La prova del componente e
questa integrazione vengono eseguite in serie; se la prima si interrompe per
indisponibilità, non si avvia automaticamente questa.

Il runtime produce gli episodi in background. Il harness attende i future prima
di chiamare la chiusura nativa (barrier180s) e controlla il latch. Questo rende
deterministico il completamento dei job ai confini della sessione, senza cambiare
prompt, nodi, contenuti o algoritmo della memoria. Evita che il timeout nativo
di10s rimuova dal registro un job ancora in corso. L'override è una condizione
operativa del test, non una correzione silenziosa del codice congelato.

Una sessione fallita non viene ripetuta automaticamente. I turni già accettati,
i record di errore e le estrazioni respinte restano conservati. Un eventuale
riavvio della sessione incompleta richiede un emendamento esplicito; `run`
accetta solamente un prefisso di sessioni già completate e continua dalla
successiva. Creare `runtime/STOP` impedisce nuove chiamate; una chiamata già in
corso termina entro il proprio timeout.

## Artefatti e controlli

`generation-events.jsonl`: stage, prompt esatto, parametri richiesti/effettivi,
terminazione, uso token e riferimenti al record nativo. Il testo di ragionamento
non entra nelle risposte del paziente né nel riepilogo dei test. La provenienza
nativa resta nell'archivio del trasporto. Nessuna chiave/header Authorization
viene scritta nei log. La chiave è letta dal solo trasporto durante una richiesta,
dal file indicato da `OPENROUTER_API_KEY_FILE` oppure dal default già configurato.

`session.json`: risposta API, prompt e fonti recuperate per turno, contatori,
stato ripristinato all'apertura, prova di finalizzazione, memoria persistita,
PID e UUID del processo. Il ledger deve contare5nuovi turni per sessione,
chiusura riuscita, riflessione e sintesi non vuote, cinque fonti originali
persistite. La mancata estrazione dei fatti viene riportata come fallimento
della chiusura secondo il comportamento nativo, senza un fallback inventato.

I test offline usano SDK reale per le risposte, trasporto/modello fittizio,
directory temporanee e rete vietata. Coprono mapping, completamenti parziali,
errore HTTP/in-band, latch del job in background, pacing, congelamento, assenza
di leakage del gold e due processi reali con send_message/end_session/restore_state.
Il successo offline dimostra il wiring, non la qualità del modello.

## Comandi e dipendenze

Dal percorso `integration/`:

```sh
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 run_integration.py prepare
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 run_integration.py verify
PYTHONPATH=/tmp/llmpatient-reviewer-audit/runtime-overlay-scipy116:source:/Users/marco/Sites/LLMPatients-Agent/.venv/lib/python3.12/site-packages /Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m unittest -v test_integration
```

Solo dopo l'avvio live autorizzato:

```sh
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 run_integration.py run --live
/Users/marco/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 run_integration.py review
```

Python3.12 bundled; pacchetti esistenti dell'Agent; overlay temporaneo SciPy1.16.3
per compatibilità col sistema; encoder `all-MiniLM-L6-v2` nella cache locale
(`HF_HUB_OFFLINE=1`, nessun download). È possibile indicare altre directory
compatibili con `MEMORY_INTEGRATION_SCIPY_OVERLAY` e
`MEMORY_INTEGRATION_SITE_PACKAGES`; i percorsi risultano nel comando del worker.

Attese circa154generazioni (55risposte+55classificazioni+44operazioni di memoria),
oltre ai soli recuperi MAX_TOKENS prespecificati. La latenza effettiva determina
la durata; con15–40s per richiesta, circa40–105minuti, senza garanzia di
disponibilità. È possibile eseguire un prefisso con `--max-sessions N`;
nessuna accelerazione tramite richieste concorrenti.
