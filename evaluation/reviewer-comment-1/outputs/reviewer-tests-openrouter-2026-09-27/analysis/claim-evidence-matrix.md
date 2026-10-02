# Critiche del revisore e prove richieste

Matrice preparata durante la campagna e aggiornata dopo il superamento delle
analisi complete di integrità del 27 settembre 2026. Il rapporto conclusivo è
[`REPORT.md`](../REPORT.md): 100 PHQ, 110 sessioni e 550 turni.

| Punto | Fonte e verifica | Conseguenza sostenibile |
|---|---|---|
| I punteggi pubblicati sono errati? | `main.tex:716` e `main.tex:734`; i JSON storici conservano Daniel=10, Crystal=26, Juanita=27. L'audit precedente ricalcola 30 risultati e coincide con lo scoring archiviato. | I punteggi sono supportati dai file storici. Questo non dimostra che una nuova generazione debba restituirli. |
| Perché il revisore ottiene valori diversi? | Cinquanta prompt ricostruiti dalla versione storica coincidono con il runner attuale. Gli output storici non conservano modello/versione, prompt effettivo, seed e parametri completi. Non abbiamo codice o output per item del revisore. | La causa esatta resta indeterminata. Una differenza di configurazione o contesto è plausibile, non provata. La nuova campagna documenta le configurazioni richieste e le continuazioni tra servizi; non ricostruisce retroattivamente quella storica mancante. |
| Cosa significa temperatura 0,1? | Il ramo PHQ del runner invia 0,1 e 220 token, con top-p 0,95, top-k 40, stop sequences e nessun seed del provider. Non usa la storia del grafo. | La sola temperatura non identifica un esperimento. Vanno conservati tutti i parametri richiesti e gli item, compresi retry e motivi di terminazione. La scheda Google consultata il 27 settembre 2026 indica top-k 64 fisso: il top-k40 dei log è un valore richiesto, non un valore effettivo attestato dal servizio (vedi `runtime/provider-capabilities-audit.json`). |
| Il contesto è il profilo clinico completo? | `_build_patient_context` usa campi selezionati, i primi 400 caratteri del caso clinico, stile cognitivo/interattivo e tre emozioni dominanti. | Somministrare con l'intero YAML o con un prompt narrativo diverso modifica l'esperimento. Il dettaglio deve essere esplicito nei metodi. |
| Daniel e la soglia PHQ-9 | `main.tex:734` descrive tre punteggi clinici tutti ≥10. Daniel è un profilo centrato sul binge eating; il paper riporta anche BES=34. La nuova campagna conta la frequenza ≥10 e la variabilità su 20 run. | Il PHQ misura sintomi depressivi. Il superamento della soglia non è un criterio universale di correttezza di un profilo clinico né una diagnosi del paziente simulato. Una singola osservazione sulla soglia non dimostra separazione stabile. |
| La continuità su 11 sessioni era già dimostrata? | I questionari sono somministrazioni indipendenti; la valutazione precedente usa trascrizioni di tre sessioni. Il generatore storico azzera la storia della baseline fra sessioni e omette campi clinici. | L'implementazione di memoria persistente e la descrizione della struttura non sostituiscono un confronto longitudinale adeguato. La critica sul divario di evidenza è fondata. |
| Cosa prova il nuovo confronto? | Cinque coppie di percorsi, 11 sessioni e cinque turni/sessione; stessi YAML e testi del terapeuta. Baseline con storia integrale; full con grafo, stato e memoria nativi. Sei prove primarie alla sessione 11 per paziente. | Confronto tecnico descrittivo di identità e ricordo di fatti. Non isola causalmente la struttura dalla gestione del contesto, non misura efficacia didattica e non sostituisce giudizi clinici. Va dichiarata la versione corretta del codice. |
| La memoria troncata è un'ipotesi? | Due richieste originali osservate terminano `MAX_TOKENS`. Il provider accettava testo incompleto e confrontava impropriamente l'enum SDK. Patch, 20 test e close/reopen reale documentati in `runtime/`. | Difetto confermato e corretto. Il completamento sintattico della memoria non dimostra conservazione semantica di ogni dettaglio. |
| I numeri misstep sono riproducibili? | Ricalcolo dei 600 giudizi clinici e dei 300 turni: metriche pubblicate coincidenti. Quindici frasi con errore distinte ripetute dieci volte. | I numeri descrivono correttamente questo corpus costruito. Non costituiscono 150 errori linguistici indipendenti o una stima su errori rari. |
| L'accecamento ha funzionato? | Le etichette di condizione erano rimosse dai fogli. Non è stata raccolta una misura della capacità dei clinici di indovinare la condizione dal testo. | Rimozione delle etichette verificata; efficacia dell'accecamento non misurata. La congettura del revisore non è dimostrata né confutata. |
| La precisione si trasferisce alle sessioni degli studenti? | Corpus con 150 errori deliberati su 300 turni, concentrati in dieci trascrizioni. κ totale circa0,519; sul sottoinsieme appropriate circa0,017. | Riportare la valutazione come analisi su corpus saturo e le precisioni come descrittive del corpus. Non generalizzarle a una prevalenza realistica non osservata. |
| Un test software verde risolve la revisione scientifica? | Backend reale passato: tRPC/PostgreSQL, risposta remota Agent, valutazione Vertex, chiusura e pulizia del database. | Prova di funzionamento nel percorso eseguito. Non prova validità clinica, realismo, efficacia formativa o assenza di ogni bug. |

## Interpretazione statistica prevista

Le 20 ripetizioni PHQ per profilo descrivono la campagna continuata attraverso
Vertex e OpenRouter; gli strati per servizio e le tre somministrazioni miste
sono dichiarati. Non sono 20 repliche con una sola configurazione effettiva del
servizio. Le 30 asserzioni primarie longitudinali per condizione sono
raggruppate in cinque pazienti; non vengono trattate come 30 pazienti indipendenti.
Sono riportati conteggi e confronti appaiati descrittivi, senza test di significatività
o intervalli che fingano una popolazione clinica campionata.

I fallimenti tecnici rimangono nel resoconto e sono distinti dai mancati richiami.
Non si rimuovono run perché sfavorevoli, non si adatta il criterio alle risposte,
le correzioni del trasporto sono dichiarate separatamente dal codice scientifico
congelato e non attestano l’equivalenza delle politiche dei servizi.

## Esiti conclusivi

- Daniel: PHQ medio 9,90, con 18/20 punteggi almeno pari a 10; nessuna separazione garantita dalla soglia.
- Continuità primaria: sistema completo 12/30, baseline con storia integrale 30/30. Identità 10/10 in entrambe le condizioni; il sistema completo recupera 2/15 fatti aggiornati e 0/5 titoli non interrogati fino a S11.
- Provenienza: 540 risposte longitudinali valide verificate, dieci esiti tecnici precedenti conservati. Tutte le prove primarie finali hanno risposte tecnicamente valide.
- Il confronto descrive cinque coppie di percorsi con continuazioni tra servizi; non isola causalmente la struttura della memoria né dimostra validità clinica.
