# Verifica backend App e detector

## Correzioni al test

Modificati esclusivamente `LLMPatients-App/scripts/test-backend.ts` e `scripts/backend-scenario.ts`.

1. Il runner non caricava `.env`. Ora carica `.env.local` e `.env` senza stampare la configurazione; le variabili fornite al processo hanno precedenza. La scelta di API remota rimane esplicita (`API=remote`), conservando il comportamento locale predefinito del test.
2. Il polling dell'analisi asincrona aveva un limite rigido di 5 secondi. Ora usa 180 secondi di default, configurabili con `TEST_STEP_EVALUATION_TIMEOUT_MS`; per questa esecuzione sono concessi 600 secondi. Controlla il database ogni 250 ms, segnala il vero errore del provider quando lo stato diventa `failed` e documenta la latenza quando diventa `completed`.
3. Il pool PostgreSQL dello scenario viene chiuso anche in caso di eccezione. Il runner padre crea e rimuove un database dedicato a ogni esecuzione.
4. Nel ramo remoto il test richiede `metadata.apiType === "REAL"`, rifiuta `endpoint === "FALLBACK"` e la risposta generica di errore. Un ritorno mock non costituisce più una prova di successo remoto.

La configurazione locale dell'App contiene progetto, regione e modello Vertex, ma non `GOOGLE_APPLICATION_CREDENTIALS`. Per questa esecuzione viene passato via ambiente il percorso assoluto della credenziale già esistente in Agent. Il contenuto della credenziale non viene stampato o copiato nel dossier.

## Controlli statici

`app-backend-static-checks.log` documenta tre exit code 0:

- TypeScript: `tsc --noEmit --incremental false --ignoreDeprecations 5.0`.
- Prettier sui due script modificati.
- `git diff --check`.

Il comando TypeScript senza override incontra un difetto già presente nella configurazione: `ignoreDeprecations` non è accettato dalla versione effettivamente installata. È stato usato un override da CLI; nessun `tsconfig.json` modificato.

## Semantica del test e degli endpoint

Lo scenario esegue direttamente i router tRPC e i servizi dell'App contro PostgreSQL, quindi verifica logica backend, autenticazione/autorizzazione, persistenza e concorrenza senza avviare un server Next.js o un browser.

Con `API=remote`, inizializzazione e risposta paziente effettuano vere richieste HTTP verso l'Agent isolato su `127.0.0.1:18001`. La disponibilità del server si verifica con `GET /openapi.json`; Agent non espone `/health`.

`chat.markStepDone` marca e salva il completamento dello step, poi mette in coda il detector in background. Il suo ritorno non attesta che il detector sia già terminato. Per lo step 11 avvia inoltre `/session-end` in background. Il test chiama due volte il completamento per controllare l'idempotenza delle righe nel database; possono quindi arrivare due richieste di finalizzazione all'Agent.

Il detector è reale anche quando la generazione paziente usa il servizio mock: il servizio di valutazione seleziona Vertex indipendentemente da `API`. Questa esecuzione richiede entrambi reali e distingue il trasporto paziente dal modello del detector.

Il corpo dello scenario comprende un'analisi asincrona persistita e cinque casi diretti del detector: struttura, atteggiamento dannoso, rischio suicidario, confini professionali e filtro della risposta di fallback. Il loro superamento è un controllo funzionale limitato; non è una nuova stima di sensibilità o precisione clinica.

## Esecuzione reale

Il launcher riproducibile è `app-backend-run.mjs`. Configurazione: `API=remote` sul solo server locale isolato, detector `gemini-3.1-pro-preview`, regione `global`, timeout di valutazione 600 secondi e database temporaneo. Log e stato finale vengono salvati in `app-backend-real.log` e `app-backend-real.json`.

**Esito: PASS, exit code 0.** Avvio 27 settembre 2026 alle 10:55:33 UTC, fine alle 10:57:57 UTC, durata 144,589 secondi.

| Passaggio | Risultato osservato |
|---|---|
| Creazione paziente remoto | `/patient` riuscito |
| Risposta paziente remoto | `/chat-response` reale, circa 43,8 secondi, `metadata.apiType=REAL`, nessun fallback |
| Analisi asincrona | Stato `completed` e risultato persistito dopo 13,551 secondi, modello `gemini-3.1-pro-preview` |
| Memoria sessione | `/session-end` restituisce `finalized` dopo circa 73,5 secondi |
| Richiesta duplicata di chiusura | Restituisce `not_found` dopo la chiusura concorrente, senza errore |
| Cinque casi diretti detector | Tutte le asserzioni passate |
| Registrazione, sessioni, ruoli, attività, impersonazione, statistiche | Scenario completato con tutte le asserzioni passate, inclusi rifiuti attesi delle operazioni duplicate |
| Database temporaneo | Rimosso; controllo successivo senza database con prefisso `llmpatients_test_` |

L'Agent usato da questa esecuzione era la versione corretta e congelata dall'altra verifica runtime, con `gemini-2.5-pro` in `us-central1`, temperatura 0,7, profili copiati e memoria/log isolati in `runtime/http-isolated`. Il detector dell'App usava invece `gemini-3.1-pro-preview` nella regione `global`.

La durata osservata di 13,551 secondi dell'analisi asincrona dimostra che il precedente limite rigido di 5 secondi poteva produrre un falso fallimento del test anche con detector funzionante. Credenziali esplicite, caricamento della configurazione e attesa adeguata hanno permesso di completare il test reale. Non è stato sostituito alcun modello con un mock e non sono state allentate le asserzioni cliniche preesistenti.

Il readback del servizio Agent conferma che la sessione sintetica ha prodotto una reflection di 393 caratteri e un summary di 571 caratteri. I log contano quattro risposte terminate con `STOP` e tre errori di quota HTTP 429 recuperati dai tentativi successivi: la prova è riuscita con retry, non senza transitori del provider. Evidenza: `runtime/http-isolated/readback.json`.

Il server Agent isolato è stato arrestato dall'altra verifica runtime dopo il completamento del test. Nessun server Next.js, deploy, modifica di database applicativi esistenti o nuovo corpus saturo è stato necessario.

## Valutazione del corpus storico

La ricostruzione già eseguita è archiviata in `app-backend-sensitivity-audit.md`, `app-backend-sensitivity-audit.json` e `app-backend-panel-b-metrics.csv`.

Le metriche pubblicate coincidono con dati e annotazioni conservati. Il corpus ha 150/300 turni con errori deliberati, tutti concentrati in dieci trascrizioni. Solo 15 battute terapeuta seeded distinte vengono ripetute dieci volte. L'accordo inter-rater è κ=.519 sul totale, ma κ=.017 sui soli turni appropriate. La rimozione dei metadati dai workbook è verificata; l'efficacia dell'accecamento rispetto al contenuto non è stata misurata.

Questi risultati restano interpretabili come verifica su un corpus artificiale saturo. Il passaggio del test software non risolve la trasferibilità della precisione a sessioni reali con errori rari e non valida la continuità su 11 sessioni.
