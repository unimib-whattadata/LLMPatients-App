## Material Passport

- Oggetto: audit offline del checkpoint dopo la ripresa autorizzata e il successivo arresto 504.
- Data: 2026-09-28.
- Materiali: report, risultati, giudizi semantici, registro nativo, checkpoint delle chiamate, statistiche delle risorse e snapshot del primo arresto.
- Metodo: ricalcolo da JSON e JSONL, verifica SHA-256 e confronto con gli artefatti storici. Nessuna API, accesso alle credenziali, ripresa, modifica ai dati o al harness.
- Stato: ANALYZED; numeri e conservazione confermati. Non è una replica delle inferenze o una nuova valutazione semantica indipendente.

## Esito sintetico

Il report aggiornato rappresenta correttamente **52/55 sessioni preparate e 224/280 risposte**, con quattro profili completi e Juanita ancora incompleta. La tabella primaria usa le stesse otto domande in ogni condizione per ciascuno dei quattro profili, quindi **32 risposte per braccio**.

| Condizione | Corrette / valutate |
|---|---:|
| history_full | 32/32 |
| summary_4000 | 17/32 |
| summary_8000 | 21/32 |
| raw_4000 | 32/32 |
| raw_8000 | 32/32 |
| structured_4000 | 32/32 |
| structured_8000 | 32/32 |

Le tabelle per profilo e categoria coincidono con il ricalcolo dei giudizi archiviati. Le 224 risposte hanno review_id unici e corrispondono ai file originali; gli hash delle cinque fonti della valutazione semantica sono corretti. I 144 giudizi del primo snapshot restano invariati.

Non è affermata una superiorità della memoria strutturata né un completamento del controllo applicativo. I risultati uguali fra history, raw e structured non costituiscono una dimostrazione statistica di equivalenza.

## Preparazione e arresto

- Alex, Jason, Crystal e Daniel: 11 sessioni e 56 risposte ciascuno.
- Juanita: 8 sessioni completate, nessuna risposta finale; la sintesi della sessione 9 è il lavoro interrotto.
- **26/52 sessioni** presentano almeno un'estrazione rifiutata. Il denominatore è quello delle sessioni, non delle chiamate di estrazione. Le risposte del modello per estrazione sono 125.
- Registro cumulativo: **403 richieste, 401 risposte completate e 2 errori**.
- Nuovo errore alle **12:06:18.675311 UTC**: HTTP 200, terminazione in-band `error`, codice upstream **504**. Il controller registra l'arresto alle 12:06:18.916233 UTC.
- Richieste dopo questo errore: **0**.
- Integrazione applicativa: **non avviata**; non esiste la cartella di risultati live `integration/runtime`.

La precedente richiesta fallita durante il 429 è stata ripetuta soltanto nella ripresa autorizzata e ha poi prodotto una risposta. Fra le 224 risposte finali, 223 checkpoint contengono un tentativo e uno ne contiene due; **ciascuna contiene esattamente un completamento STOP accettato**. Non sono stati rigenerati completamenti già acquisiti.

Resta da completare Juanita con tre sessioni e 56 risposte, oltre alla prova applicativa separata. Il fallback del benchmark dopo un'estrazione rifiutata continua a essere descritto separatamente dalla finalizzazione nativa dell'applicazione.

## Conservazione del primo checkpoint

Verificato `analysis/snapshots/stop-20260928T111757Z/snapshot-manifest.json`:

| Controllo | Esito |
|---|---:|
| File copiati nello snapshot storico | 11/11 integri |
| Artefatti completati del primo arresto confrontati con i file correnti | **177/177 identici** |
| Giudizi semantici storici | 144/144 invariati |
| Prefisso storico del registro nativo | 18.522.011 byte, 516 record, hash identico |
| Manifest del componente | 34/34 file invariati |
| Manifest dell'integrazione | 33/33 file invariati |

SHA-256 del prefisso nativo conservato: `2d57920b723613837ae68b1dcd7ceed25907a2a158dc68f4794218b6201418e5`.

