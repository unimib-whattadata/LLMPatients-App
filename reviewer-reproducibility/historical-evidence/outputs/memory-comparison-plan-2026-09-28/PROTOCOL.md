# Confronto prospettico della continuità su undici sessioni

## Material Passport

- Skill: ARS-Codex, experiment-agent, plan; audit locale delle evidenze esistenti.
- Data del piano: 2026-09-29, Europe/Rome.
- Stato: **protocollo e materiali preparati; confronto live non eseguito**.
- Domanda confermata dall'utente: continuità della memoria nelle undici sessioni
  e confronto con una baseline narrativa contenente le stesse informazioni.
- Dati: cinque profili interamente simulati; OpenRouter e Gemini 2.5 Pro già
  indicati dall'utente. Nessun partecipante umano e nessun invio a revisori esterni.
- La definizione qui sotto è un piano tecnico descrittivo. Non è una
  preregistrazione pubblica, una validazione clinica o un risultato sperimentale.

## 1. Domanda e interpretazione prevista

Con gli stessi dati clinici, messaggi del terapeuta e impostazioni di risposta,
come differiscono il pacchetto applicativo con memoria persistente e un paziente
basato su un prompt narrativo con tutta la propria cronologia?

Si misurano identità persistente, richiamo di un fatto distante, correzione di
appuntamenti, sostituzione del luogo, completamento rispetto a pianificazione e
astensione su un dettaglio mai stabilito. Nessun vantaggio è presupposto. Parità
o vantaggio della baseline sono risultati ammissibili e vanno riportati.

Il confronto riguarda due **pacchetti applicativi**. Nel braccio strutturato
restano classificazione, dinamica dello stato, recupero e consolidamento; una
differenza non identifica causalmente il solo contributo dei fatti strutturati.
Il benchmark precedente dei componenti rimane una prova separata.

## 2. Evidenza che motiva il disegno

L'audit di `s11t02` mostra che 17:45 e 09:30 erano presenti nelle fonti precedenti,
nei fatti persistiti, nei risultati del recupero e nel prompt realmente inviato.
Entrambi sono assenti nella risposta grezza e in quella dell'API. Il completamento
termina con STOP. Il punteggio parziale originale rimane invariato; non è stata
osservata una perdita di quei due dati durante salvataggio o recupero.

Il codice di versionamento considera la chiave entità/attributo/parlante/stato.
Due nomi diversi della stessa attività possono quindi mantenere due etichette
`current`. Questo limite viene registrato, senza attribuirgli la causa
dell'omissione e senza modificare retroattivamente fatti o risposte.

Un secondo controllo ha mostrato che il renderer clinico nativo seleziona e
tronca alcune sezioni. La precedente baseline narrativa esponeva invece tutte
le foglie dei gruppi clinici selezionati. Usare lo stesso YAML da solo non
assicura parità del contenuto visto dal modello. Il blocco clinico comune
definito sotto risolve questa differenza nel futuro confronto.

## 3. Disegno e unità di analisi

| Elemento | Definizione |
|---|---|
| Profili | Alex Carter, Crystal Smith, Daniel Isherwood, Jason Smith, Juanita Delgado |
| Ripetizioni | 3 esecuzioni distinte per profilo e braccio |
| Bracci | `structured_common_profile`, `flat_full_history` |
| Dimensione | 15 coppie appaiate, 30 traiettorie |
| Ogni traiettoria | 11 sessioni di 5 scambi generati realmente dal modello |
| Totale pianificato | 330 sessioni, 1.650 risposte paziente, 180 risposte ai 6 probe |
| Unità descrittiva | Traiettoria; raggruppamento per profilo e ripetizione |
| Stato iniziale | Memoria vuota e identificatori distinti per ciascuna traiettoria |

I cinque profili e le categorie dei probe sono già conosciuti durante lo
sviluppo. Il copione base viene riutilizzato, con domande rese esplicite, per
misurare la variabilità fra esecuzioni sul medesimo compito. Queste prove non
sono un insieme di casi clinici indipendente o mai osservato.

