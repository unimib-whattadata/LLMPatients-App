# Accuratezza con cronologie di lunghezza crescente

## Material Passport

- Stato: raccolta e valutazione automatizzata completate il 30 settembre 2026.
- Materiale: cinque pazienti simulati; nessun partecipante umano.
- Ambito: prova esplorativa del solo componente di recupero delle evidenze,
  condizionata su prefissi già generati e indicizzati. Non è un'esecuzione del
  grafo completo con milioni di token di nuove sessioni.
- Provenienza: protocollo, codice e matrice fissati prima delle chiamate;
  un emendamento operativo successivo al primo rifiuto di contesto, dichiarato
  in [AMENDMENT-01.md](AMENDMENT-01.md). Nessuna preregistrazione pubblica.
- Fonti: [risultati per cella e profilo](analysis/results.json),
  [audit HTTP e immutabilità](analysis/runtime-verification.json),
  [stabilità dei prompt](analysis/prompt-stability.json).

## 1. Risultati

50 condizioni previste e 50 richieste HTTP: 40 risposte complete e 10 rifiuti
HTTP400 per lunghezza del contesto, tutti nella baseline. Nessun'altra
condizione mancante, nessun retry per migliorare un risultato. La raccolta è
iniziata alle 19:17:01 ed è terminata alle 19:29:04 Europe/Rome, compresa la
correzione operativa. Le40 risposte attestano Gemini 2.5 Pro, backend Google.

Il successo richiede **tutti i campi e le relazioni corretti** in ciascuna delle
sei categorie. Ogni risposta completa contribuisce sei categorie e 12 campi;
omissioni e risposte parziali rimangono nel denominatore. L'astensione corretta
sul cognome mai registrato è un successo. Cinque profili contribuiscono30 prove
per cella, quando tutte le richieste producono una risposta.

| Cronologia completa: token locali | Baseline completa: accuratezza | Risposte disponibili | Componente strutturato: accuratezza | Risposte disponibili |
|---|---:|---:|---:|---:|
| 11.159–13.369 | 30/30 (100,00%) | 5/5 | 17/30 (56,67%) | 5/5 |
| circa 64.000 | 30/30 (100,00%) | 5/5 | 17/30 (56,67%) | 5/5 |
| circa 256.000 | 30/30 (100,00%) | 5/5 | 15/30 (50,00%) | 5/5 |
| circa 900.000 | Non valutabile | 0/5 | 14/30 (46,67%) | 5/5 |
| circa 1.200.000 | Non valutabile | 0/5 | 13/30 (43,33%) | 5/5 |

La baseline risolve tutte le prove nei tre livelli accettati. Il componente
strutturato produce risposte anche quando l'intero archivio non viene accettato
dall'endpoint, mantenendo un input piccolo, ma commette numerosi errori.
Questi risultati **non dimostrano una superiorità di accuratezza della memoria
strutturata**. Documentano un limite operativo della cronologia completa e un
limite di copertura del recupero applicato a domande multiple.

I denominatori semantici dei rifiuti sono assenti: non attribuiamo loro una
fittizia accuratezza dello 0%. Tutte le 50 condizioni restano nel conteggio di
disponibilità. Le percentuali descrivono questa matrice, non una popolazione di
pazienti né un tasso di errori clinici.

## 2. Disegno e impostazioni

Cinque profili: Alex Carter, Crystal Smith, Daniel Isherwood, Jason Smith e
Juanita Delgado. Per ciascuno, la trascrizione delle prime nove sessioni della
prima ripetizione strutturata fornisce 45 scambi reali dell'esperimento. I due
bracci ricevono esattamente la stessa fonte. Le risposte ai probe delle sessioni
10–11 sono escluse. La memoria contiene soltanto i batch originali estratti
automaticamente e validati con fonti interne al prefisso.

A questo prefisso vengono aggiunti scambi sintetici annidati, costruiti con
combinazioni deterministiche di scene, oggetti, suoni e pratiche di ascolto.
Sono distrattori basati su un insieme finito di modelli testuali, non migliaia
di sedute cliniche generate autonomamente. Il seed locale è 20260930. I nomi e
le informazioni bersaglio non sono ripetuti o modificati nei distrattori. I
fatti pertinenti restano vicini all'inizio mentre aumenta la distanza dalla
domanda finale. La dimensione della cronologia non coincide con il numero di
fatti clinicamente salienti.

