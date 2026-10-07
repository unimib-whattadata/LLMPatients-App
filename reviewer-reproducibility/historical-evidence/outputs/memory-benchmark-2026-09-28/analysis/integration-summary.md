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