I 177 artefatti comprendono le 144 risposte e le 33 sessioni già completate al primo arresto. I risultati errati sono rimasti nel campione, insieme a quelli corretti.

## Costi e caricamenti dell'encoder

La somma decimale dei costi dichiarati nelle **401 risposte native completate** è **USD 9.302563250**, corrispondente al valore del report prima dell'arrotondamento. La risposta dell'errore 504 dichiara esplicitamente `usage.cost=0`; è separata dal subtotale dei completamenti.

`analysis/resource-usage.json` conserva correttamente **cinque caricamenti distinti**:

| Profilo | Caricamenti conteggiati | Provenienza |
|---|---:|---|
| Alex | 1 | Snapshot del primo arresto; duplicato corrente non ricontato |
| Jason | 1 | Snapshot del primo arresto; duplicato corrente non ricontato |
| Crystal | **2** | Uno prima dell'arresto e uno dopo la ripresa, con hash differenti |
| Daniel | 1 | Esecuzione dopo la ripresa |

Tutti i percorsi di provenienza e gli hash dei cinque record sono validi. Ogni coppia profilo/hash compare una sola volta; i record correnti e quelli dello snapshot risultano tutti rappresentati senza duplicazioni di Alex o Jason.

Totali ricalcolati: **11,803553 secondi CPU** e **13,919992457 secondi trascorsi**, correttamente arrotondati nel report a 11,804 e 13,920. Il caricamento aggiuntivo di Crystal è mantenuto come costo operativo della ripresa. Sono coerenti anche i conteggi e le somme delle misure di contesto, generazione e CPU per tutti i sette bracci.

## Precisazione testuale risolta

La prima lettura del report conteneva «richieste successive al primo errore: 0» e «nessun retry di disponibilità», formulazioni ambigue in un archivio con due arresti e una ripresa autorizzata. La precisazione è stata segnalata; il report ora specifica **l'errore che ha fermato questa esecuzione**, l'assenza di retry **automatici**, e la conservazione dell'arresto precedente con la sua ripresa autorizzata. La correzione è stata riletta e confermata.

## Controllo metodologico

La scansione delle undici categorie del precedente audit è stata aggiornata al nuovo checkpoint: Simpson, fallacia ecologica, selezione/Berkson, collider bias, base rate neglect, regressione verso la media, survivorship bias, look-elsewhere, garden of forking paths, correlazione/causalità e causalità inversa. **11/11 esaminate**, nessuna nuova incongruenza nel report.

Restano i limiti dichiarati: quattro traiettorie complete, dati sintetici, una generazione per domanda e condizione, assenza di stime inferenziali, valutatore coinvolto nella preparazione del corpus e componente con fallback diverso dalla chiusura applicativa. L'interruzione di Juanita è visibile; il campione osservato non viene presentato come tutti e cinque i profili né come 224 osservazioni indipendenti.

## Hash dei principali artefatti esaminati

- `REPORT.md`: `64b10dd036331bfb1e94f9465038317447246d78bbad6bf4693d0d542b1b88e4`.
- `analysis/results.json`: `f65161d79f32657eb80a79895ff4fee316698e0f04f94ab0cd8a5dc390e04ade`.
- `analysis/semantic-adjudication.json`: `498965c1c5a8d2ab4632ba2e4d19e1c59428fcb8395706238249eb0acd0801eb`.
- `analysis/stop-evidence.json`: `2632b759b9d688b7f11848750d40b1c313b4a55f4a457f140b2910b1c712cc12`.
- `analysis/resource-usage.json`: `8e6d89954aac7bd4433703c5e0ae51b3f9e7b428861d7fe1a8d79a7da6143dd5`.

## Conclusione

Nessuna incongruenza residua rilevata. Il checkpoint e il report sono coerenti e preservano i risultati precedenti. Questo audit non autorizza né esegue alcuna ulteriore chiamata o ripresa.