Tre ripetizioni costituiscono una scelta pratica per questa verifica descrittiva,
non una numerosità ricavata da un'analisi di potenza. Non si tratteranno le 180
risposte come altrettante osservazioni indipendenti. Il numero di traiettorie
non viene aumentato o ridotto in funzione del vantaggio osservato.

## 4. Contenuto clinico comune

Il generatore legge i cinque YAML congelati e produce un testo lineare di
attributi clinici, insieme a una mappa completa percorso→valore. Comprende tutte
le foglie di `profile`, `clinical`, `therapy` e `chat`, eccetto `profile.avatarUrl`.
Sono esclusi identicamente per entrambi i bracci i metadati `voice` e
`identifiers`, compreso `identifiers.disorderId`, usato come identificatore
tecnico. Le diagnosi espresse nei gruppi clinici restano incluse.

Non si inferiscono nuovi sintomi o diagnosi. Null, informazioni non riportate,
valori falsi e zero mantengono il proprio significato originale. Discrepanze
interne del profilo restano documentate; non si correggono durante l'esperimento.

Ogni richiesta paziente ha questa struttura:

```
COMMON_INSTRUCTIONS
COMMON_CASE_BLOCK
ARM_CONTEXT
CURRENT_THERAPIST_INPUT
```

`COMMON_CASE_BLOCK` è generato una sola volta per profilo. Il controllo di parità
richiede identità dei suoi byte e dell'hash in ogni richiesta di entrambi i bracci,
oltre alla presenza una sola volta. Il testo clinico nativo selettivo non viene
aggiunto come un secondo profilo: identity, stable identity, cognitive style,
observed interaction style e sezioni cliniche per topic sono sostituite dal
blocco comune nell'adapter sperimentale.

Questo richiede un adapter del nodo `build_prompt`, caricato prima della
compilazione del grafo, costruito esplicitamente da componenti. Non si modifica
il prompt completo con sostituzioni testuali fragili. Il renderer sperimentale
e il suo diff dovranno essere inclusi nel manifest di esecuzione: il braccio
strutturato non è presentato come la produzione eseguita senza adattamenti.

## 5. Condizioni e accesso alla storia

### `structured_common_profile`

Grafo, aggiornamento dello stato, recupero delle fonti, conservazione dei turni,
quarantena delle proposte e chiusura delle sessioni derivano dal runtime nativo
già verificato. La correzione del falso positivo `call` dentro `recall` è presente
dal primo turno. Il blocco di memoria conserva il comportamento nativo e i suoi
limiti: evidenze 1.800 token stimati, memorie episodiche 700 token stimati,
storia recente 1.800 token stimati. La sintesi cumulativa ha un limite separato
di 900 caratteri (soglia di compressione 1.200) e la riflessione di 600 caratteri. Il contatore locale non è dichiarato
equivalente al tokenizer del provider.

Topic ed emozioni dinamiche possono comparire come stato del braccio; devono
essere identificati separatamente dal profilo clinico comune. Le relative
generazioni e i costi fanno parte del pacchetto.

### `flat_full_history`

Il paziente riceve il blocco clinico comune e **tutta la propria cronologia**,
in ordine, comprendente messaggi terapeutici e risposte paziente già prodotti
dallo stesso braccio. La storia viene ricostruita dal registro integrale su
disco, non dalla finestra `history` nativa, limitata a cinque scambi.

Non riceve sintesi, fatti estratti, risultati del braccio strutturato o risposte
attese. Conserva i dialoghi su disco e li rilegge in ogni nuovo processo/sessione.
La chiusura registra stato e conteggi della baseline; non viene chiamata una
finalizzazione della memoria strutturata che questo braccio non possiede.

### Controlli comuni

Stessi messaggi del terapeuta, stesso modello, stesse impostazioni delle risposte,
istruzioni di stile e trattamento delle correzioni, accordi, proposte,
completamenti e dati assenti. Entrambi devono rispondere in inglese come paziente,
con linguaggio naturale. Le richieste composte chiedono esplicitamente tutti i
campi, con valori esatti quando disponibili. I controlli deterministici comuni
sull'input e la normalizzazione dell'output devono essere gli stessi; eventuali
altri controlli specifici del grafo sono parte dichiarata del pacchetto.

