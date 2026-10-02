# Continuità della memoria: esecuzione e risultati

## Material Passport

- Materiali interamente sintetici; ARS-Codex, esperimento eseguito su richiesta dell'utente.
- Aggiornamento: 2026-09-28T12:08:56.835373+00:00.
- Modello: `google/gemini-2.5-pro`, OpenRouter.
- Stato del confronto: **stopped**.
- Sessioni preparate: **52/55**; risposte finali: **224/280**.
- Cinque traiettorie appaiate previste; dialoghi sorgente prefissati e uguali fra condizioni; una risposta per domanda e condizione.

## Arresto e lavoro restante

Motivo archiviato: **OpenRouterInBandError: upstream 504 in HTTP 200 response**. Il controllo ha arrestato la campagna. Richieste successive all'errore che ha fermato questa esecuzione: **0**. Nessun retry automatico di disponibilità è stato effettuato. L'archivio conserva anche l'arresto precedente e la successiva ripresa autorizzata dall'utente.

Costo dichiarato dal provider per le risposte completate: **USD 9.302563**. La risposta d'errore dichiara separatamente un costo di USD 0.

Restano Juanita Delgado: 3 sessioni e 56 risposte; il controllo applicativo separato. Quest'ultimo **non è stato avviato**. Una ripresa richiede una nuova istruzione dell'utente e deve conservare tutte le risposte già completate.

## Risultati sui profili completi

Il confronto seguente usa soltanto i **4/5 profili completi**, con tutte le otto domande in ogni condizione. Le risposte del profilo interrotto sono riportate separatamente nella tabella per paziente; non si aggregano campioni con domande differenti fra condizioni.
Un confronto incompleto non consente una conclusione finale fra le condizioni.

| Condizione | Corrette sui profili completi | Previste su tutti i 5 profili |
|---|---:|---:|
| history_full | 32/32 | 40 |
| summary_4000 | 17/32 | 40 |
| summary_8000 | 21/32 | 40 |
| raw_4000 | 32/32 | 40 |
| raw_8000 | 32/32 | 40 |
| structured_4000 | 32/32 | 40 |
| structured_8000 | 32/32 | 40 |

Risposte archiviate ancora da valutare semanticamente: **0**.

## Per paziente

Per i profili incompleti i denominatori e le domande disponibili possono differire: le frazioni parziali non misurano una superiorità tra condizioni.

| Paziente | history_full | summary_4000 | summary_8000 | raw_4000 | raw_8000 | structured_4000 | structured_8000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| alex_carter_001 | 8/8 | 6/8 | 6/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| crystal_smith_001 | 8/8 | 3/8 | 4/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| daniel_isherwood_001 | 8/8 | 3/8 | 4/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| jason_smith_001 | 8/8 | 5/8 | 7/8 | 8/8 | 8/8 | 8/8 | 8/8 |

## Per categoria sui profili completi

| Categoria | history_full | summary_4000 | summary_8000 | raw_4000 | raw_8000 | structured_4000 | structured_8000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| abstention | 8/8 | 8/8 | 8/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| completion | 4/4 | 1/4 | 3/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| proposal | 4/4 | 1/4 | 1/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| remote | 8/8 | 6/8 | 6/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| update_current | 4/4 | 1/4 | 3/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| update_past | 4/4 | 0/4 | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 |

## Preparazione e disponibilità

Richieste native: 403; risposte native archiviate: 401; errori nativi: 2.
Sessioni con almeno un'estrazione respinta: **26/52**.
In queste sessioni il confronto del componente conserva i dialoghi originali recuperabili. Questo fallback sperimentale va distinto dalla chiusura nativa dell'applicazione.

Il controllo applicativo in `integration/` ha uno stato separato. La preparazione dei file e il superamento dei test offline non equivalgono alla sua esecuzione live.

## Token e costi osservati

