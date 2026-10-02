# Baseline con compressione automatica OpenRouter

## Risultato
Sono state completate tutte le 25 richieste (cinque profili simulati, cinque
lunghezze) con `google/gemini-2.5-pro`, backend Google, senza errori, ritentativi
o recuperi per output troncato. Il plugin permette di ottenere risposte anche
per gli input da circa 900 mila e 1,2 milioni di token locali, che senza plugin
erano rifiutati. A entrambi questi livelli tutte le 30 categorie sono corrette.

La baseline con plugin raggiunge complessivamente **149/150 categorie (99,33%)**
e **299/300 campi (99,67%)**. Le cinque lunghezze non costituiscono repliche
indipendenti: sono prefissi annidati delle stesse cinque storie.

## Accuratezza alle cinque lunghezze

| Cronologia integrale, token locali | Baseline senza plugin | Baseline con plugin | Componente strutturato |
|---|---:|---:|---:|
| 11–13,4 mila | 30/30 (100,00%) | 30/30 (100,00%) | 17/30 (56,67%) |
| 64 mila | 30/30 (100,00%) | 29/30 (96,67%) | 17/30 (56,67%) |
| 256 mila | 30/30 (100,00%) | 30/30 (100,00%) | 15/30 (50,00%) |
| 900 mila | Non valutabile | 30/30 (100,00%) | 14/30 (46,67%) |
| 1,2 milioni | Non valutabile | 30/30 (100,00%) | 13/30 (43,33%) |

Ogni livello comprende cinque risposte e sei categorie per risposta. Nella
baseline senza plugin, ai due livelli maggiori sono disponibili zero risposte
su cinque: «non valutabile» non significa 0% di accuratezza. Con plugin e con
il componente strutturato sono disponibili cinque risposte su cinque a tutti
i livelli. I risultati dei due controlli provengono dall'archivio separato
`../memory-length-stress-2026-09-30`; non sono stati rigenerati.

L'unica categoria penalizzata con il plugin è l'identità di Crystal a 64 mila
(job 06, carta cieca C018): la risposta dice **“I'm 3-3 years old”** invece di
esprimere chiaramente 33. Entrambi i valutatori hanno giudicato errato il campo
età e corretto il nome; tutti gli altri campi della risposta sono corretti.
Manteniamo il punteggio primario rigoroso. Si tratta di una formulazione ambigua,
non di una dimostrazione di perdita di memoria. A questo livello il conteggio
di input è identico a quello senza plugin; non attribuiamo l'errore al taglio.

## Quanti token arrivano effettivamente al modello

| Cronologia integrale | Token nativi medi ricevuti | Intervallo nativo | Riduzione stimata | Risposte complete |
|---|---:|---:|---:|---:|
| 11–13,4 mila | 12.333,0 | 11.158–13.368 | 0,00% | 5/5 |
| 64 mila | 64.066,6 | 64.020–64.163 | 0,00% | 5/5 |
| 256 mila | 256.083,2 | 256.006–256.126 | 0,00% | 5/5 |
| 900 mila | 259.376,6 | 258.930–259.751 | 71,18% | 5/5 |
| 1,2 milioni | 259.439,6 | 258.989–259.807 | 78,38% | 5/5 |

Ai primi tre livelli il conteggio nativo coincide esattamente, profilo per
profilo, con quello della corrispondente richiesta senza plugin. Ai due livelli
superiori il router accetta la richiesta e il conteggio nativo è molto inferiore
alla cronologia inviata. La riduzione del 71,18% e del 78,38% usa come denominatore
il conteggio locale meno un token: questa relazione coincide con tutti i 40
input accettati del confronto senza plugin/componente strutturato. Per gli input
integrali sopra 256 mila non esiste un conteggio nativo senza plugin, perché le
richieste erano rifiutate. Le percentuali sono quindi stime calibrate.

