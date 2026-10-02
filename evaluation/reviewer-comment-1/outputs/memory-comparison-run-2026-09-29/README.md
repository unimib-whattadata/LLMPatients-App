# Confronto della memoria su 11 sessioni

La raccolta con Gemini 2.5 Pro su OpenRouter è stata completata il
**30 settembre 2026 alle 14:45 Europe/Rome**: 30 traiettorie, 330 sessioni,
1.650 scambi e tutti i 180 probe previsti. È conclusa anche la valutazione
semantica automatizzata con etichette dei bracci nascoste: **85/90 prove riuscite
per lo strutturato (94,44%) e 89/90 per la baseline completa (98,89%)**.

Il [rapporto finale](analysis/REPORT.md) descrive metodo, punteggi, costi e limiti.
I [risultati per singola prova](analysis/semantic-results.json) conservano i
giudizi e le differenze per tutte le 15 coppie. Il confronto è descrittivo e
mostra un vantaggio della baseline di 4,44 punti percentuali in questo compito.

## Controlli conclusi prima dell'avvio

**74 test offline superati, nessuna chiamata al servizio durante questi test.**

| Suite | Test superati |
|---|---:|
| Profilo clinico comune e adapter della memoria | 8 |
| Rate limit, arresto globale, esiti incerti e budget | 18 |
| Esportazione delle schede con metadati nascosti | 10 |
| Arresto anche con errori di scrittura | 7 |
| Ordine, processi, avvio esclusivo e ricevute | 23 |
| Percorso nativo, baseline e riapertura delle 11 sessioni | 8 |

Il test del percorso completo usa processi nuovi e risposte HTTP esplicitamente
fittizie. Verifica la persistenza del sistema e i corpi delle richieste, non
attribuisce a Gemini i risultati delle fixture. Sono stati verificati anche
90 file delle evidenze precedenti: restano invariati.

## Esecuzione effettiva

- Piano: 5 profili × 3 ripetizioni × 2 sistemi = **30 traiettorie**.
- Ogni traiettoria: 11 sessioni, 55 scambi, 6 probe.
- Totale previsto: 330 esecuzioni di sessione, 1.650 scambi, 180 probe.
- Stesse informazioni cliniche e stesse istruzioni per i due sistemi.
- Baseline con tutto il proprio dialogo; sistema strutturato con memoria nativa.
- Modello: `google/gemini-2.5-pro`, tramite OpenRouter.
- Un canale globale, almeno 5 secondi fra richieste, nessun fallback di routing.
- Dal blocco 10: al massimo tre tentativi per timeout verificati, con attese di
  30 e 60 secondi e prompt e parametri identici.
- Dalla ripresa del blocco 90: anche i 429 verificati possono essere ritentati,
  con attese di 60 e 120 secondi, rispettando un eventuale `Retry-After` più
  lungo fino a 300 secondi. Restano al massimo tre tentativi complessivi per
  prompt e configurazione. Gli altri errori o l'esaurimento dei tentativi
  arrestano l'intera matrice. Nessun riavvio automatico del job.

La sola spaziatura delle circa 3.135 richieste previste comporta almeno 4 ore e
21 minuti; latenza e inizializzazione aumentano la durata. Il numero esatto di
chiamate e il costo sono misurati durante l'esecuzione.

## Dove leggere lo stato e le evidenze

- `analysis/REPORT.md`: rapporto finale del confronto.
- `analysis/semantic-results.json`: valutazione automatizzata conclusa e punteggi.
- `analysis/runtime-audit.json`: verifica finale, costi, token, latenze e storage.
- `analysis/proposal-context-audit.json`: fonte, fatti persistiti e prompt delle
  30 prove sugli appuntamenti.
- `analysis/final-manifest.json`: hash dei materiali conclusivi e verifica
  della conservazione delle evidenze runtime.
- `review/ratings/`: due valutazioni separate e risoluzione del disaccordo.
- `continuations/resume-07/state.json`: stato e heartbeat del controller attuale.
- `continuations/resume-07/AMENDMENT.md`: ripresa dopo la ricarica del credito,
  dal quinto scambio della baseline nell'esecuzione 290.
