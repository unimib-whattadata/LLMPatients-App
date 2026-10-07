# Uno scenario in cui la baseline contraddice il record del terapeuta

## Material Passport

- Data: 30 settembre 2026, Europe/Rome.
- Stato: audit mirato e 12 repliche completati; valutazione automatizzata conclusa.
- Ricerca: esplorativa, successiva al confronto principale, su pazienti simulati.
- Modello delle repliche: OpenRouter `google/gemini-2.5-pro`, backend restituito Google.
- Fonti: [audit dei dialoghi](archive-audit/findings.json), [risultati](results.json), [audit delle repliche](replay-audit.json), [protocollo](PROTOCOL.md).
- Il confronto principale resta **85/90 per lo strutturato e 89/90 per la baseline**. I casi qui analizzati sono esterni alle sei prove finali del suo punteggio.

## 1. Scenario trovato

**Il terapeuta registra come completata un'attività; la baseline nega che sia avvenuta.**

Nel turno `s04t02`, sessione 4, il terapeuta dichiara:

> I have recorded that you and Rina Holt completed the Folded Map listening card during this practice session. The card activity is finished. How would you describe the experience in one or two sentences?

Le istruzioni comuni del benchmark assegnano valore alle affermazioni esplicite del terapeuta sul record dell'esercizio. L'informazione sul completamento viene introdotta per la prima volta in questa domanda. La prova riguarda quindi la coerenza con un evento appena comunicato, non il recupero di un ricordo remoto.

### Due occorrenze documentate nello stesso scenario

| Paziente, ripetizione originale | Risposta della baseline | Risposta dello strutturato alla stessa domanda |
|---|---|---|
| Alex Carter, 3 | “we haven't discussed or done that specific activity.” | Accetta l'attività svolta e descrive l'ascolto della storia di Rina senza preparare in anticipo la propria risposta. |
| Juanita Delgado, 3 | “We haven't done that.” e “we never actually met or did any activity with a \"Folded Map listening card.\"” | Accetta l'attività svolta e descrive l'ansia di sbagliare e la difficoltà a concentrarsi sull'ascolto. |

Entrambe le negazioni sono state confermate come contraddizioni da un valutatore automatico separato con le etichette dei sistemi nascoste. Le risposte originali complete, le controparti strutturate, i turni precedenti, i percorsi e gli hash sono in [archive-audit/findings.json](archive-audit/findings.json). Sono **due esempi dello stesso scenario**, non due tipi indipendenti di problema.

Il fatto che le fonti siano state registrate nel benchmark consente di valutare la coerenza interna dell'esercizio. Non autorizza a considerare una smentita di un terapeuta come errore in un contesto clinico reale.

## 2. Verifica mediante replica dei prompt esatti

Sono state pianificate e completate **tre generazioni indipendenti per ciascuno dei quattro prompt originali**: due profili × due sistemi × tre repliche = **12 risposte**. Ogni corpo HTTP è risultato identico a quello del rispettivo turno originale, compresi prompt e parametri. Le risposte generate durante la replica non vengono aggiunte alla cronologia delle chiamate successive.

Si ripete soltanto la generazione paziente dal contesto archiviato. Classificazione, memoria e intero percorso di undici sessioni rimangono quelli già prodotti. Questo è un controllo della variabilità della risposta a un input fisso, non una nuova esecuzione completa del sistema.

| Esito delle sole repliche | Strutturato | Baseline |
|---|---:|---:|
| Coerente con l'attività svolta | 6/6 | 3/6 |
| Incerto, senza negazione esplicita | 0/6 | 3/6 |
| Contraddizione esplicita | **0/6** | **0/6** |
| Risposte mancanti | 0/6 | 0/6 |

**Le due negazioni esplicite originali non si sono ripetute in queste sei risposte della baseline.** Le tre risposte incerte appartengono ad Alex, replica 2, e Juanita, repliche 1 e 2. Queste ultime descrivono anche un'esperienza compatibile con la partecipazione, pur esprimendo incertezza sul nome o sul ricordo della scheda. La classificazione dell'incertezza è meno netta e può riflettere lo stile del paziente simulato: non viene equiparata a una contraddizione o usata per dichiarare tre fallimenti di memoria.