| Stage/condizione | Chiamate | Token input | Token output | USD dichiarati | Costo mancante |
|---|---:|---:|---:|---:|---:|
| extraction | 125 | 486610 | 341622 | 4.015350 | 0 |
| history_full | 32 | 540056 | 22826 | 0.848148 | 0 |
| raw_4000 | 32 | 210859 | 23551 | 0.469280 | 0 |
| raw_8000 | 32 | 323891 | 23073 | 0.580485 | 0 |
| structured_4000 | 32 | 213992 | 23800 | 0.468806 | 0 |
| structured_8000 | 32 | 330341 | 25325 | 0.636325 | 0 |
| summary | 52 | 121579 | 119828 | 1.350254 | 0 |
| summary_4000 | 32 | 180048 | 21669 | 0.411979 | 0 |
| summary_8000 | 32 | 261528 | 22715 | 0.521937 | 0 |

Le quantità sopra riguardano tutte le risposte native archiviate, anche quelle di preparazione o di un profilo incompleto. I costi eventualmente non comunicati per richieste fallite non sono contabilizzati come zero.

Il costo operativo di ogni configurazione comprende le proprie risposte, tutte le sintesi che richiede e, per structured, tutte le estrazioni. Il costo delle sintesi comuni non è zero solo perché viene condiviso durante il benchmark. I confronti di costo a parità di domande richiedono che la campagna sia completata; i token di ragionamento e le latenze sono nei record nativi.

## Contesto e tempi osservati

| Condizione | N risposte | Memoria stimata media / massima | Generazione mediana / p95 (s) | CPU costruzione contesto (s) |
|---|---:|---:|---:|---:|
| history_full | 32 | 21159.2 / 21432 | 7.98 / 9.85 | 0.083 |
| summary_4000 | 32 | 3909.5 / 3990 | 8.36 / 12.06 | 0.088 |
| summary_8000 | 32 | 7893.5 / 7956 | 8.09 / 10.66 | 0.329 |
| raw_4000 | 32 | 3957.4 / 3990 | 7.98 / 9.48 | 4.815 |
| raw_8000 | 32 | 7958.7 / 7994 | 8.15 / 9.56 | 4.913 |
| structured_4000 | 32 | 3971.5 / 3991 | 7.84 / 10.06 | 7.989 |
| structured_8000 | 32 | 7962.0 / 7993 | 8.46 / 21.31 | 8.180 |

La stima della memoria esclude profilo, domanda e istruzioni. I token effettivi del provider sono nella tabella dei costi. Le durate sono osservazioni descrittive, dipendenti anche dal provider e dall'ordine di esecuzione; p95 usa il rango superiore. Il tempo CPU comprende la costruzione del contesto e l'eventuale recupero, ma esclude l'inizializzazione dell'encoder.

Inizializzazioni encoder osservate: 5; CPU complessiva 11.804s, tempo trascorso 13.920s. I totali osservati conservano anche i caricamenti aggiuntivi dopo riprese autorizzate, recuperati dagli snapshot. In una configurazione distribuita separatamente il caricamento condiviso va attribuito una volta per paziente; i riavvii sono un costo operativo aggiuntivo.

## Valutazione semantica

Le condizioni sono nascoste al valutatore, che ha letto le risposte insieme a fonti e gold prespecificati. Il valutatore Codex ha anche partecipato alla preparazione del corpus: questa lettura non costituisce una valutazione clinica indipendente. Tutte le decisioni e le relative motivazioni sono archiviate.

## Limiti e dati

Questo confronto misura il componente di memoria con dialoghi prefissati. Il controllo API/grafo con risposte intermedie generate è separato in `integration/`. Nessuna superiorità dell'intero sistema o generalizzazione clinica segue da questi soli dati.

Protocollo e hash: `PROTOCOL.md`, `manifest.json`, `environment.json`. Fonti e gold: `corpus/`. Prompt e risposte: `run/<patient_id>/answers/`. Tutte le richieste, inclusi gli errori: `run/native.jsonl`. Valutazione automatica: `analysis/results.json`; lettura semantica: `analysis/blinded-review.json` e, quando presente, `analysis/semantic-adjudication.json`.
