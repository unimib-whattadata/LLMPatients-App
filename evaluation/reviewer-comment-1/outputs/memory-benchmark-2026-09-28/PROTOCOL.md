# Confronto controllato dei componenti di memoria

## Material Passport

- Origin skill: ARS-Codex / experiment-agent, run.
- Autorizzazione: l'utente ha approvato il confronto proposto; pazienti sintetici,
  Gemini 2.5 Pro tramite OpenRouter. Arresto su indisponibilità del provider.
- Disegno: diagnostico descrittivo dei componenti, distinto dal confronto
  dell'intero grafo applicativo e dalla validazione clinica.
- Stato: protocollo fissato prima di osservare risultati del modello.

## Domanda e unità di confronto

Misurare richiamo di fatti lontani, aggiornamenti temporali, accordi rispetto a
proposte, attività completate rispetto a piani e astensione su dati assenti.
Non è presupposta una superiorità della memoria strutturata.

Cinque profili canonici simulati; undici sessioni di dodici scambi per profilo;
otto domande finali per traiettoria. Le trascrizioni sono fixture sintetiche
identiche per tutte le condizioni. Le risposte iniziali sono prefissate, mentre
sintesi, estrazioni e risposte finali sono vere generazioni del modello.
Le cinque traiettorie appaiate sono le unità descrittive; le 280 risposte non
sono considerate 280 osservazioni indipendenti. Una generazione per domanda e
condizione: questa campagna non stima separatamente la variabilità del decoding.

## Condizioni

| Condizione | Contesto |
|---|---|
| `history_full` | Profilo e intera cronologia, senza riduzioni |
| `summary_4000`, `summary_8000` | Sintesi cumulativa comune e scambi recenti interi fino al budget |
| `raw_4000`, `raw_8000` | Sintesi comune, scambi recenti e recupero delle frasi originali |
| `structured_4000`, `structured_8000` | Stessa allocazione di raw, aggiungendo fatti estratti e versioni |

Tutte le condizioni condividono profilo completo e istruzioni di risposta. Per
isolare la memoria non vengono eseguiti classificazione/emozioni, controlli di
ruolo o altri nodi del grafo. La condizione structured valuta il componente di
memoria completo, non certifica il funzionamento dell'intera applicazione.

Budget dedicati al contenuto della memoria, esclusi profilo, domanda e istruzioni:
4.000 e 8.000 token stimati dal contatore locale della produzione (max fra unità
lessicali/punteggiatura e byte UTF-8/3). I token effettivi del provider vengono
registrati separatamente; non si dichiara equivalenza col tokenizer di Gemini.

- summary: sintesi intera o frasi intere entro il budget, poi scambi recenti fino
  al limite residuo.
- raw/structured: sintesi fino a min(budget/4,1800); scambi recenti fino a
  min(budget/4,1600); tutto il residuo al recupero. Allocazioni identiche.
- Recupero: stesso encoder locale all-MiniLM-L6-v2, algoritmo e domanda. Limite
  massimo 64 record in entrambe le condizioni, override esplicito rispetto al
  default applicativo 8 per valutare budget più ampi. Nessuna risposta attesa
  viene fornita al recupero. Fonti selezionate, punteggi e budget usati salvati.
- Vengono conservati record e scambi interi. Eventuali budget non saturati sono
  riportati, senza aggiungere testo irrilevante per pareggiare artificialmente.
- Le cache dei vettori sono separate per condizione. Il caricamento del modello
  encoder è misurato a parte: eseguito una volta per processo, attribuito una volta
  a ciascuna configurazione di recupero quando si discutono costi di deployment.

## Preparazione cronologica e fallimenti

Ogni sessione viene processata in un processo separato. Una sintesi cumulativa
generale viene generata per sessione, usando solo la sintesi precedente e i
dialoghi della sessione corrente, con obiettivo massimo 6000 caratteri. Deve
conservare nomi, orari, negazioni, attribuzioni e cambiamenti espliciti. Non vede
le domande finali. Si mantengono frasi intere fino a 2000 token stimati.
La stessa sintesi è riutilizzata nelle condizioni bounded.

