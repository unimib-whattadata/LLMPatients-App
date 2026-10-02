# Ripresa dal limite di richieste: 29 settembre 2026

## Autorizzazione e checkpoint

L'utente ha autorizzato l'aggiunta dell'attesa per i limiti di richieste e la
ripresa con «Ok aggiungila e fai ripartire». Il controller precedente si è
fermato il 29 settembre alle 18:32:22 Europe/Rome: la classificazione del quinto
scambio dell'esecuzione 90 ha restituito HTTP 200 con un errore upstream 429
esplicito, senza risposta visibile e senza `Retry-After`. Il backend archiviato
è Google e il modello è `google/gemini-2.5-pro`.

Il checkpoint riconciliato contiene **89 esecuzioni di sessione complete,
449 scambi salvati, 860 richieste HTTP, 850 risposte e 10 errori di servizio**.
La risposta HTTP 200 vuota che aveva interrotto la ripresa precedente è inclusa
nelle risposte e documentata separatamente. I conteggi degli errori mantengono
anche quelli recuperati; non indicano da soli che il controller sia fermo.

L'esecuzione 90 è la terza sessione del paziente simulato `alex_carter_001`,
ripetizione 03, sistema `structured_common_profile`. Sono già persistiti
quattro scambi della sessione, quattordici della traiettoria. Mancano il quinto
scambio e la chiusura nativa della sessione. Il riepilogo delle risposte salvate
non costituisce un punteggio di accuratezza.

## Politica dei tentativi

`timeout_retries.py` applica al trasporto originale la politica `resume-06-v1`:

- Al massimo **tre tentativi complessivi per prompt e configurazione**, anche
  quando timeout e 429 si alternano.
- Per un 429 esplicito e archiviato senza testo visibile: attese di **60 e
  120 secondi** dopo il primo e il secondo insuccesso.
- Per un `Retry-After` valido, in secondi oppure come data HTTP, l'attesa è il
  massimo fra il valore indicato e l'attesa di base. Un valore assente o
  malformato viene registrato e lascia l'attesa di base. Un valore che richiede
  più di **300 secondi** interrompe l'esecuzione: nessun tentativo anticipato.
- Per i timeout già autorizzati: restano le attese di **30 e 60 secondi**.
- Il limite globale conserva un solo canale e almeno cinque secondi fra
  l'inizio dell'ultimo tentativo e quello della richiesta successiva. Le attese
  sono interrompibili dal file globale `STOP` entro circa un secondo.
- Ogni tentativo, errore, decisione e attesa è persistito prima di procedere.
  I tre formati riconosciuti per 429 sono HTTP 429, errore nella choice con
  HTTP 200 ed errore API di primo livello con HTTP 200. Archivio incompleto,
  esito ambiguo, risposta visibile, altro errore o esaurimento dei tentativi
  conservano l'arresto globale.

