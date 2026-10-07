# Continuità della memoria: esecuzione e risultati

## Material Passport

- Materiali interamente sintetici; ARS-Codex, esperimento eseguito su richiesta dell'utente.
- Aggiornamento: 2026-09-28T11:24:39.936800+00:00.
- Modello: `google/gemini-2.5-pro`, OpenRouter.
- Stato del confronto: **stopped**.
- Sessioni preparate: **33/55**; risposte finali: **144/280**.
- Cinque traiettorie appaiate previste; dialoghi sorgente prefissati e uguali fra condizioni; una risposta per domanda e condizione.

## Arresto e lavoro restante

Il provider ha restituito un errore **429 in-band dentro una risposta HTTP 200**. Il controllo lo ha riconosciuto e ha arrestato la campagna. Richieste successive al primo errore: **0**. Nessun retry di disponibilità è stato effettuato.

Costo dichiarato dal provider per le risposte completate: **USD 6.006061**. La risposta d'errore dichiara separatamente un costo di USD 0.

Restano 24 risposte di Crystal, i due percorsi di Daniel e Juanita (22 sessioni e 112 risposte) e il controllo applicativo separato. Quest'ultimo **non è stato avviato**. Una ripresa richiede una nuova istruzione dell'utente e deve conservare tutte le risposte già completate.

## Risultati sui profili completi

Il confronto seguente usa soltanto i **2/5 profili completi**, con tutte le otto domande in ogni condizione. Le risposte del profilo interrotto sono riportate separatamente nella tabella per paziente; non si aggregano campioni con domande differenti fra condizioni.
Un confronto incompleto non consente una conclusione finale fra le condizioni.

| Condizione | Corrette sui profili completi | Previste su tutti i 5 profili |
|---|---:|---:|
| history_full | 16/16 | 40 |
| summary_4000 | 11/16 | 40 |
| summary_8000 | 13/16 | 40 |
| raw_4000 | 16/16 | 40 |
| raw_8000 | 16/16 | 40 |
| structured_4000 | 16/16 | 40 |
| structured_8000 | 16/16 | 40 |

Risposte archiviate ancora da valutare semanticamente: **0**.

## Per paziente

Per i profili incompleti i denominatori e le domande disponibili possono differire: le frazioni parziali non misurano una superiorità tra condizioni.

| Paziente | history_full | summary_4000 | summary_8000 | raw_4000 | raw_8000 | structured_4000 | structured_8000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| alex_carter_001 | 8/8 | 6/8 | 6/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| crystal_smith_001 (incompleto) | 4/4 | 2/7 | 4/4 | 4/4 | 4/4 | 5/5 | 4/4 |
| jason_smith_001 | 8/8 | 5/8 | 7/8 | 8/8 | 8/8 | 8/8 | 8/8 |

## Per categoria sui profili completi

| Categoria | history_full | summary_4000 | summary_8000 | raw_4000 | raw_8000 | structured_4000 | structured_8000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| abstention | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| completion | 2/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| proposal | 2/2 | 1/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| remote | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 |
| update_current | 2/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| update_past | 2/2 | 0/2 | 0/2 | 2/2 | 2/2 | 2/2 | 2/2 |

## Preparazione e disponibilità

Richieste native: 258; risposte native archiviate: 257; errori nativi: 1.
Sessioni con almeno un'estrazione respinta: **14/33**.
In queste sessioni il confronto del componente conserva i dialoghi originali recuperabili. Questo fallback sperimentale va distinto dalla chiusura nativa dell'applicazione.

Il controllo applicativo in `integration/` ha uno stato separato. La preparazione dei file e il superamento dei test offline non equivalgono alla sua esecuzione live.

## Token e costi osservati

| Stage/condizione | Chiamate | Token input | Token output | USD dichiarati | Costo mancante |
|---|---:|---:|---:|---:|---:|
| extraction | 80 | 322125 | 222696 | 2.620484 | 0 |
| history_full | 20 | 335486 | 14389 | 0.542555 | 0 |
| raw_4000 | 20 | 130631 | 14772 | 0.294955 | 0 |
| raw_8000 | 20 | 201460 | 14151 | 0.347411 | 0 |
| structured_4000 | 21 | 140202 | 15956 | 0.314180 | 0 |
| structured_8000 | 20 | 206178 | 15627 | 0.400216 | 0 |
| summary | 33 | 77251 | 76402 | 0.860584 | 0 |
| summary_4000 | 23 | 131288 | 15881 | 0.302307 | 0 |
| summary_8000 | 20 | 162314 | 14113 | 0.323370 | 0 |

Le quantità sopra riguardano tutte le risposte native archiviate, anche quelle di preparazione o di un profilo incompleto. I costi eventualmente non comunicati per richieste fallite non sono contabilizzati come zero.

Il costo operativo di ogni configurazione comprende le proprie risposte, tutte le sintesi che richiede e, per structured, tutte le estrazioni. Il costo delle sintesi comuni non è zero solo perché viene condiviso durante il benchmark. I confronti di costo a parità di domande richiedono che la campagna sia completata; i token di ragionamento e le latenze sono nei record nativi.

## Contesto e tempi osservati

| Condizione | N risposte | Memoria stimata media / massima | Generazione mediana / p95 (s) | CPU costruzione contesto (s) |
|---|---:|---:|---:|---:|
| history_full | 20 | 21060.8 / 21285 | 7.98 / 9.85 | 0.050 |
| summary_4000 | 23 | 3928.4 / 3990 | 8.67 / 12.06 | 0.068 |
| summary_8000 | 20 | 7886.4 / 7956 | 8.13 / 10.66 | 0.209 |
| raw_4000 | 20 | 3953.1 / 3990 | 8.04 / 9.48 | 2.872 |
| raw_8000 | 20 | 7956.7 / 7992 | 8.19 / 9.00 | 2.960 |
| structured_4000 | 21 | 3973.2 / 3991 | 7.95 / 10.06 | 4.878 |
| structured_8000 | 20 | 7962.4 / 7993 | 8.51 / 10.78 | 5.003 |

La stima della memoria esclude profilo, domanda e istruzioni. I token effettivi del provider sono nella tabella dei costi. Le durate sono osservazioni descrittive, dipendenti anche dal provider e dall'ordine di esecuzione; p95 usa il rango superiore. Il tempo CPU comprende la costruzione del contesto e l'eventuale recupero, ma esclude l'inizializzazione dell'encoder.

Inizializzazioni encoder osservate: 3; CPU complessiva 7.110s, tempo trascorso 8.374s. Il caricamento condiviso va attribuito una volta per paziente a ogni configurazione di recupero distribuita separatamente.

## Valutazione semantica

Le condizioni sono nascoste al valutatore, che ha letto le risposte insieme a fonti e gold prespecificati. Il valutatore Codex ha anche partecipato alla preparazione del corpus: questa lettura non costituisce una valutazione clinica indipendente. Tutte le decisioni e le relative motivazioni sono archiviate.

## Limiti e dati

Questo confronto misura il componente di memoria con dialoghi prefissati. Il controllo API/grafo con risposte intermedie generate è separato in `integration/`. Nessuna superiorità dell'intero sistema o generalizzazione clinica segue da questi soli dati.

Protocollo e hash: `PROTOCOL.md`, `manifest.json`, `environment.json`. Fonti e gold: `corpus/`. Prompt e risposte: `run/<patient_id>/answers/`. Tutte le richieste, inclusi gli errori: `run/native.jsonl`. Valutazione automatica: `analysis/results.json`; lettura semantica: `analysis/blinded-review.json` e, quando presente, `analysis/semantic-adjudication.json`.
