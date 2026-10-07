## Material Passport

- Oggetto: audit offline del checkpoint e del report parziale del confronto di memoria.
- Data: 2026-09-28.
- Materiali: `REPORT.md`, `analysis/results.json`, `semantic-adjudication.json`, `stop-evidence.json`, risposte/checkpoint, registro nativo e manifest locali.
- Metodo: ricalcolo dai file originali, confronto delle identità dei record e ispezione dei giudizi semantici. Nessuna API, nessun accesso alla chiave, nessuna ripresa e nessuna modifica a dati o harness.
- Stato: ANALYZED; numeri del report aggiornato confermati. Questo audit non è una replica delle inferenze.

## Esito

Il report aggiornato rappresenta correttamente un'esecuzione **interrotta e incompleta**. La tabella comparativa primaria usa esclusivamente Alex e Jason, entrambi completi, con le stesse otto domande per condizione: **16 osservazioni per braccio**. Crystal è separata perché le domande disponibili e i denominatori differiscono fra condizioni.

Non sono presenti affermazioni di superiorità della memoria strutturata o di completamento del controllo applicativo end-to-end. I risultati osservati uguali fra cronologia completa, recupero originale e memoria strutturata non costituiscono un test statistico di equivalenza.

## Conteggi ricalcolati

| Voce | Verifica |
|---|---:|
| Sessioni di preparazione complete | 33/55 |
| Risposte finali complete | 144/280 |
| Jason | 11 sessioni; 56 risposte |
| Alex | 11 sessioni; 56 risposte |
| Crystal | 11 sessioni; 32 risposte, profilo incompleto per le domande finali |
| Sessioni con almeno un'estrazione respinta | 14/33 |
| Richieste native | 258 |
| Risposte native completate | 257 |
| Errori nativi | 1 |
| Richieste successive al primo errore | 0 |
| Giudizi semantici archiviati e abbinati a una risposta | 144/144 |

**14/33 riguarda le sessioni**, non il numero di chiamate di estrazione. Le chiamate di estrazione completate dal provider sono 80; il rifiuto del validatore avviene dopo una risposta del modello e resta un esito del componente. La conservazione delle fonti originali durante questi fallimenti è dichiarata e non equivale a una finalizzazione applicativa riuscita.

Restano 24 risposte di Crystal, 22 sessioni e 112 risposte dei due profili non iniziati, più il controllo applicativo separato. L'assenza di `integration/runtime` concorda con lo stato `integration_started=false`; non sono presenti risultati live di quell'integrazione.

## Tabella primaria verificata

| Condizione | Alex | Jason | Totale sui soli profili completi |
|---|---:|---:|---:|
| history_full | 8/8 | 8/8 | 16/16 |
| summary_4000 | 6/8 | 5/8 | 11/16 |
| summary_8000 | 6/8 | 7/8 | 13/16 |
| raw_4000 | 8/8 | 8/8 | 16/16 |
| raw_8000 | 8/8 | 8/8 | 16/16 |
| structured_4000 | 8/8 | 8/8 | 16/16 |
| structured_8000 | 8/8 | 8/8 | 16/16 |

Le tabelle per paziente e categoria nel report corrispondono al ricalcolo dai giudizi semantici. Per Crystal sono corretti i conteggi rispettivi 4/4, 2/7, 4/4, 4/4, 4/4, 5/5, 4/4; non vengono usati per costruire un confronto aggregato sbilanciato.

I 144 review_id sono unici e corrispondono esattamente ai 144 record di analisi e alle risposte locali. Le tre fonti della valutazione semantica corrispondono ai propri hash. Le risposte non canoniche accettate sono coerenti con le relazioni del gold; i tredici giudizi negativi descrivono astensioni su fatti noti o risposte a un tipo di informazione diverso. La partecipazione del valutatore alla preparazione del corpus è dichiarata: non è una revisione clinica indipendente.

## Arresto e conservazione dei risultati

Il registro nativo attesta l'errore alle **11:17:56.911583 UTC**, record `4c040af8-9d55-4805-bd2a-df2ffc3db8f4`: HTTP 200 con terminazione `error` e codice upstream **429**. Il checkpoint del controller registra l'arresto alle 11:17:57.519955 UTC. L'ultimo lavoro incompleto è `crystal_smith_001/raw_4000/previous_slot`, con un solo tentativo e stato `stopped_provider_error`.