La gestione degli errori in una risposta HTTP 200 e l'uso di `Retry-After`
seguono i formati documentati da
[OpenRouter](https://openrouter.ai/docs/api_reference/errors-and-debugging).
I valori 60/120, tre tentativi e il limite di 300 secondi sono scelte operative
di questa esecuzione, non limiti dichiarati dal fornitore.

Il recupero `MAX_TOKENS` 4096 → 8192 già previsto resta separato: ciascuna delle
due configurazioni può avere fino a tre tentativi, quindi fino a sei richieste
HTTP per una generazione che attraversi entrambe. Le risposte senza testo
visibile concluse normalmente non diventano errori 429 e continuano a fermare
la matrice. Rimane il limite di 1.200 secondi per processo di sessione.

## Ripristino del quinto scambio

`worker.py` ripristina il `base_state` nativo dopo il quattordicesimo scambio:
indice di sessione 2, `total_turns=14`, `last_episode_turn=10`, cinque scambi di
storia recente e dieci messaggi. Usa il grafo originale per `s03t05`, con
`step_id=3`, poi esegue la chiusura nativa. La prima richiesta deve essere la
classificazione fallita: prompt UTF-8 e opzioni vengono confrontati esattamente
con la richiesta archiviata prima di inviarla.

Il prompt del classificatore è di 4.410 byte, SHA-256
`2f5424f7ed72d7039e51d1a3e88aacb9c5d29c67c2798fea7f629eaa63e82c98`.
Non esiste una classificazione riuscita da riutilizzare per questo scambio.
L'errore ha preceduto l'aggiornamento emotivo e la richiesta della risposta del
paziente: nessun aggiornamento già eseguito viene ricalcolato. Lo stato del
generatore casuale Python non è persistito; il nuovo processo lo inizializza
nuovamente. Le successive operazioni casuali seguono quindi un nuovo flusso.
Non viene affermata l'identità di un futuro prompt del paziente che non era
ancora stato generato.

Dal blocco 91 viene richiamato il worker originale, con la nuova politica del
trasporto. I 449 scambi e i registri precedenti sono preservati come prefissi;
le sessioni già chiuse restano identiche. Il controller verifica anche il
checkpoint e l'assenza di altri worker prima di rimuovere una sola volta il
`STOP` e il ticket del 429 identificato. Entrambi restano nella copia congelata
e nei registri della risoluzione.

## Impostazioni sperimentali

Restano i cinque profili, tre ripetizioni, due sistemi, undici sessioni e cinque
scambi per sessione: **30 traiettorie, 330 esecuzioni, 1.650 scambi e 180 probe**.
La baseline riceve tutto il proprio dialogo e lo stesso contenuto clinico del
sistema strutturato. Il calendario e i prompt restano quelli congelati.

Tutte le chiamate usano OpenRouter e `google/gemini-2.5-pro`, con fallback di
routing disabilitato e `require_parameters=true`. Temperatura: 0,7 per il
paziente, 0 per il classificatore, 0,2 per la memoria. Budget di uscita iniziale:
4.096 token per paziente/classificatore, 8.192 per memoria; `top_p=0.95`, budget
di ragionamento 1.024 e stop `\nTherapist:` e `Therapist:`. Il parametro legacy
`top_k=40` è omesso dal corpo OpenRouter, come già documentato. Il seed
20260929 ordina il calendario; nessun seed viene inviato al fornitore.

## Verifiche ed evidenze

- `offline-results.json`: risultati dei test mirati e hash del codice verificato.
- `native-preflight.json`: grafo e chiusura nativi su una copia temporanea con
  fixture, rete vietata, nessuna modifica al runtime reale e zero chiamate live.
- `native-retry-results.json`: trasporto originale con un 429 in-band e un
  HTTP 429 simulati; `Retry-After` di 75 e 130 secondi rispettati. Inizio delle
  richieste simulate a 0, 75, 205 e 210 secondi; due generazioni riuscite,
  nessun `STOP` e ticket liberato. Nessuna chiave reale o chiamata live.
- `checkpoint-audit.json`, `snapshot/` e `snapshot-manifest.json`: riconciliazione
  e copia verificata dell'intero runtime precedente alla ripresa.
- `manifest.json`: hash del pacchetto e collegamento ai manifest precedenti.
- `state.json` e `started.json`: stato, heartbeat e avvio del nuovo controller.
- `../../runtime/<run_id>/sessions/session_XX/timeout-retries.jsonl`: tutti i
  tentativi e le attese; `openrouter-api-records.jsonl` conserva gli esiti nativi.
- `../../runtime/<run_id>/sessions/session_03/recovery-resume06.jsonl`: verifica
  del classificatore e recupero, nella sola traiettoria interrotta.

Il supervisore è un job macOS con `KeepAlive=false`: una volta esaurita la
politica prevista, non riavvia il processo. Il file originale di avvio e tutti
i pacchetti congelati precedenti restano conservati. Le prove offline usano
fixture esplicite e non contribuiscono ai risultati scientifici del modello.