I dialoghi paziente sono generati separatamente: non si impongono risposte uguali
e non si copiano risposte da una condizione all'altra. Le differenze della storia
prodotte dai due bracci sono parte dell'esito.

La baseline completa non viene troncata per far emergere un vantaggio della
memoria. Si controlla prima di ogni invio un tetto comune di 64.000 token stimati
per l'intero prompt. È un limite operativo locale, non una dichiarazione sul
contesto massimo di Gemini. Se viene superato, si arresta il confronto per
incompatibilità del disegno e si conserva il caso; non si taglia solo un braccio.
Token effettivi e prompt completi sono sempre archiviati.

## 6. Copioni e probe

Si usano 55 messaggi terapeutici per traiettoria, basati sul percorso nativo già
verificato. Tutti i fatti arbitrari necessari ai probe sono introdotti
esplicitamente dal terapeuta prima della domanda. Non si riusano le risposte
paziente prefissate del benchmark dei componenti: contenevano informazioni che
non sarebbero garantite con risposte live.

Le sei domande vengono formulate senza valori attesi e in modo da richiedere
tutti i campi valutati. In particolare s11t02 chiede nome del partner, giorno e
ora attuali, giorno e ora precedenti, giorno e ora della sola proposta. Questa
precisazione appartiene al nuovo protocollo e vale per entrambi i bracci: non
modifica la valutazione della risposta già osservata.

| Probe | Esito completo richiesto |
|---|---|
| Identità persistente | Nome e età del profilo canonico |
| Fatto distante | Titolo esatto del quaderno introdotto nella prima sessione |
| Correzione/proposta | Partner e tutti i giorni/orari, con lo stato corretto |
| Sostituzione | Luogo attuale e luogo precedente correttamente distinti |
| Attività | Attività completata e attività telefonica ancora pianificata |
| Dato assente | Riconoscere che il cognome del prenotante non è stato stabilito, senza inventarlo |

Copioni e gold sono file separati; il worker riceve solo i messaggi terapeutici
previsti fino al turno corrente. Il gold segue i dati canonici del profilo e i
record espliciti del terapeuta relativi all’esercizio. Affermazioni spontanee o
supposizioni del paziente non li sostituiscono. Le domande sui fatti della pratica
chiedono quanto il terapeuta ha registrato; il probe assente chiede un cognome
mai registrato e confermato da lui, non un nome che il paziente potrebbe aver
inventato nella propria storia. Le medesime regole sono comunicate ai due bracci.
Il controllo offline verifica che ogni valore
fattuale atteso abbia una fonte precedente e che il dato assente non sia stato
introdotto. Il gold non viene passato al recupero o ai modelli.

È un test tecnico di continuità in undici sessioni brevi. Non simula integralmente
undici sedute cliniche né dimostra efficacia terapeutica o fedeltà a undici fasi
di un trattamento clinico.

## 7. Modello, ordine ed esecuzione

- Endpoint: OpenRouter; modello richiesto `google/gemini-2.5-pro`.
- Risposte paziente: temperatura 0,7; top-p 0,95; massimo output 4.096;
  thinking budget 1.024; stop `\nTherapist:` e `Therapist:`.
- Classificazione nativa: temperatura 0; output 4.096. Sintesi, riflessione ed
  estrazione native: temperatura 0,2; output 8.192; stesso top-p e thinking budget.
- Nessun seed API e nessun top-k inoltrato. I numeri delle ripetizioni non sono
  seed del modello. L'identificatore richiesto non garantisce pesi immutabili;
  si archiviano modello/backend effettivamente restituiti e date.
- `require_parameters=true`; nella futura esecuzione `allow_fallbacks=false`
  per evitare instradamenti alternativi automatici. L'audit precedente mostra
  `allow_fallbacks=true`: questa differenza deve comparire nel manifest nuovo.
- Ordine delle 15 coppie e ordine dei bracci a ogni sessione fissati con seed
  locale 20260929; la sequenza è salvata prima dell'esecuzione. Le due sessioni
  appaiate dello stesso indice sono eseguite vicine nel tempo, in ordine casuale.