La scansione completa del registro trova zero richieste dopo l'errore. Tutte le 144 risposte finali corrispondono a checkpoint `complete`, con un solo tentativo STOP e testo identico al risultato salvato. Non risultano rigenerazioni delle risposte completate.

## Costi e incongruenza corretta

Il subtotale ricalcolato con aritmetica decimale sulle **257 risposte native completate** è **USD 6.006061125**. Tutti i gruppi di costo, conteggi delle chiamate, token input/output e valori arrotondati nel report corrispondono ai record nativi. Non manca il campo costo in alcuna di queste 257 risposte.

L'ispezione iniziale ha trovato una discrepanza in `stop-evidence.json`: il costo della richiesta fallita era descritto come non comunicato. Il record nativo dell'errore contiene invece esplicitamente `usage.cost=0`, con token e dettagli di costo a zero. La discrepanza è stata segnalata prima della conclusione dell'audit; il parent ha corretto la descrizione e aggiunto `error_request_reported_cost=0`. Il report aggiornato indica separatamente il costo dichiarato di zero della risposta d'errore. Il subtotale dei completamenti resta invariato.

Anche le medie/massimi di contesto, mediane/p95 dei tempi e somme CPU per condizione coincidono con il ricalcolo. Sono osservazioni su tutte le risposte disponibili, inclusa Crystal, non un confronto bilanciato di efficienza. Il report distingue la preparazione dalle risposte e non omette il costo operativo delle sintesi e delle estrazioni condivise.

## Controllo metodologico: 11/11 categorie esaminate

| Categoria | Esito nel report parziale |
|---|---|
| Paradosso di Simpson | Tabelle per profilo e categoria controllate; Crystal non viene aggregata al confronto primario. |
| Fallacia ecologica | Nessuna inferenza su persone o risultati clinici da dati sintetici aggregati. |
| Selezione/Berkson | I due profili disponibili sono un prefisso operativo, non un campione rappresentativo; il limite è esplicito. |
| Collider bias | Nessun aggiustamento per variabili causate da condizione ed esito. |
| Base rate neglect | Nessuna precisione diagnostica/prevalenza clinica inferita; categorie e denominatori sono mostrati. |
| Regressione verso la media | Nessuna affermazione pre/post di miglioramento derivata dal confronto con la campagna precedente. |
| Survivorship bias | Profili incompleti e fallimenti sono conservati; il confronto sui due completi è etichettato e non generalizzato ai cinque. |
| Look-elsewhere | Tutti i sette bracci sono riportati, senza selezionare soltanto il confronto favorevole. |
| Garden of forking paths | Corpus, codice e protocollo restano coerenti con i manifest; la correzione del costo è una rettifica documentale, non una modifica degli esiti. |
| Correlazione/causalità | Nessuna conclusione di superiorità dell'intero sistema o efficacia clinica. |
| Causalità inversa | Preparazione precede le domande finali; le risposte finali non vengono reintrodotte come fonti di memoria. |

Non sono prodotti p-value, intervalli inferenziali o stime di generalizzazione da queste due traiettorie complete. Le 144 risposte disponibili non vengono considerate osservazioni indipendenti.

## Integrità degli artefatti

- Manifest componente: 34 file verificati, zero mismatch.
- Manifest integrazione: 33 file verificati, zero mismatch.
- Registro nativo SHA-256: `2d57920b723613837ae68b1dcd7ceed25907a2a158dc68f4794218b6201418e5`.
- `REPORT.md`: `cf7061e680c58f97d178256b585b3e4e86b217c3f34ef0e56cac95f550609652`.
- `analysis/results.json`: `36896681374b003510807e6fe81d38a9d8481b00ea3b65b9d647de781ad32b73`.
- `analysis/semantic-adjudication.json`: `a9bd948740557dace792cb95ccdb349f837678282615170ac3e01fec3bace4a8`.
- `analysis/stop-evidence.json`: `f05e97db72d1c5d9d833da1e4f3f4641a8c199d92ef4eac077a9e93156a5e2d2`.

## Conclusione dell'audit

Nessuna ulteriore incongruenza rilevata dopo la rettifica del costo dell'errore. Il report è utilizzabile come resoconto parziale e deve mantenere l'arresto, il perimetro dei due profili completi, i fallimenti di estrazione e l'integrazione non eseguita. Questo audit non autorizza né esegue una ripresa.
