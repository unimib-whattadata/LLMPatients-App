# Emendamento: regressione della finalizzazione con memoria parziale

## Motivo e autorizzazione

L'utente ha richiesto «fai le correzioni per le 11 sessioni» dopo l'arresto del
controllo originale. Quel controllo conserva il proprio esito: 5 turni,
0/11 sessioni finalizzate, nessuno dei 6 probe osservato. La risposta di estrazione
era completa, ma il validatore rifiutava alcune proposte e interrompeva l'intera
finalizzazione. La diagnosi e i record originali non vengono modificati.

Questo emendamento prepara una prova di regressione della correzione. Riutilizza
intenzionalmente copione e gold conosciuti; non è una prova indipendente o blind,
né un nuovo confronto di modelli, profili o baseline. Nessuna conclusione clinica
o superiorità della memoria viene presupposta.

## Unica modifica funzionale sottoposta alla prova

Il runtime di produzione aggiunge il consolidamento con quarantena: conserva
soltanto i fatti validati come tali e archivia separatamente le proposte respinte
o il batch JSON non valido. Può chiudere la sessione con memoria `partial`,
continuando a conservare le fonti originali. Stato e contatori sono persistiti;
la risposta API espone `memory_status` e `memory_warnings`.

Nessun errore di servizio, trasporto, output vuoto o scrittura viene riclassificato
come un consolidamento riuscito. Il test continua a fermarsi su questi errori.
Gli stessi validatori deterministici restano il criterio di ammissione dei fatti.

## Invarianti del confronto di regressione

- Canonico Alex Carter, stessa definizione di profilo.
- Stessi 55 messaggi del terapeuta e stessi 6 probe, stessi gold.
- Stesso adapter e trasporto OpenRouter, identici byte per byte.
- Gemini 2.5 Pro, temperature, output e thinking budget invariati.
- Medesimo pacing seriale di almeno 5 secondi, timeout e regole di arresto.
- Medesimo recupero singolo 4096→8192 esclusivamente per MAX_TOKENS.
- Vera `api.send_message` e `api.end_session`, processo nuovo per sessione.
- Nessuna asserzione di 11 fasi terapeutiche: `step_id` resta metadato API.
- Nuovo terapeuta `memory_integration_fix_alex_20260928` e storage vuoto separato.

Il percorso precedente `outputs/memory-benchmark-2026-09-28/` resta immutato.
La nuova esecuzione non riprende né sovrascrive quella fallita. Non copia risposte
del paziente, memorie o ledger precedenti nella nuova traiettoria.

## Raccolta e lettura degli esiti

Il harness aggiunge controllo di coerenza fra API, ledger e batch persistiti,
con conteggi distinti di fatti validati, fatti respinti e batch invalidi. Una
sessione `completed` indica dialogo e chiusura API terminati; `memory_status`
specifica separatamente se il consolidamento è completo o parziale.

Gli errori di validazione restano registrati e non vengono nascosti nei punteggi.
I 6 probe saranno riportati una sola volta se raggiunti, senza rigenerazioni per
accuratezza. Un risultato corretto dopo la correzione costituisce evidenza di
regressione su questo scenario conosciuto, non una stima indipendente generale.

## Freeze e verifiche offline

`lineage.json` contiene gli hash dei file riutilizzati e degli artefatti precedenti
protetti. La sorgente viene copiata dal working tree di produzione solo dopo il
segnale esplicito «codice pronto». `integration/manifest.json` congela quel codice,
il protocollo, il harness, i test, il trasporto, copione e gold prima delle API.

I test offline hanno rete disabilitata, modello fittizio e directory temporanee;
non leggono la chiave. Oltre ai controlli precedenti, verificano la raccolta
`complete`/`partial`, la chiusura e riapertura nativa di memoria parziale, la
quarantena del JSON non valido e il mantenimento dell'arresto su errore del
provider. L'avvio live resta riservato al coordinatore dopo la verifica del freeze.
