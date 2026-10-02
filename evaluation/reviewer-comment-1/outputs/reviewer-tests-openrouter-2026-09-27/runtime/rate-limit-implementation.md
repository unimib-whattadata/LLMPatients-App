# Controllo del rate limit Vertex — implementazione

Implementato nel repository `LLMPatients-Agent` e verificato senza chiamate a Vertex.

- Limite predefinito: 12 richieste al minuto, distanziate, condivise tra processi per progetto, regione e modello mediante SQLite locale.
- Attese progressive dopo i 429, jitter indipendente dal generatore casuale della simulazione e rispetto di Retry-After (secondi/data HTTP) e Google RPC RetryInfo.
- Dopo tre 429 consecutivi: blocco condiviso di almeno cinque minuti; poi una sola richiesta di recupero durante il lease. Nessuna richiesta di recupero viene pianificata automaticamente.
- Un nuovo cooldown modifica anche le attese già in corso; una risposta iniziata prima di un nuovo 429 non annulla il blocco.
- Esaurimento dei tentativi: errore esplicito, senza ulteriori cicli di validazione del questionario né risposta paziente di fallback. Risposte parziali e memoria precedente conservate.
- API: HTTP 503 con Retry-After e codice vertex_rate_limited.

## Verifiche

**45 test locali superati**: 38 test su limite, provider, memoria e API, più 7 regressioni esistenti. Inclusi processi Python indipendenti, estensione di un cooldown durante l'attesa, circuit breaker, recupero, mantenimento dei risultati parziali e mancata creazione di una risposta paziente sostitutiva. `git diff --check` superato. I log e gli hash dei sorgenti sono indicati in `rate-limit-implementation.json`.

## Stato delle campagne archiviate

Il controllo è stato integrato nei runner archiviati mediante l'emendamento `vertex-shared-rate-limit-2026-09-27`, verificato con **18 ulteriori test locali** (9 PHQ e 9 longitudinali). I due snapshot scientifici, i prompt, i parametri di generazione e le regole di accettazione restano invariati. Il PHQ mantiene il proprio trattamento originale degli output MAX_TOKENS.

La ripresa autorizzata del 27 settembre 2026, alle 14:55 UTC, ha verificato il comportamento reale: Vertex ha restituito tre 429 consecutivi, con richieste distanziate di 20,85 e 44,72 secondi. Al terzo errore il runner è terminato automaticamente con codice 75, conservando il segnale di arresto condiviso. Nessuna risposta sostitutiva e nessun riavvio automatico. I test longitudinali non sono stati avviati durante questa ripresa.

Restano salvati **68 PHQ completi, 12 risposte parziali e 32 sessioni longitudinali, con 165 turni**. Le verifiche parziali PHQ e longitudinali sono entrambe PASS. Rispetto al checkpoint precedente sono cambiati soltanto i metadati della somministrazione interrotta e il relativo log, al quale sono stati aggiunti i tre errori reali. Il nuovo checkpoint conserva 375 file; dettagli in `rate-limit-stop-20260927T145806Z.json`.

Le campagne sono ferme per indisponibilità del servizio, come richiesto dall'utente. Alla prossima ripresa autorizzata si deve archiviare e riconoscere il segnale `rate-control/STOP.json`, rispettando il cooldown persistente e riutilizzando tutti i risultati già salvati.

La limitazione delle richieste riduce picchi e tentativi ripetuti; non può garantire capacità del servizio. Riferimento: [documentazione Google sugli errori 429](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/provisioned-throughput/error-code-429).
