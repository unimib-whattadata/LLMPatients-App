# Continuità della memoria: esecuzione e risultati

## Material Passport

- Materiali interamente sintetici; ARS-Codex, esperimento eseguito su richiesta dell'utente.
- Aggiornamento: 2026-09-28T15:36:42.908874+00:00.
- Modello: `google/gemini-2.5-pro`, OpenRouter.
- Stato del confronto: **complete**.
- Sessioni preparate: **55/55**; risposte finali: **280/280**.
- Cinque traiettorie appaiate previste; dialoghi sorgente prefissati e uguali fra condizioni; una risposta per domanda e condizione.

## Risultati sui profili completi

Il confronto seguente usa **5/5 profili completi**, con tutte le otto domande in ogni condizione. Le condizioni sono confrontate sugli stessi cinque percorsi e sulle stesse domande.
Il confronto e la lettura semantica sono completi.

| Condizione | Corrette sui profili completi | Previste su tutti i 5 profili |
|---|---:|---:|
| history_full | 40/40 | 40 |
| summary_4000 | 20/40 | 40 |
| summary_8000 | 26/40 | 40 |
| raw_4000 | 40/40 | 40 |
| raw_8000 | 40/40 | 40 |
| structured_4000 | 40/40 | 40 |
| structured_8000 | 40/40 | 40 |

Risposte archiviate ancora da valutare semanticamente: **0**.

## Interpretazione del confronto

L'unità del confronto è il percorso del paziente: cinque percorsi appaiati, con una sola generazione per domanda e condizione. Le 280 risposte non sono 280 osservazioni indipendenti; non si stima la variabilità tra repliche.

Cronologia completa, recupero dei dialoghi originali e recupero con fatti strutturati ottengono tutti 40/40. In questo corpus non emerge un vantaggio di accuratezza dei fatti strutturati sul recupero dei dialoghi, né una superiorità sulla cronologia completa. La condizione con sola sintesi ottiene 20/40 a 4.000 token e 26/40 a 8.000 token.

Il risultato sostiene l'utilità del recupero rispetto alla sola sintesi con contesto limitato. Il minore contesto nelle domande finali non implica un risparmio complessivo: includendo sintesi ed estrazioni, il costo osservato delle configurazioni di memoria è maggiore in questo protocollo. Le estrazioni respinte e il fallback sui dialoghi originali limitano ulteriormente l'attribuzione del risultato ai soli fatti strutturati.

## Per paziente

Tutti i profili hanno otto risposte valutate in ciascuna condizione.

| Paziente | history_full | summary_4000 | summary_8000 | raw_4000 | raw_8000 | structured_4000 | structured_8000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| alex_carter_001 | 8/8 | 6/8 | 6/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| crystal_smith_001 | 8/8 | 3/8 | 4/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| daniel_isherwood_001 | 8/8 | 3/8 | 4/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| jason_smith_001 | 8/8 | 5/8 | 7/8 | 8/8 | 8/8 | 8/8 | 8/8 |
| juanita_delgado_001 | 8/8 | 3/8 | 5/8 | 8/8 | 8/8 | 8/8 | 8/8 |

## Per categoria sui profili completi

| Categoria | history_full | summary_4000 | summary_8000 | raw_4000 | raw_8000 | structured_4000 | structured_8000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| abstention | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| completion | 5/5 | 1/5 | 4/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| proposal | 5/5 | 1/5 | 1/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| remote | 10/10 | 7/10 | 7/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| update_current | 5/5 | 1/5 | 4/5 | 5/5 | 5/5 | 5/5 | 5/5 |
| update_past | 5/5 | 0/5 | 0/5 | 5/5 | 5/5 | 5/5 | 5/5 |

## Preparazione e disponibilità

Richieste native: 471; risposte native archiviate: 468; errori nativi: 3.
Sessioni con almeno un'estrazione respinta: **27/55**.
In queste sessioni il confronto del componente conserva i dialoghi originali recuperabili. Questo fallback sperimentale va distinto dalla chiusura nativa dell'applicazione.

Il controllo applicativo in `integration/` ha uno stato separato. La preparazione dei file e il superamento dei test offline non equivalgono alla sua esecuzione live.

## Token e costi osservati

