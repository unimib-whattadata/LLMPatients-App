# Confronto EvidenceMemory sugli scenari regionali

Stato: raccolta e valutazione completate. Leggere `REPORT.md` per tutte le 24 celle e i limiti.30 generazioni structured,120 confronti con la baseline sigillata,5 profili. Gli input strutturati a 64k sono condivisi fra 7 politiche baseline. Nessun input o risultato baseline è sovrascritto.

- `PROTOCOL.md`: disegno e impostazioni fissati prima delle chiamate.
- `manifest.json`:122 file congelati e 74 sorgenti esterne, con hash.
- `contexts.json` / `schedule.json`: mapping 30 contesti → 30 prompt distinti → 120 esiti baseline.
- `inputs/`: profilo, domanda, gold, prompt reale ed evidenze consegnate.
- `runtime/`: tutte le 30 richieste e risposte native; stato e costi.
- `review/`: schede cieche, mapping privato, giudizi e modalità di esecuzione.
- `analysis/results.json`: punteggi unici e 24 celle abbinate; `runtime-verification.json`: controlli del payload, dei costi e dei conteggi.
- `analysis/delivered-support-audit.json`: ricognizione separata del contenuto selezionato, senza leggere le risposte.
- `audit/`: verifiche indipendenti, correzione del solo controllo di mappatura delle schede, verifiche visive.
- `figures/paired-regional-recall.png` e `.svg`: tutte le celle, senza intervalli inferenziali.
- `previous-review-response/`: copia verificata del precedente TeX/PDF.
- `final-manifest.json`: hash finali e collegamenti agli archivi sorgente.

## Analisi offline

Dalla radice del repository, con Python 3:

```sh
python3 outputs/structured-regional-comparison-2026-10-01/analysis/summarize_v2.py compare
python3 outputs/structured-regional-comparison-2026-10-01/analysis/summarize_v2.py score
python3 outputs/structured-regional-comparison-2026-10-01/analysis/verify_runtime.py
python3 outputs/structured-regional-comparison-2026-10-01/analysis/render_report.py
```

Questi comandi leggono gli archivi e ricalcolano file derivati; non contattano servizi. La rigenerazione dei timestamp cambia gli hash finali dei derivati, quindi farla su una copia quando si vuole preservare il sigillo. I riferimenti assoluti in manifest e schedule sono quelli della copia locale al momento del test; un trasferimento richiede un rebasing dichiarato su copia, preservando i file originari. Versioni delle dipendenze in `preparation.json` e `figures/metadata.json`.

Il runner rifiuta un secondo `live` su un runtime esistente. Non occorre rieseguire modelli o ricreare embedding per controllare i risultati. Credenziali escluse dagli archivi.
