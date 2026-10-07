# Audit offline del terzo arresto

## Material Passport

- Data: 28 settembre 2026.
- Materiali: `REPORT.md`, `analysis/results.json`, `analysis/semantic-adjudication.json`, `analysis/stop-evidence.json`, metadati del journal nativo, checkpoint di sessioni/chiamate/risposte e manifest dello snapshot `stop-20260928T120618Z`.
- Ambito: verifica mirata dei cinque punti richiesti; nessuna nuova valutazione semantica delle risposte e nessuna lettura o riproduzione del testo di reasoning.
- Operazioni: sole letture e calcoli locali; nessuna API, accesso a credenziali, esecuzione di test o modifica dei dati e del codice. Unico file scritto: questo verbale.

## Esito

**Nessuna incongruenza residua nei cinque punti verificati.** Il report descrive correttamente un benchmark componente ancora parziale, arrestato per un completamento privo di risposta finale.

### 1. Natura dell'ultimo completamento

Il record nativo `1a32ca77-5c9b-46ff-bcc7-f3554b91ae4b` contiene una risposta del 28 settembre alle **12:46:24.073090 UTC** con HTTP **200**, `finish_reason: stop`, `native_finish_reason: STOP` e `content: null`. Non contiene un errore del provider. I token di completamento sono **231**, tutti dichiarati come reasoning; il costo riportato è **USD 0.0145675**.

È quindi un completamento vuoto, distinto dagli errori 429/504 precedenti e da `MAX_TOKENS`. Il checkpoint della chiamata `juanita_delgado_001/raw_8000/completed_exercise` ha stato `stopped_invalid_completion` e un solo tentativo, riferito a quel record.

### 2. Arresto e integrazione

Nel journal risultano **zero richieste successive** alla risposta che ha provocato questo arresto e **zero nuovi eventi `error`** dalla ripresa autorizzata delle **12:36:03 UTC**. I conteggi cumulativi sono 447 richieste, 445 risposte e due eventi di errore, entrambi precedenti a questa ripresa. Il controllo di integrazione non risulta avviato: lo confermano `stop-evidence.json` e l'assenza dei relativi artefatti runtime.

### 3. Conteggi e confronto comparabile

Verificati **55 checkpoint di sessione completi** e **257 file di risposta**, corrispondenti alle 257 righe valutabili e ai giudizi disponibili. Alex, Crystal, Daniel e Jason hanno 56 risposte ciascuno; Juanita ne ha 33. La tabella primaria include esclusivamente i quattro profili completi e coincide con quella dello snapshot precedente:

| Braccio | Corrette / valutabili |
|---|---:|
| `history_full` | 32/32 |
| `summary_4000` | 17/32 |
| `summary_8000` | 21/32 |
| `raw_4000` | 32/32 |
| `raw_8000` | 32/32 |
| `structured_4000` | 32/32 |
| `structured_8000` | 32/32 |

Juanita è presentata separatamente: **27/33 corrette**, con denominatori diversi tra bracci (`history_full` 6/6; `summary_4000` 1/4; `summary_8000` 2/5; `raw_4000` 6/6; `raw_8000` 3/3; `structured_4000` 5/5; `structured_8000` 4/4). Non va incorporata nel confronto primario finché resta incompleta.

### 4. Contabilità del completamento vuoto

La somma dei costi dichiarati nelle risposte native è **USD 10.206532875** e include una sola volta **USD 0.0145675** per il completamento vuoto. Escludendo questa voce, il totale sarebbe USD 10.191965375.

Per il completamento vuoto non esistono né file di risposta finale né riga valutabile in `results.json`. Coerentemente, `raw_8000` conta **36 risposte native fatturate e 35 risposte valutabili**. Il completamento vuoto non contribuisce al denominatore 257 e non è classificato come risposta semanticamente corretta o errata.

### 5. Estrazioni respinte e conservazione

**27 delle 55 sessioni** registrano almeno un'estrazione respinta, in accordo fra checkpoint e analisi. I **276 artefatti completati** elencati nel manifest dello snapshot `stop-20260928T120618Z` esistono ancora e tutti i relativi SHA-256 coincidono: **zero file mancanti o modificati**.

## Limite dell'esito

Questi riscontri confermano la coerenza del report parziale e dell'arresto. Il confronto primario continua a mostrare parità fra storia completa, recupero del testo originale e memoria strutturata su queste domande; non dimostra superiorità della memoria strutturata. Non è stato completato un controllo end-to-end delle 11 sessioni nel runtime.