| Stage/condizione | Chiamate | Token input | Token output | USD dichiarati | Costo mancante |
|---|---:|---:|---:|---:|---:|
| extraction | 132 | 521723 | 361461 | 4.257631 | 0 |
| history_full | 40 | 674344 | 28628 | 1.053334 | 0 |
| raw_4000 | 40 | 261174 | 29231 | 0.566057 | 0 |
| raw_8000 | 41 | 412515 | 29852 | 0.759054 | 0 |
| structured_4000 | 40 | 265156 | 30307 | 0.588665 | 0 |
| structured_8000 | 40 | 411122 | 31942 | 0.798879 | 0 |
| summary | 55 | 129233 | 127410 | 1.435641 | 0 |
| summary_4000 | 40 | 222704 | 27911 | 0.523140 | 0 |
| summary_8000 | 40 | 324912 | 27946 | 0.646594 | 0 |

Le quantità sopra riguardano tutte le risposte native archiviate, anche quelle di preparazione o prive di testo finale utilizzabile. I costi eventualmente non comunicati per richieste fallite non sono contabilizzati come zero.

### Costo attribuito a ogni configurazione

Ogni riga comprende cinque percorsi e 40 domande finali; le sintesi comuni sono attribuite integralmente a ciascuna configurazione che le usa. I costi locali dell'encoder sono registrati separatamente, senza convertirli in USD.

| Configurazione | Risposte USD | Sintesi USD | Estrazioni USD | Totale USD |
|---|---:|---:|---:|---:|
| history_full | 1.053334 | 0.000000 | 0.000000 | 1.053334 |
| summary_4000 | 0.523140 | 1.435641 | 0.000000 | 1.958782 |
| summary_8000 | 0.646594 | 1.435641 | 0.000000 | 2.082235 |
| raw_4000 | 0.566057 | 1.435641 | 0.000000 | 2.001698 |
| raw_8000 | 0.759054 | 1.435641 | 0.000000 | 2.194696 |
| structured_4000 | 0.588665 | 1.435641 | 4.257631 | 6.281937 |
| structured_8000 | 0.798879 | 1.435641 | 4.257631 | 6.492152 |

Il costo operativo di ogni configurazione comprende le proprie risposte, tutte le sintesi che richiede e, per structured, tutte le estrazioni. Il costo delle sintesi comuni non è zero solo perché viene condiviso durante il benchmark. I token di ragionamento e le latenze sono nei record nativi. La risposta storica vuota in raw_8000 resta inclusa nel suo costo operativo, pur non essendo una delle 40 risposte valutate.

## Contesto e tempi osservati

| Condizione | N risposte | Memoria stimata media / massima | Generazione mediana / p95 (s) | CPU costruzione contesto (s) |
|---|---:|---:|---:|---:|
| history_full | 40 | 21185.2 / 21432 | 8.03 / 10.12 | 0.099 |
| summary_4000 | 40 | 3894.4 / 3990 | 8.65 / 12.06 | 0.109 |
| summary_8000 | 40 | 7884.0 / 7956 | 8.09 / 10.72 | 0.405 |
| raw_4000 | 40 | 3956.9 / 3993 | 7.98 / 9.58 | 6.617 |
| raw_8000 | 40 | 7957.4 / 7994 | 8.26 / 10.46 | 7.600 |
| structured_4000 | 40 | 3969.8 / 3994 | 7.84 / 10.06 | 10.914 |
| structured_8000 | 40 | 7963.8 / 7994 | 8.63 / 21.31 | 11.121 |

La stima della memoria esclude profilo, domanda e istruzioni. I token effettivi del provider sono nella tabella dei costi. Le durate sono osservazioni descrittive, dipendenti anche dal provider e dall'ordine di esecuzione; p95 usa il rango superiore. Il tempo CPU comprende la costruzione del contesto e l'eventuale recupero, ma esclude l'inizializzazione dell'encoder.

Inizializzazioni encoder osservate: 8; CPU complessiva 19.217s, tempo trascorso 23.965s. I totali osservati conservano anche i caricamenti aggiuntivi dopo riprese autorizzate, recuperati dagli snapshot. In una configurazione distribuita separatamente il caricamento condiviso va attribuito una volta per paziente; i riavvii sono un costo operativo aggiuntivo.

## Valutazione semantica

Le condizioni sono nascoste al valutatore, che ha letto le risposte insieme a fonti e gold prespecificati. Il valutatore Codex ha anche partecipato alla preparazione del corpus: questa lettura non costituisce una valutazione clinica indipendente. Tutte le decisioni e le relative motivazioni sono archiviate.

