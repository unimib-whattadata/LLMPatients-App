# Ripresa 05 — completamento della memoria della sessione interrotta

## Material Passport

- Autorizzazione: «Riprendi», dopo la comunicazione dell'arresto per una risposta
  senza testo durante il consolidamento della memoria.
- Studio: `../../`, stesso calendario, profili, grafi e criteri di valutazione.
- Modello: `google/gemini-2.5-pro` tramite OpenRouter, impostazioni invariate.
- Stato iniziale: 77 sessioni complete e tutti i cinque scambi del blocco 78;
  390 scambi conservati, 749 richieste HTTP, 741 risposte e 8 errori di servizio.
- Blocco interrotto: `juanita_delgado_001__r01__structured_common_profile`,
  terza sessione, dopo il quindicesimo scambio cumulativo.

## Causa e ambito della ripresa

Il 29 settembre 2026 alle 15:47:39 (Europe/Rome), la richiesta
`_generate_factual_memory` ha restituito HTTP 200 e fine `STOP`, ma nessun testo
visibile. Il runner ha archiviato l'esito e fermato l'intera matrice.
Questa risposta vuota resta distinta dagli otto errori provider: due storici e
sei timeout 504 recuperati al secondo tentativo dalla politica di `resume-04`.

Tutti i dialoghi e l'episodio della terza sessione sono persistiti. La riflessione
di sessione e l'aggiornamento del riepilogo generale erano già riusciti e sono
archiviati con i rispettivi prompt e identificativi; non erano ancora stati
scritti nella memoria persistente, perché la chiusura attende l'estrazione
fattuale. Nessun batch fattuale della terza sessione è stato salvato.

La ripresa riapre il logger della sessione esistente usando lo stato nativo
salvato dopo lo scambio 15. La funzione nativa di chiusura viene richiamata con
due risposte in cache: riflessione e riepilogo generale. Ciascuna può essere
riutilizzata soltanto se fase, prompt e parametri coincidono con la richiesta
archiviata. Il riuso è registrato in `recovery-resume05.jsonl` e non costituisce
una nuova chiamata al modello.

Si ripete soltanto la richiesta fattuale priva di testo, verificando l'identità
del prompt e dei parametri. Non vengono invocati nuovi turni, classificazione,
aggiornamento emotivo o generazione di episodi. Tutti i 390 scambi rimangono
identici. La risposta fattuale viene trattata dal validatore originale, inclusa
l'eventuale quarantena di fatti non verificati e la classificazione `partial`.

## Politica di esecuzione conservata

Il modulo dei timeout è una copia identica, verificata per hash, di quello già
testato in `resume-04`: massimo tre tentativi per timeout riconoscibili, con
attese di 30 e 60 secondi, mutex globale e intervallo minimo di cinque secondi.
L'autorizzazione attuale consente questa ripresa della risposta vuota. Non viene
aggiunta una politica di ripetizione automatica delle risposte vuote: un nuovo
esito vuoto o un altro errore non recuperabile arresta il test.

Dal blocco 79 si richiama il worker originale attraverso l'installazione della
medesima politica dei timeout. Modello, parametri, prompt, routing senza fallback
e timeout complessivo di 1.200 secondi per sessione restano invariati.
Il controller macOS è a esecuzione singola, senza riavvio automatico.

## Evidenze e verifica

- `checkpoint-audit.json`: riconciliazione dei dati e delle chiamate prima della ripresa.
- `snapshot/` e `snapshot-manifest.json`: copia e hash dello stato precedente.
- `resolved-stop.json` e `resolution.json`: conservazione e risoluzione del solo
  arresto identificato, compreso il blocco persistente della richiesta.
- `offline-results.json`: test locali, senza richieste al servizio.
- `native-preflight.json`: chiusura nativa eseguita su copia temporanea senza rete,
  usando una risposta fattuale fittizia; verifica riuso e prompt identici.
- `manifest.json`: sorgenti, evidenze e dipendenze congelati prima dell'avvio.

Il contenuto fittizio della prova locale non entra nei dati dell'esperimento.
Il completamento della chiusura non determina il punteggio di memoria: la
valutazione rimane quella prevista dal protocollo delle undici sessioni.