- `continuations/resume-06/AMENDMENT.md`: gestione dei 429 e ripresa del quinto
  scambio della sessione 90 dal suo stato nativo persistito.
- `continuations/resume-05/AMENDMENT.md`: recupero del consolidamento della
  sessione 78, con riuso dei due riepiloghi già riusciti e stessa richiesta fattuale.
- `continuations/resume-04/AMENDMENT.md`: politica dei timeout e recupero della
  baseline dal quinto scambio, con prompt identico alla richiesta fallita.
- `continuations/resume-03/AMENDMENT.md`: recupero della sessione interrotta,
  riuso della classificazione e limite documentato sullo stato emotivo casuale.
- `runtime/launch.json`: avvio esclusivo, processo e manifest usato.
- `runtime/progress.json`: ultimo avanzamento scritto dal controller.
- `runtime/processes.jsonl`: cronologia dei processi delle sessioni.
- `runtime/STOP`: prima causa di arresto, se presente.
- `runtime/<run_id>/accepted-turns.jsonl`: tutte le risposte salvate.
- `runtime/<run_id>/sessions/session_XX/`: prompt, risposte native, impostazioni,
  costi, eventi, memoria e ricevuta della sessione.
- `offline-checks/results.json`: verifica offline e hash dei log.
- `manifest.json`: 89 file congelati per l'esecuzione.
- `IMPLEMENTATION.md`: impostazioni, funzionamento e limiti.
- `EXPORT_INTERFACE.md`: schede per la successiva valutazione.

## Ripresa del 29 settembre 2026

Alle 10:44:53 (Europe/Rome) è stato avviato il controller della ripresa
`resume-02`, dal blocco 9 dello stesso calendario. Le prime **8 sessioni e
40 risposte** sono state riconciliate con le **76 risposte del servizio** e
conservate in una copia verificata per hash. Il vecchio riepilogo, fermo a sette
sessioni, è stato aggiornato in base alle ricevute complete. La causa della
cessazione del controller precedente resta sconosciuta.

Il controller è eseguito come job macOS indipendente dal terminale, con
riavvio automatico disabilitato e arresto al primo nuovo errore del servizio.
Sono superati **35 test offline** della ripresa e un controllo locale del
processo macOS, senza chiamate al modello. `resume-01` conserva il tentativo
locale fermato prima dell'inferenza per un falso positivo nel controllo dei
processi; i suoi file congelati sono rimasti invariati.

La ripresa 02 si è fermata alle 10:48:53 per un errore 504 esplicito durante la
risposta al quinto scambio del blocco 9, lasciando **44 scambi salvati**. Nessuna
richiesta è stata inviata dopo quell'arresto.

Su successiva autorizzazione dell'utente, alle **12:17:39** è stata avviata la
`resume-03`. Il checkpoint di tutti i 44 scambi è conservato in 62 file copiati e
verificati. **38 test offline** e una prova del grafo senza rete hanno verificato
il recupero. Il nuovo worker completa soltanto lo scambio mancante e la chiusura
della sessione; dal blocco 10 richiama nuovamente il worker originale.

La classificazione già riuscita del quinto scambio viene riutilizzata senza
chiamata remota. L'aggiornamento emotivo casuale del tentativo fallito non era
stato persistito e viene ricalcolato: questa deviazione è registrata nella
ricevuta e nell'emendamento. Prima della richiesta vengono controllate l'identità
di profilo, memoria, storia, istruzioni e domanda. I registri mantengono il 504
storico, che continua quindi a figurare nel conteggio complessivo degli errori.

La ripresa 03 ha completato il blocco 9 e si è fermata alle **12:22:03** su un
secondo errore 504, durante il quinto scambio della baseline nel blocco 10.
Il checkpoint contiene **9 sessioni complete, 49 scambi, 96 richieste,
94 risposte del servizio e 2 errori archiviati**.