## Controllo nell'applicazione: arresto alla prima chiusura

Il controllo separato ha usato il profilo sintetico Alex, le funzioni native
`send_message`/`end_session`, il grafo e la memoria persistente del runtime
congelato in `integration/source/`. Era previsto un nuovo processo per ciascuna
delle 11 sessioni, con cinque scambi per sessione. Il test esegue le funzioni
delle route senza avviare un server HTTP.

| Misura | Osservazione |
|---|---:|
| Sessioni iniziate | 1/11 |
| Sessioni finalizzate | 0/11 |
| Scambi accettati e archiviati | 5/55 |
| Domande di verifica osservate | 0/6 |
| Richieste / risposte del provider | 14/14 |
| Errori del servizio | 0 |
| Costo dichiarato | USD 0,157624 |

L'esecuzione è durata dal 28 settembre 2026, 15:27:11 UTC, alle 15:29:59 UTC.
Tutte le risposte native avevano HTTP 200 e terminazione STOP. Dopo i cinque
scambi, la chiusura ha sollevato `SessionMemoryError` durante il consolidamento
dei fatti. La sessione è rimasta aperta e il controllo si è fermato; nessuna
sessione successiva o ripetizione automatica è stata avviata.

### Causa riprodotta offline

Il batch originale proponeva 15 fatti. Il validatore congelato rifiuta il secondo:
la frase del paziente «keeping a notebook sounds totally fine» viene etichettata
`agreed`, ma il controllo deterministico richiede specifiche parole esplicite di
accordo. La frase non soddisfa tale regola. Il rifiuto di un solo fatto interrompe
l'intero batch e si propaga alla finalizzazione della sessione.

Il replay offline ha usato lo stesso testo del modello, le stesse fonti e lo
stesso validatore, ricostruendo un prompt identico. Ha riprodotto l'errore senza
chiamate al modello e senza modificare gli artefatti originali. L'ispezione dei
singoli fatti è diagnostica e non sostituisce il risultato del batch originale.
Si vedano `analysis/integration-diagnosis.json` e `.md`.

Restano persistiti cinque turni originali e una sintesi episodica. La riflessione
e la sintesi cumulativa erano state generate, ma non sono state persistite dopo
il fallimento del consolidamento. Non risultano batch di fatti salvati né una
chiusura nativa riuscita.

### Cosa consente di affermare

Questo controllo rileva un problema operativo nella finalizzazione della memoria.
Non ha osservato alcun passaggio completo alla sessione successiva né le domande
finali, quindi **non dimostra la continuità dell'applicazione lungo 11 sessioni**.
Le sei domande non osservate non sono sei risposte semanticamente errate.

Il risultato del componente resta valido per le condizioni dichiarate: in quel
confronto i fatti respinti lasciano disponibili i dialoghi originali, mentre il
percorso nativo qui interrompe la chiusura. Tale differenza impedisce di
trasferire il 40/40 del componente a una validazione completa dell'applicazione.

Occorre correggere e verificare la gestione dei fatti respinti nella chiusura,
poi eseguire un controllo applicativo con la versione corretta, conservando
questo fallimento come risultato della versione qui congelata. I parametri di
memoria e la barriera di attesa degli episodi usati nel controllo sono descritti
in `integration/PROTOCOL.md`; non costituiscono una prova di 11 fasi cliniche.

Dati: `analysis/integration-results.json`, `integration/runtime/sessions/session_01/`,
`integration/runtime/memory/`, `integration/runtime/runs/` e
`integration/runtime/probe-review.json`.

## Limiti e dati

Questo confronto misura il componente di memoria con dialoghi prefissati. Il controllo API/grafo con risposte intermedie generate è separato in `integration/`. Nessuna superiorità dell'intero sistema o generalizzazione clinica segue da questi soli dati.

Protocollo e hash: `PROTOCOL.md`, `manifest.json`, `environment.json`. Fonti e gold: `corpus/`. Prompt e risposte: `run/<patient_id>/answers/`. Tutte le richieste, inclusi gli errori: `run/native.jsonl`. Valutazione automatica: `analysis/results.json`; lettura semantica: `analysis/blinded-review.json` e, quando presente, `analysis/semantic-adjudication.json`.