Il plugin è quello documentato da OpenRouter: elimina o tronca contenuti nella
parte centrale per rispettare il contesto; non genera un riassunto semantico.
La risposta API non contiene il prompt trasformato, quindi i token non permettono
di ricostruire esattamente quali passaggi siano stati rimossi. Il valore di circa
259 mila token è un risultato di questi input e di questo servizio, non una
soglia universale garantita dal plugin.
[Documentazione ufficiale](https://openrouter.ai/docs/guides/features/message-transforms).

## Disegno, impostazioni e costo

- Stesse cinque storie del confronto: prime nove sessioni della ripetizione 01
  del braccio strutturato, 45 scambi per profilo, con dialoghi sintetici aggiunti.
  I fatti restano invariati e vicini all'inizio; le sei domande sono alla fine.
  Le risposte delle prove delle sessioni 10–11 sono escluse dagli input.
- Gli stessi prompt integrali sono inviati come **un unico messaggio utente**.
  L'unico parametro aggiunto alla richiesta è
  `"plugins": [{"id": "context-compression"}]`. Nessuna sintesi o troncamento locale.
  Questa prova non misura il comportamento di una diversa serializzazione in
  messaggi API separati.
- Modello `google/gemini-2.5-pro`, temperatura 0,7, top-p 0,95, massimo output 4096,
  ragionamento richiesto 1024, stop `\nTherapist:` e `Therapist:`; nessun seed API;
  top-k non trasmesso. Nessun fallback del provider. Il modello è attestato in
  tutte le risposte native. Il backend riportato è Google.
- Protocollo, codice, rubrica e riferimenti agli input congelati prima delle
  chiamate. Una generazione per cella; nessun ritentativo in base alla qualità.
  Due valutatori automatici in contesti separati concordano su tutte le 150
  categorie e i 300 campi; modello richiesto `gpt-6-astra`, identità di esecuzione
  non attestata dal runtime. Non sono valutazioni cliniche umane.
- Raccolta 30 settembre 2026, 20:06:00–20:14:31 ora di Roma. 25 richieste HTTP,
  25 risposte, nessun errore; 4.256.495 token nativi di input complessivi.
  Costo nativo osservato **10,492165 USD**, esclusa la valutazione automatizzata.
  Questo è il costo di inferenza della condizione con plugin, non un confronto
  del costo totale dei sistemi, che per lo strutturato include l'estrazione.

## Conclusione per la risposta al revisore

Il rifiuto della cronologia integrale non dimostra, da solo, un vantaggio della
memoria strutturata: la baseline dotata di compressione automatica continua a
rispondere e, nei due livelli più lunghi, conserva correttamente tutte le
informazioni interrogate. In questo scenario il vantaggio misurato del componente
strutturato è la dimensione dell'input (5.134–7.033 token nativi), mentre la sua
accuratezza resta inferiore. Il componente recupera al massimo otto evidenze
per sei domande simultanee: non rappresenta il sistema completo a undici sessioni.
Il confronto longitudinale completo resta distinto: 85/90 strutturato e 89/90
baseline con cronologia integrale.

La collocazione iniziale dei fatti è favorevole a un metodo che taglia la parte
centrale. Questo risultato non dimostra conservazione di fatti collocati in
qualsiasi punto, né stabilità clinica su migliaia di sessioni. Le condizioni sono
raccolte in esecuzioni distinte e una singola risposta stocastica per cella non
consente di attribuire piccole differenze al plugin o di stimare una curva causale
di decadimento. Non sono eseguiti test di significatività o intervalli binomiali
che trattino le categorie come campioni indipendenti.

## Dati nel repository

Directory: `outputs/openrouter-compression-length-2026-09-30/` nella copia di
lavoro del repository; questo non implica una pubblicazione remota.

- `PROTOCOL.md`, `manifest.json`, `schedule.json`: disegno, congelamento, ordine
  e hash dei 25 prompt originali, che restano in `../memory-length-stress-2026-09-30/inputs/`.
- `runtime/<id>/openrouter-api-records.jsonl`: richieste con plugin, risposte native,
  token, modello, provider e costi. `runtime/answers.jsonl`: tutti i 25 esiti.
- `review/a/`, `review/b/`, `review/ratings/`, `review/EXECUTION.md`: rubriche,
  schede senza etichette di condizione/lunghezza, giudizi e identità dichiarate.
- `analysis/results.json`: accuratezza per lunghezza, profilo, categoria e campo.
  `analysis/token-analysis.json`: conteggi, confronto con gli input senza plugin,
  verifica delle richieste, integrità degli export e registro dei ritentativi.
- `openrouter_transport.py.patch`, `timeout_retries.py.patch`: uniche modifiche
  dei due adattatori; `preflight.json` verifica gli input senza chiamate di rete.
- `previous-review-response/`: copia della risposta TeX/PDF con gli hash della
  precedente esportazione; `final-manifest.json`: integrità degli artefatti attuali.

## Verifica dell'interpretazione statistica

**11/11 checked**: Simpson (risultati anche per profilo/lunghezza); fallacia
ecologica (nessuna inferenza a pazienti reali); Berkson (cinque profili fissati,
nessuna selezione dei soli successi); collider (disponibilità e accuratezza
separate); base rate (non è screening diagnostico); regressione alla media
(nessuna interpretazione della singola oscillazione come miglioramento);
survivorship (tutte le 25 richieste e i rifiuti dei controlli sono riportati);
look-elsewhere (tutte le celle, nessun test di significatività selezionato);
forking paths (disegno esplorativo congelato prima di questa raccolta, nessuna
correzione guidata dalle risposte); correlazione/causalità (esecuzioni distinte,
nessuna superiorità generale dedotta); causalità inversa (nessuna conclusione
clinica causale). Rimangono i limiti di numerosità, posizione dei fatti, valutazione
automatica e mancanza del testo trasformato indicati sopra.