Alle **12:58:29**, su autorizzazione dell'utente, è stata avviata `resume-04`.
La copia iniziale conserva tutti i **69 file runtime**. Sono passati **46 test
offline**, la prova di recupero nativo della baseline e la prova del trasporto
originale con un 504 simulato, tutti senza rete. La gestione dei timeout prevede
ora al massimo tre tentativi per prompt e configurazione, con attese di 30 e
60 secondi; ogni tentativo resta registrato. Il recupero MAX_TOKENS già previsto
rimane separato, come descritto nell'emendamento. Modello, parametri, calendario
e risposte precedenti sono conservati. Gli errori storici e quelli eventualmente
recuperati restano nel conteggio `provider_errors`: l'arresto corrente si legge
da `runtime/STOP` e dallo stato del controller.

La ripresa 04 si è fermata alle **15:47:39** durante la generazione della memoria
fattuale del blocco 78, per una risposta HTTP 200 terminata senza testo visibile.
Erano conservati **77 sessioni complete e 390 scambi**, inclusi tutti i cinque
del blocco 78. I sei timeout incontrati dopo la modifica erano stati recuperati
al secondo tentativo. La risposta vuota è archiviata separatamente dagli otto
errori di servizio complessivi.

Alle **18:02:49**, su autorizzazione «Riprendi», è stata avviata `resume-05`.
L'audit ha riconciliato **749 richieste, 741 risposte e 390 scambi**, conservando
una copia verificata dei **452 file runtime**. Sono passati **25 test offline**
e la prova della chiusura nativa su copia temporanea senza rete. La ripresa
riutilizza riflessione e riepilogo già riusciti e ripete soltanto l'estrazione
fattuale, con prompt e parametri identici. La politica dei timeout rimane
quella di `resume-04`; un nuovo esito vuoto conserva l'arresto del test.

Alle **18:03:51** la richiesta fattuale è riuscita al primo tentativo e il
blocco 78 è stato chiuso. Il consolidamento ha elaborato tutte le cinque fonti,
validato **29 fatti** e messo in quarantena **1 fatto**, risultando `partial`
secondo la regola originale. I 390 scambi sono rimasti identici. Alle 18:03:57
il controller è passato al blocco 79; questo esito riguarda la chiusura della
sessione, non il punteggio delle prove di memoria ancora da eseguire.

La ripresa 05 si è fermata alle **18:32:22** su un errore upstream 429 durante
la classificazione del quinto scambio del blocco 90. Il checkpoint conserva
**89 sessioni complete, 449 scambi, 860 richieste, 850 risposte e 10 errori**.
Non era stata prodotta una classificazione riuscita per quello scambio.

Alle **19:27:36**, su autorizzazione «Ok aggiungila e fai ripartire», è stata
avviata `resume-06`. L'audit ha conservato una copia verificata dei **514 file
runtime**. Sono passati **59 test offline**, una prova del recupero con il grafo
nativo e una prova del trasporto con due 429 simulati, tutte senza chiamate live.
La politica dei 429 attende 60/120 secondi oppure il tempo maggiore indicato
da `Retry-After`; oltre 300 secondi conserva l'arresto. I tentativi restano
archiviati e limitati a tre per prompt e configurazione.

Il recupero riprende dal quattordicesimo scambio persistito della traiettoria
e verifica l'identità del prompt e delle opzioni del classificatore fallito.
Il nuovo processo inizializza nuovamente il generatore casuale Python: questo
limite è documentato nell'emendamento e nella ricevuta. Gli scambi già salvati,
i prompt congelati, il modello e le impostazioni di generazione sono conservati.

Alle **19:29:31** il blocco 90 è stato chiuso: il quinto scambio è stato
aggiunto, portando il totale a **450 scambi e 90 sessioni complete**. Tutte le
sei chiamate della ripresa sono riuscite al primo tentativo. È stata verificata
la conservazione dei 449 scambi precedenti. La chiusura nativa ha elaborato
tutte le cinque fonti, validato **15 fatti** e messo in quarantena **2 fatti**;
il consolidamento è quindi `partial` secondo la regola originale. Questo
stato descrive il consolidamento e non assegna un punteggio alle prove finali.

