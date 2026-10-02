# Correzione della finalizzazione e controllo su undici sessioni

## Esito più recente della ripresa autorizzata

La continuazione archiviata in `resume-01/` ha finalizzato **5/11 sessioni** e
conservato **26/55 scambi**, recuperando lo stato in cinque processi successivi.
Le cinque chiusure hanno salvato 100 fatti validati e 12 proposte respinte,
segnalando memoria parziale. La correzione della finalizzazione ha quindi
superato queste cinque chiusure live; l'esito dei probe longitudinali resta
non misurato perché sono previsti nelle sessioni 10 e 11.

Il test si è fermato il 28 settembre alle 16:56:15 UTC nella sessione 6, turno 2,
per una risposta del classificatore con contenuto nullo e finish reason STOP.
Nessuna richiesta è stata inviata dopo l'arresto. Nessun test è in esecuzione.
Il primo archivio `integration/runtime/` è rimasto immutato.

**Report corrente:** [resume-01/REPORT.md](resume-01/REPORT.md).
Le sezioni sotto descrivono la correzione e il primo tentativo conservato.

## Scopo

Verificare la correzione del rifiuto di un intero blocco di memoria dopo un fatto
non validato. Il controllo usa lo stesso profilo simulato Alex e lo stesso
copione di undici sessioni della prova precedente, con storage separato e codice
corretto congelato prima delle nuove inferenze.

È una prova di regressione su uno scenario già definito e parzialmente osservato,
non una validazione indipendente o un nuovo confronto con la baseline. I risultati
del confronto su cinque profili e il fallimento precedente restano archiviati in
`../memory-benchmark-2026-09-28/`.

## Correzione

- Solo i fatti che passano tutti i controlli di fonte, citazione, stato e richiamo
  entrano nella memoria strutturata.
- Le proposte respinte e gli errori di schema sono archiviati separatamente con
  il testo originale dell'estrazione; i dialoghi originali rimangono recuperabili.
- La chiusura può completarsi con `memory_status=partial`, esposto dall'API e
  persistito nel registro della sessione. I fatti respinti non vengono promossi.
- Errori del servizio, completamenti vuoti e problemi di persistenza continuano
  a interrompere la chiusura.
- La modalità rigorosa rimane il default per i chiamanti diretti; la chiusura
  nativa seleziona esplicitamente la quarantena delle proposte non validate.

## Verifiche già eseguite

86 test offline di produzione superati. Il replay della risposta che aveva
fermato la prima sessione salva 12 fatti validati e 3 proposte respinte, senza
modificare le fonti o richiamare il modello. L'estrazione non si ripete dopo
la riapertura dello store. Questi risultati non sostituiscono la prova live.

Anche i 22 test offline del controllo d'integrazione sono passati. La prova live
è stata avviata il 28 settembre 2026 alle 15:51:45 UTC e interrotta alle 15:52:56 UTC
su un errore 429 di OpenRouter durante il terzo scambio: due turni conservati,
zero sessioni finalizzate e nessuna domanda di verifica raggiunta. Non sono
state inviate richieste dopo l'errore. La correzione della chiusura è verificata
offline, ma la continuità live su undici sessioni resta da verificare.

Esito completo: [REPORT.md](REPORT.md).

## Percorsi

| Materiale | Percorso |
|---|---|
| Stato operativo e lavoro restante | `WORK_STATE.md` |
| Patch dei quattro file runtime | `analysis/runtime-correction.patch` |
| Hash prima/dopo la correzione | `analysis/correction-files.json` |
| Esito dei test di produzione | `analysis/production-tests.log` |
| Replay della risposta già osservata | `analysis/previous-extraction-replay.json` |
| Script del replay offline | `analysis/replay_previous_extraction.py` |
| Protocollo della prova corretta | `integration/PROTOCOL.md` |
| Copione e criteri di valutazione | `integration/scenario.json`, `integration/gold.json` |
| Versione congelata del runtime | `integration/source/`, `integration/manifest.json` |
| Risposte e memoria della prova live, quando avviata | `integration/runtime/` |

Modello previsto: `google/gemini-2.5-pro` tramite OpenRouter. Restano attivi il
distanziamento delle richieste e l'arresto al primo errore del servizio, senza
retry automatico di disponibilità. I parametri effettivi sono archiviati con
le richieste. Nessuna credenziale viene inclusa nei materiali della prova.
