# Ripresa 04 — tentativi limitati dopo un timeout

## Material Passport

- Autorizzazione: «Ok procedi», in risposta alla proposta di pochi tentativi con
  attese crescenti sulla sola richiesta fallita.
- Studio: `../../`, stesso calendario, profili, grafi, modello e rubriche.
- Modello: `google/gemini-2.5-pro` tramite OpenRouter; impostazioni invariate.
- Stato di partenza: nove sessioni complete e quattro scambi della sessione 10;
  49 scambi salvati, 96 richieste, 94 risposte e due errori 504 archiviati.
- Verifica: test offline, riconciliazione dei dati e recupero su copia senza rete.

## Modifica della gestione dei timeout

Per ogni richiesta con prompt e parametri invariati sono consentiti al massimo **tre tentativi totali**:
quello iniziale e due ripetizioni dopo **30 e 60 secondi**. La politica vale per
entrambi i sistemi e per tutte le fasi di generazione dal blocco 10 in avanti.
Le chiamate storiche e gli errori precedenti restano registrati separatamente.
Resta separato il recupero `MAX_TOKENS` già previsto: una sola richiesta con
budget aumentato da 4.096 a 8.192 token, a cui si applica la stessa politica dei
timeout. Un'operazione che usa entrambi i budget può quindi arrivare a sei
tentativi HTTP complessivi; le due configurazioni sono archiviate distintamente.

Sono ammessi soltanto timeout 504 espliciti o il timeout locale riconoscibile del
trasporto congelato, con un esito di errore integralmente archiviato e privo di
risposta visibile accettabile. Una risposta riuscita non viene rigenerata. Errori
di protocollo, archivi incompleti, esiti ambigui, errori di scrittura e altri
codici di servizio conservano l'arresto immediato.

La ripetizione avviene dentro la stessa chiamata di generazione, mantenendo
immutati prompt, configurazione, modello e stato del grafo. Non si ripetono
classificazione, aggiornamento emotivo, turni già completati o consolidamenti
riusciti. I parametri OpenRouter, incluso `allow_fallbacks=false`, restano uguali.

Ogni tentativo è archiviato dal trasporto originale, e
`timeout-retries.jsonl` nella directory della sessione ne registra raggruppamento,
attese, identificativi e collegamenti agli esiti. Il mutex globale rimane
acquisito durante l'intera operazione. Le attese sono interrompibili da STOP e
si mantiene un intervallo minimo di cinque secondi tra gli inizi delle richieste,
anche dopo il successo di un tentativo successivo al primo.

Esauriti i tentativi, l'errore raggiunge il controller e arresta l'intera matrice.
Il job macOS rimane a esecuzione singola, senza riavvio automatico. Il timeout
complessivo di una sessione resta 1.200 secondi. Nessun controllo di disponibilità
aggiuntivo viene inviato al servizio.

## Conservazione e ripresa dal blocco 10

Prima dell'avvio, snapshot e hash conservano tutti i file runtime, inclusi i
due errori e lo STOP attuale. La risoluzione del solo errore terminale identificato
è documentata in `resolution.json`; il vecchio STOP rimane in `resolved-stop.json`.

La baseline interrotta è ripresa dal quinto scambio. Il prompt ricostruito dal
profilo e dai quattro scambi precedenti deve essere identico byte per byte al
prompt della richiesta fallita. Si salva soltanto la risposta mancante e si
chiude la sessione; non viene creata memoria strutturata nella baseline.

Dal blocco 11 il worker originale è richiamato attraverso un punto d'ingresso
che installa la politica di trasporto e ne registra il manifest nella ricevuta.
I sorgenti e i manifest originali e delle riprese precedenti restano invariati.
Le prime nove sessioni mantengono la politica originaria; la variazione viene
dichiarata nella relazione finale e nei conteggi degli errori infrastrutturali.
Tutte le risposte restano nel campione, indipendentemente dal contenuto.

## Limiti dei risultati

La modifica riguarda la gestione degli errori durante l'esecuzione. I controlli
offline e il successo di una ripresa non costituiscono un punteggio di memoria.
La valutazione delle domande finali segue il protocollo già congelato. Rimane
documentata separatamente, in `../resume-03/AMENDMENT.md`, la precedente ripresa
del turno strutturato con ricalcolo dello stato emotivo non persistito.
