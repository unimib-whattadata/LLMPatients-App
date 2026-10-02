# Ripresa operativa 03 — interruzione durante il quinto scambio

## Material Passport

- Autorizzazione: «Procedi», dopo la notifica dell'errore 504 del 29 settembre 2026.
- Studio e calendario: `../../`; stessi 30 percorsi, 11 sessioni per percorso.
- Modello: `google/gemini-2.5-pro` tramite OpenRouter; parametri congelati invariati.
- Verifica: audit degli archivi, test locali e prova del grafo senza rete.
- Nessuna valutazione semantica o selezione basata sulla qualità delle risposte.

## Evidenze conservate

Il checkpoint contiene otto sessioni complete e quattro risposte della sessione
successiva, Juanita Delgado, ripetizione 2, sistema strutturato. Sono conservate
tutte le 44 risposte, le 85 risposte del servizio e l'errore relativo alla richiesta
86. L'ultimo errore è un 504 esplicito nella risposta del provider, riconciliato
con il request ID, il registro di generazione, STOP e il gate. Non viene trattato
come un risultato accettato. Non ci sono richieste successive all'arresto.

Prima della ripresa tutti i file runtime, incluso STOP, sono copiati in
`snapshot/` e verificati per hash. Il vecchio STOP è conservato anche in
`resolved-stop.json`. La risoluzione del solo errore identificato è registrata
in `resolution.json`, prima di riaprire il gate. Il registro storico degli errori
non viene cancellato; il contatore complessivo include ancora il 504 precedente.

## Ripresa della sessione aperta

Il worker di recupero usa le stesse funzioni congelate del grafo e riaggancia
l'unica sessione nativa aperta al checkpoint del turno 4. I primi quattro turni
e le loro sorgenti restano invariati. La classificazione già riuscita del turno 5
è riutilizzata una sola volta dopo verifica esatta di prompt e parametri, con
riferimento al record originale; non si registra una falsa chiamata remota.

La prima richiesta esterna riguarda la risposta mancante al quinto turno. Se
riesce, il percorso nativo completa lo scambio e la consolidazione. Dal blocco 10
si torna al worker originale senza modifiche. Un errore interrompe nuovamente
l'intera esecuzione, senza retry o ripresa automatica. Resta consentito il solo
recupero MAX_TOKENS già previsto nel protocollo congelato.

## Deviazione documentata: stato emotivo del tentativo fallito

L'aggiornamento emotivo usa rumore casuale locale. Il vettore non arrotondato
e lo stato RNG del quinto tentativo non erano persistiti al momento dell'errore.
Il prompt fallito rimane archiviato, ma non viene presentato come un checkpoint
completo del grafo. La ripresa ricalcola questo aggiornamento, con lo stesso
algoritmo e dalla stessa memoria del turno 4. Non ricostruisce valori interni
a partire da numeri arrotondati e non forza il vecchio prompt su uno stato nuovo.

Prima della prima richiesta viene verificato che il prompt differisca, se
differisce, soltanto nell'intensità e nelle bande affettive prodotte dal codice
nativo. Profilo, istruzioni, memoria, storia, classificazione, evento e domanda
devono restare identici. Il confronto e i riferimenti alla classificazione sono
in `runtime/<run_id>/sessions/session_01/recovery-resume03.jsonl`.

Questa traiettoria conserva un indicatore esplicito di recupero nella ricevuta
di sessione. Nella relazione finale vanno riportati interruzione, ripresa e limite
RNG; il percorso resta nel campione. Un'eventuale analisi di sensibilità della
coppia coinvolta deve essere dichiarata separatamente, senza sostituire il
risultato primario e senza scegliere il campione in base ai punteggi ottenuti.

## Esecuzione e controlli

Job macOS una sola volta, `KeepAlive=false`, heartbeat ogni 30 secondi, timeout
di 1.200 secondi per sessione e gate globale di almeno cinque secondi. File e
test del recupero sono congelati in `manifest.json`. `native-preflight.json`
attesta la prova senza rete su una copia temporanea dello stato reale.

Le evidenze e i manifest delle riprese precedenti rimangono immutati. L'aggiornamento
delle ricevute vive conserva i primi quattro turni, mentre le versioni precedenti
sono integralmente disponibili nella copia verificata.