I dati confermano l'esistenza dei due errori archiviati e mostrano che il comportamento varia tra chiamate identiche. **Non dimostrano che la baseline fallisca sistematicamente in questo scenario.** Le tre ripetizioni hanno una funzione diagnostica, senza analisi di potenza o stima di una probabilità generale d'errore.

### Impostazioni e costo

- Modello: `google/gemini-2.5-pro`; tutte le 12 risposte restituiscono backend Google.
- Temperatura 0,7; top-p 0,95; massimo output 4.096; budget di ragionamento 1.024.
- Stop: `\nTherapist:` e `Therapist:`; nessun seed API e nessun top-k inoltrato.
- Routing: `require_parameters=true`, `allow_fallbacks=false`.
- Un canale seriale, almeno cinque secondi fra gli invii, politica di timeout e 429 già autorizzata.
- Ordine fissato con seed locale 20260930, usato esclusivamente per il calendario delle richieste.
- Esecuzione: 30 settembre, **17:44:03–17:46:05 Europe/Rome**.
- **12 richieste, 12 risposte, nessun errore del servizio**.
- Costo riportato da OpenRouter: **0,151966 USD** complessivi, di cui 0,07354575 per lo strutturato e 0,07842025 per la baseline.

Il costo riguarda solo le generazioni ripetute. Memoria, classificazione e preparazione dei contesti derivano dall'esecuzione originale; la valutazione Codex non rientra in questo importo. Non si usa questa piccola differenza di costo per stimare il costo complessivo dei sistemi.

## 3. Come sono stati cercati i casi

Sono state inventariate le **825 risposte** delle 15 traiettorie baseline. Lo screening automatico ha esaminato tutti i **735 turni esterni alle sei prove finali per traiettoria**, cercando nomi dei fatti, negazioni e riferimenti alla memoria. Un contesto Codex ha letto **378 estratti corrispondenti ai criteri** e almeno **89 risposte integrali**, con ulteriori contesti dei casi candidati.

È un audit mirato: non è una rivalutazione semantica esaustiva di ogni parola delle 825 risposte. Nel materiale esaminato sono emersi due casi chiari e sei osservazioni più deboli, conservate come incerte. Non sono emerse altre contraddizioni chiare su giorno/ora dell'appuntamento, luoghi, titoli o promozione di un piano a completamento. Questo esito non prova l'assenza universale di altri errori.

Le due occorrenze da replicare sono state selezionate sulla base del risultato osservato. Il protocollo, i quattro prompt e il calendario delle 12 chiamate sono stati salvati e identificati mediante hash prima delle repliche. La selezione successiva ai risultati impedisce di trattare queste risposte come un campione imparziale per confrontare i sistemi.

## 4. Valutazione dei casi e delle repliche

Le quattro risposte originali selezionate e le dodici repliche sono state mescolate in **16 schede con ID opachi**. Un contesto Codex nuovo ha ricevuto domanda, risposta, istruzioni comuni e [rubrica](replay-review/SCORING.md), senza etichette dei sistemi, provenienza originale/replica o risultati dell'audit.

Il contesto era configurato con `gpt-6-astra`, effort `xhigh`; l'identità del modello effettivamente servito non è esposta dal runtime. È una valutazione automatizzata, senza validazione clinica umana e senza garanzia che lo stile non suggerisca la condizione. I giudizi, le citazioni e i limiti interpretativi sono in [ratings.json](replay-review/ratings.json).

La rubrica separa `consistent`, `contradiction`, `uncertain` e `not_observed`. La frase «non ricordo» da sola non prova che il paziente stia negando un evento. Nei due originali la negazione esplicita è ulteriore rispetto all'incertezza; nelle repliche manca una negazione altrettanto netta. Questa distinzione è mantenuta anche quando rende meno favorevole il confronto locale per lo strutturato.