- Un processo nuovo per sessione/braccio, con identificatori e directory isolati.
  Alla riapertura, verificare conteggio cumulativo, registro e memoria precedente.
- Un solo canale seriale globale, minimo cinque secondi tra gli inizi delle
  richieste. Timeout HTTP 120 secondi; timeout del worker 1.200 secondi per sessione.

Le impostazioni effettive, inclusi i parametri omessi dal trasporto, vanno
controllate nei request body archiviati. Il primo blocco appaiato non è un pilot
da eliminare: fa parte del campione previsto se codice e protocollo restano uguali.

## 8. Arresti, riprese e integrità

Vale l'istruzione dell'utente: al primo errore nuovo di servizio, rate limit,
trasporto o completamento vuoto si ferma **l'intera matrice**. Nessun test di
disponibilità, retry di disponibilità o cambio di provider viene avviato
automaticamente. Un'eventuale ripresa deve seguire una successiva istruzione
dell'utente e conservare tutte le risposte già ottenute, inclusi gli errori.

Rimane soltanto il recupero tecnico prespecificato dopo MAX_TOKENS: un tentativo
aggiuntivo 4.096→8.192 quando applicabile, con entrambi gli esiti archiviati.
Una risposta completata non viene rigenerata per migliorarne l'accuratezza.

Intento e identificatore della richiesta vengono persistiti prima dell'invio.
Una richiesta dall'esito incerto deve essere riconciliata con i log nativi; non
si ripete alla cieca. Cambiamenti del codice dopo l'avvio richiedono un emendamento
e una traiettoria separata. I risultati precedenti non diventano quelli della
versione corretta.

Le risposte alterate dal filtro e i fallimenti applicativi conservano il loro
posto nei probe pianificati. Errori del provider prima di una risposta valida
sono dati mancanti di disponibilità, non errori semantici del paziente. Si
riportano separatamente completamento/30, copertura dei probe e accuratezza.
L’analisi dei soli probe osservabili in entrambi i bracci è secondaria e indica
esplicitamente il proprio denominatore ridotto. L’esito primario mantiene i sei
probe pianificati e tratta i mancanti attraverso i limiti estremi definiti sotto.

## 9. Valutazione con etichette dei bracci nascoste

Prima dell'esecuzione viene definita una rubrica con gli esiti `complete`,
`partial`, `incorrect`, `contradictory`, `appropriate_abstention` e
`unjustified_abstention`. Il successo primario richiede tutti i campi e tutte le
relazioni corretti; per il probe assente richiede un'astensione appropriata.
Un valore corretto accanto a una contraddizione non dà un successo completo.

Un esportatore separato prepara schede con ID opachi, domanda, risposta grezza
valutabile e fonti/gold pertinenti. Non include nome del braccio, prompt,
metadati del recupero, costi o percorso del file. La chiave di abbinamento resta
fuori dal pacchetto dei valutatori; ordine e hash vengono salvati.

La proposta operativa è usare due contesti Codex separati, privi della cronologia
dell'esperimento e del lavoro dell'altro valutatore. Si registrano modelli e
input effettivi. È una valutazione automatizzata con metadati del braccio
mascherati, non una valutazione clinica umana indipendente; lo stile della
risposta può comunque suggerire la condizione. Non si dichiara cecità perfetta.

Ogni disaccordo conserva i due giudizi e viene esaminato in un terzo contesto,
ancora senza la chiave dei bracci, applicando la stessa rubrica. Nessuna risposta
viene riscritta. In assenza di valutatori separati, lo stato resta
`semantic_review_pending`: il giudizio del contesto che ha costruito il sistema
non viene presentato come una valutazione cieca.

## 10. Analisi e limiti delle conclusioni

### Esito primario

Proporzione di successi completi sui sei probe per traiettoria. Con `c` successi
e nessun dato mancante è `c/6`. Con `m` probe non osservati per indisponibilità
si riporta l’intervallo descrittivo `[c/6, (c+m)/6]`, non una stima puntuale ottenuta
escludendoli. Per la differenza structured−flat si usa il valore esatto quando
i due esiti sono completi; altrimenti il limite `[A_min−B_max, A_max−B_min]`.
Questi sono limiti di identificazione, non intervalli di confidenza.

