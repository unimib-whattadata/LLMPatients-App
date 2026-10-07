# Continuità su 11 sessioni: risultati del confronto

## Material Passport

- Data: 30 settembre 2026, Europe/Rome.
- Stato: raccolta completata; valutazione semantica automatizzata completata.
- Materiali: cinque pazienti simulati, 15 coppie di traiettorie, due sistemi.
- Protocollo e rubrica: [PROTOCOL.md](../../memory-comparison-plan-2026-09-28/PROTOCOL.md) e [SCORING.md](../../memory-comparison-plan-2026-09-28/SCORING.md), congelati prima dell'esecuzione.
- Provenienza: [manifest dell'esecuzione](../manifest.json), emendamenti delle riprese in `../continuations/`, [manifest finale](final-manifest.json).
- Fonti dei risultati: [valutazione semantica](semantic-results.json), [audit del runtime](runtime-audit.json), [tracciamento della proposta di appuntamento](proposal-context-audit.json).
- Interpretazione: confronto tecnico descrittivo tra due pacchetti applicativi, con valutatori automatici. Il piano è congelato localmente; non costituisce una preregistrazione pubblica.

## 1. Risultato principale

Sono state completate **30 traiettorie, 330 sessioni, 1.650 scambi e tutte le 180 prove previste**. Ogni traiettoria comprende 11 sessioni di cinque scambi e sei prove di continuità. La raccolta si è conclusa il 30 settembre alle **14:45:00 Europe/Rome**.

| Esito | Sistema strutturato | Baseline con cronologia completa |
|---|---:|---:|
| Prove riuscite | **85/90 (94,44%)** | **89/90 (98,89%)** |
| Traiettorie con tutte le sei prove riuscite | 10/15 | 14/15 |
| Campi corretti, misura secondaria | 175/180 | 178/180 |
| Prove mancanti | 0 | 0 |
| Fallimenti dei controlli applicativi registrati | 0 | 0 |

Il successo primario richiede tutti i campi e tutte le relazioni corretti; per il dato mai stabilito richiede un'astensione appropriata. Una risposta parziale conserva il proprio posto nel denominatore ed è un insuccesso per questa misura. Giorno e ora di ciascun appuntamento formano un unico campo composto.

La media delle differenze appaiate, **strutturato meno baseline, è −4,44 punti percentuali**. Su 15 coppie ci sono **9 parità, 5 risultati migliori della baseline e 1 migliore del sistema strutturato**. I sei probe hanno lo stesso peso in ciascuna traiettoria, e i cinque profili hanno lo stesso numero di ripetizioni: il riepilogo 85/90 contro 89/90 coincide con la media dei punteggi per traiettoria e per profilo.

In questo compito la baseline ottiene un punteggio maggiore. Il risultato documenta continuità elevata per entrambi i sistemi e cinque errori circoscritti del sistema strutturato. La superiorità della memoria strutturata rispetto alla cronologia completa non è dimostrata. Il confronto resta descrittivo: nessun p-value, intervallo di confidenza, test di equivalenza o generalizzazione clinica è ricavato dalle 180 risposte.

### Risultati per prova

| Prova | Turno | Strutturato | Baseline |
|---|---|---:|---:|
| Identità: nome ed età | `s10t01` | 15/15 | 15/15 |
| Titolo del quaderno introdotto nella prima sessione | `s11t01` | 15/15 | 15/15 |
| Appuntamento: partner, accordo attuale, precedente e sola proposta | `s11t02` | **10/15** | **15/15** |
| Luogo attuale e luogo sostituito | `s11t03` | 15/15 | 14/15 |
| Attività completata e attività ancora pianificata | `s11t04` | 15/15 | 15/15 |
| Cognome mai stabilito: astensione appropriata | `s11t05` | 15/15 | 15/15 |

### Risultati per profilo

Ogni denominatore comprende tre ripetizioni delle sei prove.

| Profilo | Strutturato | Baseline | Differenza in punti percentuali |
|---|---:|---:|---:|
| Alex Carter | 18/18 | 18/18 | 0,00 |
| Crystal Smith | 17/18 | 18/18 | −5,56 |
| Daniel Isherwood | 16/18 | 18/18 | −11,11 |
| Jason Smith | 16/18 | 18/18 | −11,11 |
| Juanita Delgado | 18/18 | 17/18 | +5,56 |

### Categorie assegnate

| Categoria | Strutturato | Baseline |
|---|---:|---:|
| Completa | 70 | 74 |
| Astensione appropriata | 15 | 15 |
| Parziale | 1 | 0 |
| Errata | 4 | 0 |
| Contraddittoria | 0 | 1 |
| Astensione ingiustificata | 0 | 0 |

Nei singoli campi lo strutturato ha 175 valori corretti, quattro errati e uno omesso. La baseline ha 178 campi corretti e due ambigui nella stessa risposta contraddittoria. Le conte dei campi sono una misura secondaria e non aumentano il numero di osservazioni indipendenti.

## 2. Come sono stati prodotti e valutati i dialoghi

I profili sono Alex Carter, Crystal Smith, Daniel Isherwood, Jason Smith e Juanita Delgado. Per ciascuno sono state eseguite tre ripetizioni per sistema, con memoria iniziale vuota e directory distinte. Ogni sessione parte in un processo nuovo e rilegge lo stato persistito. L'ordine delle coppie e dei sistemi è stato fissato prima dell'esecuzione con seed locale `20260929`.

Entrambi i sistemi ricevono lo stesso blocco clinico completo, le stesse istruzioni e gli stessi messaggi del terapeuta. Le risposte paziente vengono generate separatamente. Il sistema `structured_common_profile` usa grafo, classificazione, stato dinamico, recupero e consolidamento nativi, con un adapter sperimentale che inserisce il profilo comune. La baseline `flat_full_history` rilegge dal disco **tutti i propri scambi precedenti** a ogni sessione. L'audit conferma la parità del blocco clinico e la presenza dell'intera cronologia nelle richieste della baseline.

La memoria strutturata mantiene i limiti del renderer congelato: evidenze 1.800, episodi 700 e storia recente 1.800 token stimati localmente; sintesi cumulativa 900 caratteri, soglia di compressione 1.200, riflessione 600 caratteri. Il limite comune del prompt completo è 64.000 token stimati come `ceil(byte_UTF8 / 3)`. Nessun prompt della baseline è stato troncato; il massimo osservato è 21.867 token stimati localmente, corrispondenti a un massimo nativo di 15.020 token. Lo stimatore locale e il tokenizer del servizio sono misure distinte.

### Modello e parametri

| Impostazione | Valore |
|---|---|
| Servizio | OpenRouter |
| Modello richiesto e restituito nelle risposte | `google/gemini-2.5-pro` |
| Backend restituito nelle risposte | Google |
| Temperatura: paziente / classificazione / memoria | 0,7 / 0 / 0,2 |
| Massimo output: paziente / classificazione / memoria | 4.096 / 4.096 / 8.192 token |
| Top-p | 0,95 |
| Budget di ragionamento | 1.024 token |
| Sequenze di stop | `\nTherapist:` e `Therapist:` |
| Seed API | Non inviato |
| Top-k API | Non inviato; il valore 40 della configurazione nativa è omesso dal trasporto |
| Routing | `require_parameters=true`, `allow_fallbacks=false` |
| Serializzazione | Un canale globale, almeno cinque secondi tra gli inizi delle richieste |
| Timeout HTTP / processo di sessione | 120 / 1.200 secondi |

I numeri delle ripetizioni e il seed dell'ordine non sono seed del modello. L'identificatore del modello non attesta pesi immutabili nel tempo. I corpi delle richieste e le risposte native sono archiviati per verificare le opzioni effettivamente trasmesse. Parametri e implementazione sono descritti anche in [IMPLEMENTATION.md](../IMPLEMENTATION.md).

### Valutazione automatizzata

Due contesti Codex separati, configurati con **`gpt-6-astra`, reasoning effort `xhigh`**, hanno valutato tutte le 180 schede. Ciascuno ha ricevuto soltanto domanda, risposta, fonti attese e rubrica, con ID opachi e senza etichette dei sistemi, prompt di generazione, cronologia dell'esperimento o giudizi dell'altro valutatore. I due pacchetti di schede sono identici nei byte. Un terzo contesto con la stessa configurazione ha esaminato l'unico disaccordo, ricevendo anche i due giudizi precedenti e ancora senza la chiave dei sistemi.

L'identità del modello effettivamente servito ai contesti Codex non è esposta dal runtime: i file registrano `requested_model=gpt-6-astra` e `observed_model=not_exposed_by_runtime`. Si tratta di una valutazione automatizzata, con il limite di possibili errori correlati fra contesti dello stesso modello. Lo stile delle risposte può suggerire il sistema anche in assenza dei metadati; il mascheramento non garantisce una cecità perfetta.

I due valutatori concordano su **179/180 schede (99,44%)**, sia nella categoria sia nel successo binario e nei giudizi per campo. Questo accordo descrive la coerenza dei due giudizi automatici e non misura, da solo, la loro validità. I giudizi originali e quello di risoluzione sono conservati integralmente in [ratings](../review/ratings/). Non sono state rilevate risposte mancanti o difetti del gold nelle schede valutate.

## 3. Errori osservati e tracciamento della memoria

### Sistema strutturato: cinque insuccessi sulla sola proposta

Tutti e cinque riguardano la proposta **sabato alle 09:30**, introdotta dal terapeuta in `s06t02` e mai confermata. In queste risposte sono corretti il partner Rina Holt, l'accordo attuale venerdì alle 18:20 e quello precedente mercoledì alle 17:45.

| Profilo e ripetizione | Esito | Problema nella risposta |
|---|---|---|
| Crystal Smith, 1 | Errata | Sostituisce la proposta con un riferimento estraneo a parlare dopo pranzo |
| Daniel Isherwood, 1 | Errata | Afferma che non era stata registrata una proposta specifica |
| Daniel Isherwood, 3 | Errata | Afferma che giorno e ora della proposta non erano stati stabiliti |
| Jason Smith, 1 | Parziale | Ricorda sabato e omette le 09:30 |
| Jason Smith, 3 | Errata | Afferma che giorno e ora della proposta non erano stati stabiliti |

L'audit secondario ha seguito la fonte del terapeuta, i record fattuali persistiti prima della domanda e il prompt effettivamente trasmesso, per tutti i 30 probe sugli appuntamenti. In **tutti i cinque insuccessi** il riferimento corretto era presente nella fonte e nei fatti validati salvati prima della domanda, mentre **l'ora 09:30 era assente dal prompt inviato**. In quattro casi mancava anche il riferimento a sabato; in Jason, ripetizione 1, rimaneva un riferimento al giorno senza l'ora. Nei dieci successi strutturati l'ora era presente nel prompt, così come in tutti i 15 prompt della baseline.

Questa evidenza localizza un limite nel passaggio dalla memoria persistita al contesto inviato al modello. Il tracciamento usa marcatori letterali ed estratti delle fonti; non isola quale componente fra selezione, versionamento, priorità delle evidenze e limiti di spazio abbia prodotto l'esclusione. L'associazione fra presenza del dato e successo è descrittiva. Una correzione futura richiederà una verifica separata; i punteggi di questo confronto restano quelli delle risposte archiviate.

Fonti riproducibili: [audit_proposal_context.py](audit_proposal_context.py) e [proposal-context-audit.json](proposal-context-audit.json), con timestamp, identificatori delle richieste, fatti salvati, estratti e hash dei file.

### Baseline: una contraddizione nella sostituzione del luogo

La risposta di Juanita Delgado, ripetizione 3, in `s11t03` indica correttamente **Plover Annex** come luogo attuale e **Larch Reading Room** come precedente. Aggiunge però che la correzione è avvenuta dal primo al secondo, dopo averli elencati nell'ordine attuale–precedente. Il valutatore A ha assegnato `complete`; B ha assegnato `contradictory`; il terzo contesto ha confermato `contradictory`, applicando la regola che una contraddizione nella relazione impedisce il successo completo.

L'interpretazione della frase conclusiva è il punto controverso. Per trasparenza, una sensibilità descrittiva aggiunta dopo la valutazione mostra che accettando il giudizio di A la baseline avrebbe **90/90**, e la differenza sarebbe **−5,56 punti percentuali**. Il risultato primario conserva la decisione del terzo contesto: **89/90**. La direzione del confronto è la stessa nelle due letture. Scheda e giudizi sono in [adjudication-001](../review/adjudication-001/); ID `fbf7f32ac8a84a65a7f5dbfd978a1042`.

## 4. Costi, dimensioni dei prompt e latenza

Le misure includono le operazioni aggiuntive del sistema strutturato. Il costo riportato da OpenRouter è **48,142587 USD** complessivi per la raccolta sperimentale; la valutazione Codex è esterna a questa contabilizzazione.

| Misura | Strutturato | Baseline |
|---|---:|---:|
| Sessioni / scambi paziente | 165 / 825 | 165 / 825 |
| Tentativi HTTP archiviati | 2.336 | 836 |
| Risposte HTTP / errori del servizio | 2.311 / 25 | 825 / 11 |
| Costo riportato delle risposte, USD | **33,764098** | **14,378489** |
| Token di prompt, tutte le risposte HTTP | 7.703.109 | 7.588.360 |
| Token di completamento, tutte le risposte HTTP | 2.518.537 | 681.228 |
| Token di prompt medi, sole risposte paziente salvate | **7.130,41** | **9.198,01** |
| Token di prompt massimi, sole risposte paziente salvate | 8.734 | 15.020 |
| Durata media del turno paziente, secondi | 25,87 | 11,42 |
| Durata mediana del turno paziente, secondi | 21,94 | 9,47 |

I prompt delle 825 risposte paziente per sistema hanno in media **il 22,48% di token in meno** nello strutturato. Il costo totale riportato dello strutturato è **2,35 volte** quello della baseline: le classificazioni e le generazioni della memoria contribuiscono al costo del pacchetto. Il risparmio nel prompt paziente non corrisponde quindi a un risparmio totale in questo esperimento.

I token di completamento nativi includono il ragionamento, dove riportato; non si sommano nuovamente i token di ragionamento. La tabella dei token di tutte le risposte include il completamento vuoto conservato durante una finalizzazione. L'uso associato agli errori è separato nell'audit: 207.451 token di prompt e 8.848 di completamento, con copertura di 35/36 errori. Il costo dichiarato di questi 35 errori è zero; l'errore 402 non riporta uso o costo e non viene imputato come gratuito. Questi valori derivano dai metadati del servizio e non da una riconciliazione indipendente della fattura.

La durata del turno strutturato include classificazione e operazioni del grafo. Le latenze non rappresentano il solo tempo di generazione né l'intera durata trascorsa tra avvio e fine del lavoro; le pause dell'operatore e i ritardi delle riprese sono esclusi. L'audit conserva separatamente tempi HTTP, tempi delle generazioni logiche comprensivi dei retry e distribuzioni dei turni accettati. Non è disponibile in questo riepilogo una misura isolata del tempo del recupero.

### Persistenza e consolidamento

Tutte le **165 sessioni strutturate** sono state finalizzate. Lo stato del consolidamento è `complete` per **80** e `partial` per **85**. Tutte le **825 fonti grezze** sono utilizzabili e risultano elaborate. Sono registrati **3.756 record fattuali validati**, **202 record respinti** e **2 batch di estrazione non validi**.

`partial` segnala record respinti o batch non validi conservati in quarantena. Le fonti originali rimangono presenti. Questo stato operativo non assegna un punteggio alle prove di continuità. I 3.756 record possono ripetere lo stesso fatto e non costituiscono una misura di correttezza clinica o un conteggio di fatti unici. Le versioni fattuali restano archiviate come prodotte; non è stata effettuata una valutazione semantica esaustiva di tutte le etichette `current`.

| Storage archiviato | Strutturato | Baseline |
|---|---:|---:|
| Tutti i file nelle directory delle traiettorie, byte | 238.432.182 | 186.685.066 |
| Registro degli scambi più stato e memoria nativi, byte | 51.080.721 | 35.820.455 |

La prima misura comprende prompt duplicati, ricevute, archivi HTTP e log. Esclude input congelati, copie delle riprese, file di controllo condivisi e valutazioni. Descrive l'archivio dell'esperimento, non la sola memoria necessaria al funzionamento del prodotto. I file JSONL della memoria strutturata occupano 5.306.657 byte. La scomposizione completa è in `runtime-audit.json`.

## 5. Interruzioni, riprese e integrità

L'audit finale riconcilia **3.172 richieste HTTP, 3.136 risposte e 36 errori del servizio**. Sono stati recuperati automaticamente **30 timeout 504 e due errori 429**. Altri **due 504, un 429 e un 402** hanno richiesto le riprese documentate. Una risposta HTTP 200 senza testo visibile durante l'estrazione fattuale è archiviata fra le risposte ed è stata recuperata con una ripresa separata.

La politica dei timeout è stata introdotta in [resume-04](../continuations/resume-04/AMENDMENT.md): al massimo tre tentativi con attese di 30/60 secondi. [resume-06](../continuations/resume-06/AMENDMENT.md) ha aggiunto i 429 con attese di 60/120 secondi e rispetto di `Retry-After` fino a 300 secondi. Il limite resta tre tentativi complessivi per prompt e configurazione; gli altri errori arrestano la matrice. Il recupero tecnico separato per `MAX_TOKENS` era previsto dal protocollo. Ogni tentativo e ogni modifica operativa rimangono identificabili.

La ripresa dopo il credito esaurito, [resume-07](../continuations/resume-07/AMENDMENT.md), conserva tutti i 1.449 scambi precedenti e recupera il quinto scambio della sessione 290 con lo stesso prompt. L'audit verifica la conservazione dei checkpoint e dei manifest delle sette riprese. Nessuna risposta completata è stata rigenerata in funzione del punteggio.

Due limiti della riproducibilità sono espliciti negli emendamenti: in `resume-03` l'aggiornamento emotivo casuale non persistito del tentativo fallito viene ricalcolato; in `resume-06` il processo ripreso inizializza nuovamente il generatore casuale Python dallo stato persistito. Il seed API è assente. Queste deviazioni operative impediscono di dichiarare una replica bit per bit di un'esecuzione ininterrotta.

Lo stato finale del controller è `completed`, senza `STOP` e senza richiesta lasciata in corso. L'audit finale è di sola lettura e non ha effettuato chiamate al servizio. Il manifest finale collega dati, punteggi e rapporto mediante SHA-256.

## 6. Che cosa dimostra il confronto e quali limiti restano

Il confronto risponde alla richiesta di misurare la continuità attraverso undici sessioni con una baseline che riceve lo stesso contenuto clinico: comprende riapertura dei processi, informazioni introdotte durante il dialogo, correzioni, proposte e dati assenti. Le evidenze consentono di riportare il disegno, i valori ottenuti e gli errori osservati nella risposta al revisore.

In queste condizioni la baseline con cronologia completa ottiene un risultato migliore. Lo strutturato mantiene l'identità e supera tutte le prove su quaderno, luoghi, attività e dato assente, ma perde il dettaglio della proposta nel contesto di cinque traiettorie. La maggiore complessità non produce un vantaggio di accuratezza o di costo totale in questo campione.

Restano questi limiti:

- Cinque profili simulati già conosciuti durante lo sviluppo, tre ripetizioni pratiche e uno stesso copione: generalizzazione limitata.
- Undici sessioni brevi, per 55 scambi a traiettoria: non equivalgono a undici sedute cliniche complete.
- La cronologia completa rientra nel contesto disponibile: la robustezza oltre tale limite non è stata misurata.
- Grafo, classificazione e stato dinamico differiscono insieme alla memoria: il confronto valuta i pacchetti complessivi e non identifica il contributo causale della sola struttura della memoria.
- La valutazione è automatizzata e basata sulla rubrica; un caso ammette una lettura alternativa. L'accordo elevato non sostituisce una validazione umana.
- Il servizio ha prodotto interruzioni e il modello non è fissato a pesi immutabili; le riprese sono tracciate con le deviazioni descritte sopra.
- Le prove riguardano continuità fattuale e identità in questo esercizio. Efficacia terapeutica, fedeltà clinica e rilevamento degli errori del terapeuta richiedono evidenze dedicate.

## 7. Dove trovare dati e impostazioni nel repository

Tutti i percorsi sotto sono relativi a `outputs/memory-comparison-run-2026-09-29/`, salvo il piano indicato esplicitamente.

| Materiale | Percorso |
|---|---|
| Risultati completi, profili, coppie e giudizi per campo | [`analysis/semantic-results.json`](semantic-results.json) |
| Conteggi, costi, token, latenze, storage e hash dei file runtime | [`analysis/runtime-audit.json`](runtime-audit.json) |
| Traccia della proposta dalla fonte al prompt | [`analysis/proposal-context-audit.json`](proposal-context-audit.json) |
| Aggregazione dei giudizi | [`analysis/score_review.py`](score_review.py) |
| Audit operativo | [`analysis/audit_final_runtime.py`](audit_final_runtime.py) |
| Tracciamento dei prompt | [`analysis/audit_proposal_context.py`](audit_proposal_context.py) |
| Tutte le 180 schede, con fonti attese | [`review/export-001/evaluator_a/cards.json`](../review/export-001/evaluator_a/cards.json) |
| Chiave fra schede, profili e sistemi | [`review/export-001/private/mapping.json`](../review/export-001/private/mapping.json) |
| Due valutazioni e risoluzione del disaccordo | [`review/ratings/`](../review/ratings/) |
| Singola scheda controversa e giudizi originali | [`review/adjudication-001/`](../review/adjudication-001/) |
| Profili comuni completi | [`generation/profiles/`](../generation/profiles/) |
| Configurazioni e messaggi terapeutici per traiettoria | [`generation/runs/`](../generation/runs/) |
| Istruzioni comuni esatte | [`design/COMMON_INSTRUCTIONS.txt`](../../memory-comparison-plan-2026-09-28/design/COMMON_INSTRUCTIONS.txt), nel piano |
| Gold e ordine delle esecuzioni | [`design/`](../../memory-comparison-plan-2026-09-28/design/), nel piano |
| Dialoghi integrali salvati | `runtime/<run_id>/accepted-turns.jsonl` |
| Prompt logici e generazioni per sessione | `runtime/<run_id>/sessions/session_XX/generation-events.jsonl` |
| Corpi HTTP, risposte native, parametri e costi | `runtime/<run_id>/sessions/session_XX/openrouter-api-records.jsonl` |
| Memoria persistita del sistema strutturato | `runtime/<run_id>/memory/` |
| Riprese, checkpoint e modifiche del trasporto | [`continuations/`](../continuations/) |
| Manifest della raccolta e dell'analisi conclusa | [`manifest.json`](../manifest.json), [`analysis/final-manifest.json`](final-manifest.json) |

Il riepilogo operativo del runner congelato conserva il campo `semantic_review` con valore `pending`: il runner non importa i giudizi successivi. **Lo stato della valutazione conclusa e i suoi punteggi si leggono in `analysis/semantic-results.json`.**

## Appendice A. Tutte le differenze appaiate

| Profilo | Ripetizione | Strutturato | Baseline | Differenza in punti percentuali |
|---|---:|---:|---:|---:|
| Alex Carter | 1 | 6/6 | 6/6 | 0,00 |
| Alex Carter | 2 | 6/6 | 6/6 | 0,00 |
| Alex Carter | 3 | 6/6 | 6/6 | 0,00 |
| Crystal Smith | 1 | 5/6 | 6/6 | −16,67 |
| Crystal Smith | 2 | 6/6 | 6/6 | 0,00 |
| Crystal Smith | 3 | 6/6 | 6/6 | 0,00 |
| Daniel Isherwood | 1 | 5/6 | 6/6 | −16,67 |
| Daniel Isherwood | 2 | 6/6 | 6/6 | 0,00 |
| Daniel Isherwood | 3 | 5/6 | 6/6 | −16,67 |
| Jason Smith | 1 | 5/6 | 6/6 | −16,67 |
| Jason Smith | 2 | 6/6 | 6/6 | 0,00 |
| Jason Smith | 3 | 5/6 | 6/6 | −16,67 |
| Juanita Delgado | 1 | 6/6 | 6/6 | 0,00 |
| Juanita Delgado | 2 | 6/6 | 6/6 | 0,00 |
| Juanita Delgado | 3 | 6/6 | 5/6 | +16,67 |

## Appendice B. Verifiche dell'interpretazione statistica

Copertura: **11/11 aspetti esaminati**. La tabella registra le cautele e i limiti applicabili a questo confronto.

| Aspetto | Verifica e limite |
|---|---|
| Paradosso di Simpson | Riepilogo e sottogruppi hanno pesi bilanciati; si mostrano tutti i profili. La direzione varia fra profili, senza inversione sistematica di tutti i sottogruppi. |
| Fallacia ecologica | I risultati aggregati su profili simulati non vengono attribuiti a singoli pazienti reali. |
| Selezione di Berkson | Il campione di cinque profili noti è di convenienza; non si ricavano associazioni o prestazioni di popolazione. |
| Condizionamento su un collider | Nessuna selezione o aggiustamento viene introdotto in base al successo osservato; resta tutta la matrice pianificata. |
| Frequenza di base | Le sei categorie artificiali non stimano la frequenza degli errori o valori predittivi nell'uso reale. |
| Regressione verso la media | Nessuna conclusione di miglioramento prima/dopo viene ricavata da casi selezionati. Il denominatore è la matrice congelata. |
| Sopravvivenza | Tutte le 30 traiettorie e tutte le 180 prove restano incluse; errori del servizio e riprese sono archiviati. |
| Ricerca selettiva di risultati | Sono riportate tutte le categorie e l'esito primario, inclusi i risultati favorevoli alla baseline. |
| Scelte analitiche multiple | Rubrica e protocollo sono congelati localmente; gli emendamenti operativi sono visibili. L'unica sensibilità aggiunta è esplicitamente distinta dal risultato primario. |
| Associazione e causalità | Il confronto riguarda pacchetti applicativi. La presenza della proposta nel prompt è una traccia diagnostica, senza ablation causale. |
| Causalità inversa | Le fonti e i fatti salvati hanno timestamp precedenti alle domande; nessuna direzione causale clinica viene inferita. |