Structured usa EvidenceMemory congelato dal repository e la sua estrazione in
gruppi di massimo cinque turni, con verifica letterale delle fonti. Raw conserva
gli stessi turni ma nessun fact_batch. Se l'estrazione è sintatticamente o
semanticamente respinta dai validatori, il fallimento viene registrato e le
ulteriori estrazioni di quella sessione sono saltate, senza rigenerazioni. Le
fonti originali rimangono recuperabili. La sessione successiva viene processata
normalmente. Questo fallback del componente è dichiarato: nell'applicazione
una finalizzazione fallita terrebbe invece aperta la sessione.

Qualunque errore di disponibilità, rate limit, trasporto o risposta in-band
interrompe l'intera esecuzione. Nessun retry automatico di tali errori. Le
generazioni completate sono conservate, anche quando errate. Una ripresa deve
essere autorizzata dall'utente e riutilizza i checkpoint.

Ogni richiesta ha un intento persistito prima della chiamata. In caso di arresto
fra risposta nativa e checkpoint, l'esito già archiviato viene recuperato senza
rigenerazione. Una richiesta inviata di cui manca l'esito ferma la ripresa per
riconciliazione; non viene ripetuta automaticamente.

## Impostazioni e ordine

- Gemini `google/gemini-2.5-pro`, OpenRouter; nessun altro modello.
- Risposte: temperatura 0,7, top-p 0,95, massimo output 4096, ragionamento 1024.
- Estrazione e sintesi: temperatura 0,2, output 8192, ragionamento 1024.
- Recupero prespecificato solo per MAX_TOKENS: una richiesta aggiuntiva 4096→8192;
  il completamento parziale resta archiviato e non viene valutato.
- Nessun seed API; stop `\nTherapist:` e `Therapist:`. Top-k e policy Vertex non
  inoltrati; richieste e risposte native conservate senza credenziali.
- Chiamate seriali, intervallo minimo 5 secondi; timeout HTTP 120 secondi;
  timeout di processo 1200 secondi per sessione; 3600 secondi per il processo
  delle 56 domande di un paziente, con checkpoint separato per ogni risposta.
- Ordine delle traiettorie e degli abbinamenti domanda/condizione fissato con
  seed locale 20260928 e salvato prima dell'esecuzione. Un profilo alla volta:
  undici sessioni di preparazione, poi tutte le sue domande in ordine mescolato.

## Scoring

Gold separato dai dialoghi e dal worker. Le domande vengono esportate senza valori
attesi o citazioni gold. Risposta richiesta nello stesso formato JSON per tutte
le condizioni: `{"answer":"valori richiesti"}`, oppure `{"answer":null}` quando
le fonti non consentono di rispondere. Questo controlla la forma nella prova di
memoria; non misura la naturalezza del dialogo clinico.

L'analisi automatica conserva una valutazione stretta: valore canonico esatto
(case e spazi normalizzati; punto finale facoltativo), oppure null per i dati
assenti. Ogni altra formulazione e ogni risposta temporale o relativa a stato
accettato/completato richiede lettura semantica. Risposte malformate, ambigue o con parafrasi vengono
segnalate per lettura semantica separata. La valutazione semantica verifica la
relazione temporale e lo stato richiesti: citare un valore corretto negandolo,
oppure mescolarlo a un valore errato senza distinguere le versioni, non basta.
Non si ripetono risposte per migliorarne il punteggio. Tutti gli esiti e le
decisioni di eventuale adjudication vengono conservati.

## Esiti e limiti

Accuratezza per traiettoria, categoria e condizione; disponibilità delle fonti;
token effettivi, costi nativi, latenza e tempo CPU del recupero. Si separano costo
di preparazione e costo delle risposte. I costi condivisi sono attribuiti una sola
volta per configurazione, con regola dichiarata. Il riuso degli stessi artefatti
per più condizioni non fa sparire il loro costo operativo.

Nessuna significatività o generalizzazione clinica viene inferita da cinque
traiettorie sintetiche. La baseline completa resta il riferimento anche se vince.
Corpus, rubriche, codice, trasporto, profili e prompt vengono congelati mediante
hash prima della prima chiamata. Correzioni successive richiedono un emendamento
visibile; non si cambiano i casi sulla base dei risultati per favorire un braccio.