## 5. Interpretazione utilizzabile

Si può affermare che **la cronologia completa non impedisce ogni contraddizione con le informazioni introdotte dal terapeuta**: due esempi reali dell'esecuzione lo mostrano. Nei turni appaiati osservati il sistema strutturato integra l'evento e continua la simulazione in modo coerente.

L'evidenza disponibile riguarda un comportamento locale e variabile. Il fatto contestato viene introdotto nella domanda corrente; un vantaggio causale della memoria persistente non è identificato. Le riprese dello stesso prompt non ricreano nuovi percorsi indipendenti, e le differenze di storia e stato fra i sistemi restano quelle delle traiettorie originali.

Questi casi possono essere presentati come analisi qualitativa esplorativa, insieme all'esito delle repliche. **Il risultato principale resta favorevole alla baseline**, con 89/90 contro 85/90; i casi qui selezionati non vengono aggiunti retroattivamente al denominatore delle prove pianificate.

## 6. Verifiche e dati

L'audit ha verificato l'identità dei corpi HTTP originali e ripetuti, la corrispondenza delle risposte con il testo nativo, tutti i 12 esiti previsti e la conservazione degli hash dei **1.717 file runtime originali**. Nessun dialogo originale, punteggio principale o gold è stato modificato.

| Materiale | Percorso relativo a questa directory |
|---|---|
| Casi originali, controparti e copertura dell'audit | [archive-audit/findings.json](archive-audit/findings.json) |
| Estratti emersi nello screening | [archive-audit/screened-sentences.json](archive-audit/screened-sentences.json) |
| Protocollo delle 12 repliche | [PROTOCOL.md](PROTOCOL.md) |
| Prompt originali esatti | [replay-inputs/](replay-inputs/) |
| Ordine e hash fissati prima degli invii | [replay-schedule.json](replay-schedule.json), [replay-manifest.json](replay-manifest.json) |
| Script della replica | [replay.py](replay.py) |
| Risposte delle repliche | [replay-runtime/answers.jsonl](replay-runtime/answers.jsonl) |
| Corpi HTTP, costi e risposte native | `replay-runtime/<indice>__<caso>__rep<N>/openrouter-api-records.jsonl` |
| Schede con metadati nascosti e giudizi | [replay-review/](replay-review/) |
| Punteggi e provenienza riuniti | [results.json](results.json) |
| Verifica operativa e hash | [replay-audit.json](replay-audit.json), [final-manifest.json](final-manifest.json) |

### Controllo dell'interpretazione statistica: 11/11 aspetti esaminati

| Aspetto | Trattamento |
|---|---|
| Simpson | Originali selezionati e repliche sono separati; nessun aggregato di successo è presentato come effetto generale. |
| Fallacia ecologica | Nessuna inferenza su persone reali a partire dai due profili simulati. |
| Selezione di Berkson | I casi sono selezionati per un errore già osservato; non stimano prestazioni di popolazione. |
| Collider | La selezione sull'esito è dichiarata e impedisce un confronto causale o di prevalenza. |
| Frequenza di base | Il numero di casi trovati con uno screening mirato non stima la frequenza reale degli errori. |
| Regressione verso la media | Il mancato ripetersi delle negazioni è compatibile con la selezione di esiti sfavorevoli; nessun miglioramento del sistema è rivendicato. |
| Sopravvivenza | Tutte le 12 repliche pianificate sono conservate, anche quelle coerenti della baseline. |
| Ricerca selettiva | Si riportano errori originali, incertezze, repliche senza negazioni e copertura effettiva dello screening. |
| Scelte analitiche multiple | Ricerca esplorativa dichiarata; numero di repliche fissato prima degli invii e categorie incerte conservate separatamente. |
| Causalità | I prompt differiscono nei contesti originali dei pacchetti; il ruolo specifico della memoria non è isolato. |
| Causalità inversa | La dichiarazione del terapeuta precede la risposta; non si ricava una direzione causale clinica. |
