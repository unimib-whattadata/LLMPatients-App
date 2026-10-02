# Ripresa operativa 01 — confronto della memoria

## Material Passport

- Autorizzazione: messaggio dell'utente «Riprendi» del 29 settembre 2026.
- Esperimento: `../../`, protocollo in `../../../memory-comparison-plan-2026-09-28/`.
- Manifest del codice di inferenza: `../../manifest.json`, SHA-256
  `fc150bc97ed25ffd6a3308da59fa99bcd13527b8b1f768c29ded8d78b887ccc0`.
- Verifica richiesta: riconciliazione locale dei registri e ripresa del calendario.
- Il giudizio semantico delle risposte rimane una fase successiva.

## Punto di ripartenza

Al controllo prima della ripresa risultano otto ricevute di sessione complete,
40 scambi salvati e 76 richieste con le rispettive 76 risposte. Nessun errore del
servizio è registrato; il gate ha `in_flight=null` e il file STOP è assente.
Il processo originale non è più attivo. La causa della sua cessazione non è
registrata: non viene attribuita al provider, al terminale o alla sospensione
del computer senza ulteriori evidenze.

Il registro del controller contiene l'avvio del blocco 8 ma non il suo codice
di uscita; la ricevuta di quel worker, i cinque scambi e gli esiti delle richieste
attestano la chiusura. Il vecchio riepilogo riporta ancora sette sessioni.
Queste discrepanze sono riconciliate nel verbale, senza inventare un evento di
uscita. Il blocco successivo è il **9 del calendario**, sessione 1 della seconda
ripetizione di Juanita Delgado nel braccio strutturato.

## Conservazione e continuità

Prima dell'avvio si crea `snapshot/`, copia verificata per hash di tutti i file
runtime esistenti, incluse le precedenti versioni dei registri di controllo.
`prefix-audit.json` e `snapshot-manifest.json` documentano i controlli e i file.

Il controller richiama il worker congelato `../../paired_runner.py _worker`,
seguendo le voci 9–330 dello stesso calendario. Modello, prompt, profili,
normalizzazione, memoria, rubriche, gate e gestione degli errori sono quelli del
manifest originale. Le vecchie risposte rimangono nel registro di ogni traiettoria.
L'evento di autorizzazione della ripresa viene aggiunto al registro dei processi.
L'intervallo temporale della pausa resta osservabile nei timestamp.

Questa ripresa riguarda l'orchestrazione di processi esistenti e non costituisce
una versione alternativa del paziente simulato. Eventuali future modifiche al
worker di inferenza richiederanno l'emendamento e la separazione delle traiettorie
previsti dal protocollo. Nessun campione viene escluso per il suo contenuto o per
lo stato parziale della consolidazione.

## Processo indipendente dal terminale

Si usa un job utente macOS `launchd`, avviato una sola volta con `RunAtLoad=true`
e `KeepAlive=false`. Il plist è conservato in questa directory e non viene
installato tra gli elementi da avviare a ogni login. Il controller ha un lock
e una ricevuta esclusiva: un secondo lancio sulla stessa ripresa è rifiutato.

`caffeinate -i` mantiene attivo il computer durante l'inattività mentre il job
è in esecuzione. L'asserzione termina con il job; lo schermo può spegnersi.
Il controller registra un heartbeat ogni 30 secondi e applica il timeout di
1.200 secondi a ciascuna sessione. Lo stato si legge in `state.json`; i log sono
`controller.stdout.log` e `controller.stderr.log`.

Resta in vigore l'arresto globale al primo nuovo errore di servizio, rate limit,
trasporto, risposta vuota o esito incerto. Il supervisore non riavvia un job
terminato. Ogni ulteriore ripresa richiede un'istruzione successiva dell'utente.

## Verifica

I test della ripresa usano fixture, processi e comandi launchctl simulati, con
rete disabilitata. Verificano conservazione del prefisso, richieste riconciliate,
ordine del calendario, avvio esclusivo, assenza di replay e arresto sugli errori.
`offline-results.json` ne registra esiti e hash. Il manifest operativo congela
controller, test, plist, verbale e snapshot prima delle chiamate successive.

La baseline e il sistema strutturato devono ancora raggiungere i probe finali
delle sessioni 10 e 11. I controlli di integrità non sono punteggi di accuratezza.