La ripresa 06 si è fermata il **30 settembre alle 04:08:57**, durante il quinto
scambio del blocco 290, per un HTTP 402 relativo al credito disponibile su
OpenRouter. Il checkpoint conserva **289 sessioni complete, 1.449 scambi e
20 probe**, con **2.788 richieste, 2.755 risposte e 33 errori** archiviati.
Durante questa ripresa sono stati recuperati 20 timeout 504 e 2 errori 429;
il 402 ha arrestato la matrice. Il credito segnalato includeva le prenotazioni
per richieste in corso; il servizio indicava `Retry-After: 120`.

Alle **13:01:19 del 30 settembre**, dopo la comunicazione «Ho aggiunto crediti»,
è stata avviata `resume-07`. L'audit ha riconciliato e copiato **1.516 file
runtime**; sono passati **26 test offline** e una prova del generatore nativo
su copia temporanea con rete vietata. Il recupero mantiene tutti i 49 scambi
precedenti della traiettoria, verifica il prompt esatto di `s10t05` e aggiunge
soltanto la risposta mancante. La gestione di timeout e 429 è una copia
identica del codice congelato in `resume-06`; modello e impostazioni restano
quelli del protocollo.

Alle **13:01:53** la richiesta pendente è riuscita e l'esecuzione 290 è stata
chiusa, portando il totale a **290 sessioni complete e 1.450 scambi**. Il prompt
è risultato identico a quello archiviato e tutti i 1.449 scambi precedenti sono
rimasti invariati. Alle **13:02:36** il controller e il worker dell'esecuzione
291 risultavano attivi, senza un nuovo arresto.

Alle **14:45:00** il controller ha registrato il completamento di tutte le
**330 sessioni e 30 traiettorie**, con **1.650 scambi e 180 probe**. I tre
ulteriori timeout 504 sono stati recuperati automaticamente. Sono archiviati
**3.172 richieste, 3.136 risposte e 36 errori**; il costo riportato dal servizio
è **48,142587 USD**. Nessun `STOP` finale e nessun fallimento dei controlli
applicativi registrato. Gli errori storici restano conservati.

Il pacchetto `review/export-001/` contiene tutte le 180 risposte, senza mancanti,
e due copie identiche con ID opachi per la valutazione. I valutatori ricevono
soltanto il rispettivo pacchetto, senza la chiave dei bracci, i prompt o gli
esiti dell'altro valutatore. I due contesti automatici hanno concordato su
179/180 schede; un terzo ha risolto l'unico disaccordo applicando la rubrica
congelata. I contesti sono configurati con `gpt-6-astra`, effort `xhigh`;
l'identificativo del modello effettivamente servito non è esposto dal runtime.

Il punteggio conclusivo è **85/90 per lo strutturato e 89/90 per la baseline**.
Tutte le cinque prove fallite dello strutturato riguardano la sola proposta
di appuntamento: il riferimento corretto era salvato prima della domanda,
ma l'ora non era inclusa nel prompt trasmesso. La baseline presenta una
contraddizione nella relazione fra luogo attuale e precedente, confermata
dal terzo contesto. Giudizi originali, risoluzione e tracciamento dei prompt
sono conservati senza modificare dialoghi o gold.

Il registro originale di avvio rimane conservato. La ricevuta del controller
attuale è `continuations/resume-07/started.json`; il suo PID non va cercato
nel precedente `runtime/launch.json`. Lo stato corrente è sempre nei registri;
questo indice documenta gli avvii e le interruzioni osservate.

Lo stato corrente può essere letto senza chiamare il servizio:

```sh
python3 paired_runner.py status
```

Il registro di esecuzione è la fonte dello stato operativo. Il runner congelato
mantiene nel riepilogo il campo `semantic_review` con valore `pending`, perché non
importa i giudizi successivi. Lo stato semantico conclusivo si legge in
`analysis/semantic-results.json`. Le risposte parziali o sbagliate restano nel
campione e nei denominatori del rapporto.