- **Baseline**: tutti gli scambi, in ordine, senza tagli, riassunti o recupero.
- **Componente strutturato**: `EvidenceMemory.retrieve` originale, otto elementi
  al massimo, budget 1.800 token stimati. Ricerca sui fatti originali e su tutti
  gli scambi grezzi secondo i filtri nativi. I distrattori non vengono
  consolidati in nuovi fatti. Sintesi, riflessioni, storia recente e stato
  dinamico del grafo non vengono aggiunti.
- Identici CASE completo, istruzioni comuni, domanda e parametri di generazione.
  Il gold non entra nella generazione o nel recupero.
- Sei domande originali concatenate in una sola richiesta, con sei sezioni di
  risposta. Una richiesta per profilo/condizione/lunghezza. Questo modifica il
  compito rispetto alle sei domande somministrate separatamente nello studio
  longitudinale: otto evidenze devono coprire simultaneamente 12 campi.
- Gemini 2.5 Pro tramite OpenRouter: temperatura 0,7, top-p 0,95, massimo 4.096 token
  di output, ragionamento richiesto 1.024 token; nessun seed API. Top-k 40 presente
  nella configurazione locale ma non trasmesso. Stop `\nTherapist:` e
  `Therapist:`; parametri richiesti supportati, fallback disabilitato. Nessuna
  richiesta di compressione del contesto. Tutte le risposte terminano con `stop`;
  non sono stati necessari recuperi del budget di output.
- Encoder locale all-MiniLM-L6-v2, revisione indicata nel protocollo, CPU.
  Il testo della domanda conta272 token del suo tokenizer e viene troncato a 256
  per l'embedding; il punteggio lessicale usa la domanda completa. Questa
  limitazione era misurata e documentata prima delle chiamate.

## 3. Token e rifiuti del servizio

I livelli sono costruiti con il tokenizer locale sperimentale di Google,
`google-genai 2.25.0`. Per tutte le 40 risposte ricevute, il conteggio nativo del
prompt è esattamente quello locale meno un token. Nessun confronto semantico
si basa su un prompt baseline tagliato. I prompt del componente strutturato
contengono complessivamente **5.134–7.033 token nativi**, inclusi profilo e domanda.

| Livello nominale | Input baseline nelle risposte native | Stima di input OpenRouter nei rifiuti | Input nativo del componente strutturato |
|---|---:|---:|---:|
| 11.159–13.369 | 11.158–13.368 | — | 5.232–7.033 |
| circa 64.000 | 64.020–64.163 | — | 5.158–6.979 |
| circa 256.000 | 256.006–256.126 | — | 5.134–6.972 |
| circa 900.000 | — | 1.107.404–1.108.543 | 5.134–6.972 |
| circa 1.200.000 | — | 1.477.103–1.478.015 | 5.134–6.972 |

OpenRouter dichiara un limite di contesto di 1.048.576 token. Nei rifiuti dei
livelli 900 mila e 1,2 milioni, il suo conteggio di ammissione supera tale soglia,
anche prima di aggiungere i 4.096 token di output richiesti. `provider_name` è
null: si tratta della stima del router/endpoint, non dell'uso osservato presso
il modello. Non concludiamo che Gemini sia incapace di elaborare 900 mila token
contati correttamente dal suo tokenizer: osserviamo il rifiuto di queste
specifiche richieste attraverso OpenRouter.

