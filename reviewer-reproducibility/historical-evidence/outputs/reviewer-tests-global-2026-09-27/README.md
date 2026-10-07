# Verifica della revisione — prosecuzione documentata

Questa cartella prosegue la campagna in `../reviewer-tests-2026-09-27` dopo errori persistenti di capacità dell’endpoint Vertex `us-central1`. Il modello rimane `gemini-2.5-pro`; le nuove chiamate usano l’endpoint `global`.

## Dati conservati e obiettivo

- 68 PHQ-9 completi, 32 sessioni longitudinali concluse e tutti gli item/turni già salvati delle esecuzioni parziali sono riutilizzati.
- Obiettivo complessivo invariato: 100 PHQ-9 (20 per profilo, 1.000 risposte) e 110 sessioni (550 turni).
- I dati regionali e quelli successivi sono parti dello stesso protocollo continuato, non repliche indipendenti. Il cambio di endpoint e la ripresa del processo sono dichiarati nelle analisi.
- Le risposte accettate non vengono rigenerate. Gli esiti tecnici non validi restano nel denominatore longitudinale. I tentativi API falliti rimangono archiviati.
- Modello, profili, prompt di ricerca, parametri iniziali, scenari e criteri di scoring restano congelati. La ripresa di un turno non ancora concluso ricostruisce il normale stato runtime; l’RNG Python del processo viene reinizializzato, perché il runner originario non ne salvava lo stato.

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