Si riportano differenze appaiate per profilo e ripetizione; media delle tre ripetizioni
per ciascun profilo e riepilogo sui cinque profili. Riportare numeratori e
denominatori, dati mancanti e distribuzioni, compresi i casi di parità.

Non si calcolano p-value trattando i probe come indipendenti. Il piano è
descrittivo, con pochi profili scelti; non stabilisce generalizzazione clinica,
equivalenza formale o superiorità nella popolazione.

### Esiti secondari

- Completezza dei singoli campi e stato delle relazioni temporali.
- Contraddizioni, astensioni appropriate/inappropriate e dettagli inventati.
- Presenza del valore nella fonte, nello storage, nel recupero e nel prompt
  effettivo: omissione generativa distinta da informazione non disponibile.
- Coerenza delle versioni e delle etichette `current`, senza correggerle a mano.
- Sessioni finalizzate, ripristini, `complete`/`partial`, fonti grezze/utilizzabili,
  proposte validate/respinte e fallimenti della pipeline.
- Richieste, token effettivi, costo dichiarato, latenza, tempo del recupero e
  volume dello storage. Tutte le fasi aggiuntive del braccio strutturato contano.

I risultati dei componenti già raccolti e l'integrazione da 55 scambi restano
archivi separati. Il nuovo punteggio non sostituisce il precedente 4/6, né viene
combinato con esso per costruire un denominatore maggiore.

## 11. Dimensione operativa e condizioni prima dell'avvio

Con 55 classificazioni, 55 risposte e circa 44 chiamate di memoria per traiettoria
strutturata, più 55 risposte per baseline, il piano comporta circa **3.135
richieste**, prima dei recuperi per MAX_TOKENS o di eventuali arresti. Con un
intervallo minimo di cinque secondi, il solo limite seriale impone circa
**4 ore e 21 minuti**; latenza, inizializzazione e verifiche allungano il tempo.
Non è una stima garantita di durata. I costi del profilo comune più lungo e della
baseline completa devono essere misurati; il costo dell'integrazione precedente
non è un preventivo della nuova matrice.

Prima della prima chiamata vanno completati e congelati il runner appaiato,
l'adapter comune, il trasporto, i profili, i copioni, il gold, l'ordine e la
rubrica. I test offline necessari riguardano:

1. Uguale blocco clinico e uguali istruzioni nei due request body.
2. Storia completa della baseline, anche oltre cinque turni; nessun dato dell'altro braccio.
3. Memoria strutturata consolidata/ripristinata, con correzione safety presente dal turno 1.
4. Fonti del gold precedenti alla domanda e gold mai passato al worker o al retriever.
5. Conteggi cumulativi e riapertura in processi nuovi per tutti gli undici passaggi.
6. Arresto globale al nuovo errore, senza richieste successive o rigenerazioni.
7. Parità delle impostazioni effettive e assenza di fallback automatici.
8. Esportazione delle schede senza chiave dei bracci o metadati rivelatori.
9. Risoluzione esplicita degli identificatori originali dei cinque profili. In
   particolare, il file `jason_smith_001.yaml` conserva gli ID interni `Jason_001`:
   la chiave del file e gli ID originali vanno registrati e mappati, senza
   normalizzarli o correggere silenziosamente il profilo durante il caricamento.

Il manifest di questo pacchetto identifica **il piano e i dati preparati**.
Non sostituisce il futuro manifest del runner e non attesta test offline del
runner ancora da implementare. Le verifiche già eseguite sono elencate in
`design/`, con risultati distinti da questi requisiti di esecuzione.

## 12. Artefatti

- Audit riproducibile: `audit/audit_omissions.py`, `audit/REPORT.md`,
  `audit/omission-evidence.json`, `audit/transmitted-prompt.txt`.
- Materiali del confronto: `design/` (profili comuni, inventari, copioni, gold,
  matrice, ordine e controlli locali).
- Protocollo: questo documento; stato operativo e inventario in `README.md`.
- Provenienza originale: `../memory-integration-fix-2026-09-28/` e
  `../memory-benchmark-2026-09-28/`, conservati senza modifiche.