La documentazione e i prezzi del servizio sono archiviati/richiamati nel
[protocollo](PROTOCOL.md) e in[provider-endpoints.json](provider-endpoints.json).
Fonti ufficiali: [scheda Gemini 2.5 Pro](https://openrouter.ai/google/gemini-2.5-pro)
e [compressione del contesto](https://openrouter.ai/docs/guides/features/message-transforms).

Il primo rifiuto è avvenuto al job 31. Il codice originario lo trattava come
atteso soltanto oltre il limite del tokenizer locale, fermando la raccolta.
L'emendamento ha registrato quel rifiuto senza ripeterlo e ha proseguito i
job 32–50, con gli stessi input, ordine e configurazioni. I30 risultati precedenti
sono conservati identici. Gli hash del runtime originale e delle fonti sono
stati ricontrollati anche al termine.

Le spese riportate nelle 40 risposte native ammontano a **4,24284125 USD**. Le dieci
risposte di errore non riportano un costo: l'importo è la somma delle spese
osservate, non una garanzia di fatturazione per errori privi di usage. Non vi
sono timeout o 429 in questa matrice. Il costo del consolidamento già eseguito
sui prefissi e la valutazione automatizzata non sono inclusi: questi dati non
confrontano il costo complessivo delle due architetture.

## 4. Valutazione e interpretazione

Due contesti automatici separati hanno ricevuto le 40 risposte in ordine
casualizzato, con rubrica e gold, senza etichette di braccio o lunghezza. Il
modello richiesto è `gpt-6-astra`, effort `xhigh`; l'identità effettivamente
servita non è esposta dal runtime. Si tratta di valutazione automatizzata,
non di validazione umana o clinica. Il mascheramento delle etichette non prova
che i valutatori non potessero inferire una condizione dal testo.

Accordo su **240/240 categorie e480/480 campi**; nessuna adjudicazione necessaria.
Gli errori del componente riguardano soprattutto titolo remoto, dettagli degli
appuntamenti e distinzione fra attività completata e pianificata. L'audit
[offline-audit.json](offline-audit.json) mostra quali valori letterali sono
presenti nelle evidenze selezionate; è una diagnosi di copertura, non una misura
semantica alternativa. Tutti i cinque casi al livello iniziale presentano già
almeno un errore: non attribuiamo l'intero divario alla lunghezza.

**Non si può interpretare il calo 17→13 come una curva causale di decadimento.**
Si dispone di una generazione per cella. Inoltre, fra 900 mila e 1,2 milioni i
prompt del componente strutturato sono identici per tutti e cinque i profili;
il diverso punteggio 14/30 contro 13/30 deriva quindi da risposte stocastiche e
non da un ulteriore cambiamento del contesto generato dal recupero. Anche fra
256 mila e 900 mila i prompt sono identici per quattro profili su cinque.

Il confronto completo su 11 sessioni, riportato separatamente in
[REPORT.md](../memory-comparison-run-2026-09-29/analysis/REPORT.md), usa invece
il grafo nativo, tutte le componenti di memoria e domande singole: **85/90
(94,44%) strutturato e 89/90 (98,89%) baseline**. I due esperimenti non sono
intercambiabili. Il test presente documenta la possibilità di continuare con
un input limitato e una debolezza del recupero nel compito accorpato; non
convalida il consolidamento end-to-end di un archivio da 1,2 milioni di token.

## 5. Misure secondarie e risultati per profilo

I campi sono correlati e non aumentano il numero di casi indipendenti.

| Livello | Sistema | Campi corretti | Profili con tutte le sei categorie corrette |
|---|---|---:|---:|
| 11.159–13.369 | flat_full_history | 60/60 | 5/5 |
| 11.159–13.369 | structured_evidence | 32/60 | 0/5 |
| circa 64.000 | flat_full_history | 60/60 | 5/5 |
| circa 64.000 | structured_evidence | 33/60 | 0/5 |
| circa 256.000 | flat_full_history | 60/60 | 5/5 |
| circa 256.000 | structured_evidence | 27/60 | 0/5 |
| circa 900.000 | flat_full_history | Non valutabile | Non valutabile |
| circa 900.000 | structured_evidence | 24/60 | 0/5 |
| circa 1.200.000 | flat_full_history | Non valutabile | Non valutabile |
| circa 1.200.000 | structured_evidence | 23/60 | 0/5 |

| Profilo | Livello | Baseline: categorie corrette | Componente: categorie corrette |
|---|---|---:|---:|
| alex_carter_001 | 11.159–13.369 | 6/6 | 4/6 |
| alex_carter_001 | circa 64.000 | 6/6 | 3/6 |
| alex_carter_001 | circa 256.000 | 6/6 | 2/6 |
| alex_carter_001 | circa 900.000 | Rifiuto di contesto | 2/6 |
| alex_carter_001 | circa 1.200.000 | Rifiuto di contesto | 2/6 |
| crystal_smith_001 | 11.159–13.369 | 6/6 | 3/6 |
| crystal_smith_001 | circa 64.000 | 6/6 | 3/6 |
| crystal_smith_001 | circa 256.000 | 6/6 | 3/6 |
| crystal_smith_001 | circa 900.000 | Rifiuto di contesto | 3/6 |
| crystal_smith_001 | circa 1.200.000 | Rifiuto di contesto | 3/6 |
| daniel_isherwood_001 | 11.159–13.369 | 6/6 | 3/6 |
| daniel_isherwood_001 | circa 64.000 | 6/6 | 4/6 |
| daniel_isherwood_001 | circa 256.000 | 6/6 | 3/6 |
| daniel_isherwood_001 | circa 900.000 | Rifiuto di contesto | 3/6 |
| daniel_isherwood_001 | circa 1.200.000 | Rifiuto di contesto | 3/6 |
| jason_smith_001 | 11.159–13.369 | 6/6 | 3/6 |
| jason_smith_001 | circa 64.000 | 6/6 | 3/6 |
| jason_smith_001 | circa 256.000 | 6/6 | 3/6 |
| jason_smith_001 | circa 900.000 | Rifiuto di contesto | 3/6 |
| jason_smith_001 | circa 1.200.000 | Rifiuto di contesto | 2/6 |
| juanita_delgado_001 | 11.159–13.369 | 6/6 | 4/6 |
| juanita_delgado_001 | circa 64.000 | 6/6 | 4/6 |
| juanita_delgado_001 | circa 256.000 | 6/6 | 4/6 |
| juanita_delgado_001 | circa 900.000 | Rifiuto di contesto | 3/6 |
| juanita_delgado_001 | circa 1.200.000 | Rifiuto di contesto | 3/6 |

## 6. Verifica statistica e limiti

Stato: **ANALYZED**; copertura 11/11 aspetti della guida di interpretazione.
Ricalcolo dei conteggi dai giudizi effettuato; nessuna pretesa di riproducibilità
esatta di ulteriori generazioni stocastiche. Nessun p-value o intervallo
binomiale che consideri le categorie come casi indipendenti.

| Aspetto | Verifica / limite |
|---|---|
| Simpson | Pesi bilanciati entro i livelli disponibili; tutti i profili mostrati. I rifiuti sono separati, senza aggregare tassi con denominatori diversi. |
| Fallacia ecologica | Nessuna inferenza su individui o pazienti reali dai profili simulati. |
| Berkson | Cinque casi noti di convenienza, prefissi provenienti dallo strutturato; nessuna stima di popolazione. |
| Collider | Nessun aggiustamento o selezione sul punteggio. Disponibilità separata per tutte le 50 condizioni. |
| Frequenza di base | Le sei categorie artificiali non rappresentano la frequenza degli errori nell'uso clinico. |
| Regressione verso la media | Nessun miglioramento prima/dopo dedotto da casi selezionati; una generazione per cella. |
| Sopravvivenza | Tutti i 50 tentativi rendicontati, inclusi 10 rifiuti; nessun 0% semantico inventato per gli indisponibili. |
| Ricerca selettiva | Pubblicati tutti i livelli e gli errori dello strutturato, senza ripetizioni guidate dall'accuratezza. |
| Scelte multiple | Protocollo locale fissato; emendamento del criterio tecnico dichiarato e dati originali conservati. |
| Associazione/causalità | Il compito accorpato e le componenti escluse limitano l'inferenza; lo stesso prompt produce punteggi diversi ai due livelli finali. |
| Causalità inversa | Fatti/fonti e selezione delle evidenze precedono le risposte; gold mai fornito alla generazione. |

## 7. Dati e integrità

L'indice [README.md](README.md) riporta i percorsi di trascrizioni, prompt,
memoria, richieste HTTP, giudizi, mappatura, analisi e sigilli. Il codice e
le fonti originali sono conservati. Il file finale `final-manifest.json`
consente di controllare gli hash del pacchetto completato.
