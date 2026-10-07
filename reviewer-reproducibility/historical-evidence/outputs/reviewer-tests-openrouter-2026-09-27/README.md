# Verifica della revisione — continuazione su OpenRouter

Questa cartella prosegue le campagne regionali e globali archiviate dopo gli errori di capacità di Vertex. Su richiesta dell’utente, le nuove chiamate usano **OpenRouter, `google/gemini-2.5-pro`**. I risultati precedenti sono conservati. Lo stesso nome di modello non attesta una revisione immutabile del backend o l’equivalenza delle politiche dei due servizi.

## Stato corrente

Sono completi **100 PHQ-9 con 1.000 risposte individuali** e **110 sessioni longitudinali con 550 turni**. Le analisi complete di integrità, provenienza e scoring sono passate. I processi sperimentali sono terminati con codice 0. Il [rapporto conclusivo](REPORT.md) contiene risultati e limiti; [CONTINUATION.json](CONTINUATION.json) registra lo stato della revisione finale. Tutti i risultati già accettati sono stati conservati.

Il sistema completo ottiene 12/30 prove primarie finali corrette, la baseline con storia integrale 30/30: questo esperimento non sostiene una superiorità della memoria strutturata. I percorsi attraversano i servizi dichiarati e il confronto riguarda cinque coppie di configurazioni complete. I dieci esiti tecnici non validi precedenti restano nel resoconto; nei 385 turni acquisiti tramite OpenRouter non sono presenti nuovi esiti di quel tipo.

- [Emendamento OpenRouter](openrouter-provider-amendment.json): modello, mapping dei parametri, routing e checkpoint precedente. Top-k e impostazioni di sicurezza Vertex non sono inoltrati; la configurazione del ragionamento non è sovrascritta.
- [Emendamento degli errori nativi](openrouter-error-handling-amendment.json): riconoscimento dei fallimenti upstream anche quando il gateway restituisce HTTP 200, con tentativi limitati e conservazione dei payload nativi.
- [Verifica PHQ](analysis/phq-validation.json) e [attestazione del completamento](runtime/phq-completion.json).
- [Modifiche da valutare per il commit](COMMIT-NOTES.md): inventario aggiornato dei tre progetti.

Il controllo di frequenza è condiviso tra le campagne. Un arresto per indisponibilità persistente richiede una nuova ripresa autorizzata; l’osservatore non riavvia i test.

## Cronologia della continuazione Vertex

Le sezioni seguenti descrivono le fasi precedenti, conservate come cronologia. Il loro endpoint `global` e i conteggi degli arresti non descrivono lo stato corrente su OpenRouter.

## Dati conservati e obiettivo

- 68 PHQ-9 completi, 32 sessioni longitudinali concluse e tutti gli item/turni già salvati delle esecuzioni parziali sono riutilizzati.
- Obiettivo complessivo invariato: 100 PHQ-9 (20 per profilo, 1.000 risposte) e 110 sessioni (550 turni).
- I dati regionali e quelli successivi sono parti dello stesso protocollo continuato, non repliche indipendenti. Il cambio di endpoint e la ripresa del processo sono dichiarati nelle analisi.
- Le risposte accettate non vengono rigenerate. Gli esiti tecnici non validi restano nel denominatore longitudinale. I tentativi API falliti rimangono archiviati.
- Nella continuazione Vertex, modello, profili, prompt di ricerca, parametri iniziali, scenari e criteri di scoring restano congelati. Il successivo mapping OpenRouter è dichiarato nell’emendamento separato. La ripresa di un turno non ancora concluso ricostruisce il normale stato runtime; l’RNG Python del processo viene reinizializzato, perché il runner originario non ne salvava lo stato.

## Provenienza

`endpoint-amendment.json` documenta l’emendamento operativo prima delle nuove chiamate. `regional-input-manifest.json` registra gli hash dei 371 file originali. `runtime/continuation-preflight.json` verifica la copia byte per byte e gli snapshot di codice.

Gli analizzatori controllano hash, prefissi dei log, risposte già accettate, prompt, configurazioni e ID API; riportano separatamente l’utilizzo degli endpoint. Un’analisi parziale non soddisfa i criteri di completamento.

## Stato e consegna

`CONTINUATION.json`, `phq-campaign-status.json` e `longitudinal/status.json` descrivono lo stato. `completion-observer.json` viene creato all’avvio dell’osservatore. `REPORT.md` viene generato soltanto dopo il completamento dell’intero protocollo e il superamento dei controlli; richiede comunque revisione finale.

I test software, il test backend reale e i ricalcoli del corpus misstep già conclusi si trovano in `runtime/`. Il manoscritto non è stato modificato; non sono stati eseguiti commit.

## Pausa richiesta dall’utente

I test e l’osservatore sono stati arrestati su richiesta dell’utente. Non è previsto alcun riavvio automatico. Restano salvati 68 PHQ-9 completi, 32 sessioni complete e 165 turni longitudinali complessivi. Le due sessioni parziali contengono rispettivamente tre e due turni salvati. `runtime/user-pause.json` verifica l’arresto; `user-pause-input-manifest.json` fissa gli hash dei dati alla pausa. La diagnosi europea preparata non è stata eseguita.

Alla ripresa occorre verificare il checkpoint e documentare il nuovo processo, preservando ogni risultato accettato. Gli eventuali tentativi globali falliti di turni non conclusi richiedono la stessa verifica di provenienza applicata alla precedente ripresa regionale; nessun risultato completo va rigenerato. I vecchi PID sono terminati.

## Ripresa autorizzata e nuovo arresto — 27 settembre 2026

Dopo un controllo del servizio con risposta HTTP 200, l’utente ha autorizzato la ripresa. `process-resumption.json` documenta il riuso del checkpoint e un solo worker per campagna. Il processo PHQ ha salvato **quattro nuove risposte individuali**; le risposte salvate nelle somministrazioni incomplete sono ora 12. Sono registrate quattro risposte API e 32 errori `TooManyRequests`, con **17 tentativi falliti consecutivi** dopo l’ultima risposta alle 13:55:56 UTC.

Il processo PHQ è stato arrestato, applicando l’istruzione precedente dell’utente di interrompere i test quando il servizio non è disponibile. Il controllo finale delle 14:03 UTC conferma che non rimangono processi sperimentali attivi. Il controller longitudinale ha superato il preflight della ripresa ma non è stato avviato. Nessun riavvio è programmato.

Restano completi **68/100 PHQ-9** e **32/110 sessioni longitudinali**, con **165/550 turni** salvati. La verifica PHQ parziale non rileva errori di integrità; tutti i risultati precedenti sono conservati. Il nuovo arresto è documentato in `runtime/resume-stop-20260927T140335Z.json`; il checkpoint corrente contiene 375 file, con manifest `resume-stop-input-manifest-20260927T140335Z.json` e copia in `runtime/resume-stop-checkpoint-20260927T140335Z/`. Il precedente checkpoint e l’emendamento di ripresa restano invariati.
