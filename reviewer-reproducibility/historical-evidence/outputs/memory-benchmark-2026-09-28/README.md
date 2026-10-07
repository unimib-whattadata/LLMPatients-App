# Continuità della memoria attraverso 11 sessioni

## Material Passport

- Materiali: cinque profili e dialoghi interamente simulati.
- Richiesta: confronto della continuità longitudinale con una baseline narrativa,
  mantenendo uguali le informazioni cliniche disponibili.
- Modello: `google/gemini-2.5-pro` tramite OpenRouter.
- Protocollo e sorgenti congelati prima dell'esecuzione: `manifest.json`.
- Stato effettivo della campagna: `run/status.json`; avanzamento: `run/progress.jsonl`.

## Esito dell'esecuzione

Il confronto del componente è completo: 55 sessioni preparate, 280 risposte
valutate. Cronologia completa, recupero dei dialoghi e memoria strutturata
ottengono tutti 40/40; la sola sintesi ottiene 20/40 a 4.000 token e 26/40 a
8.000 token. Non emerge una superiorità della memoria strutturata sulle prime
due condizioni.

Il controllo separato nell'applicazione si è fermato alla chiusura della prima
sessione: cinque scambi archiviati, zero sessioni finalizzate su 11, nessuna
domanda finale osservata. Il validatore dei fatti ha respinto l'estrazione e
causato `SessionMemoryError`; tutte le 14 chiamate al servizio erano riuscite.
La continuità dell'intera applicazione su 11 sessioni resta da dimostrare.

Risultati, costi, impostazioni e limiti: [REPORT.md](REPORT.md).
Diagnosi riprodotta offline: [integration-diagnosis.md](analysis/integration-diagnosis.md).

## Dove trovare le prove

| Materiale | Percorso |
|---|---|
| Disegno, condizioni, parametri e limiti | `PROTOCOL.md` |
| Cinque percorsi di 11 sessioni | `corpus/<patient_id>.json` |
| Domande e riferimenti per la valutazione | `corpus/gold.json`, `corpus/SCORING.md` |
| Domande senza risposte attese usate dal worker | `questions.json` |
| Ordine fissato prima delle chiamate | `schedule.json` |
| Versioni software ed encoder locale | `environment.json` |
| Implementazione congelata della memoria | `frozen/agent/core/` |
| Richieste e risposte native senza credenziali | `run/native.jsonl` |
| Checkpoint di ogni generazione, compresi errori | `run/calls/` |
| Sintesi, estrazioni e stato delle sessioni | `run/<patient_id>/sessions/`, `raw/`, `structured/` |
| Prompt, risposte finali e fonti recuperate | `run/<patient_id>/answers/` |
| Analisi automatica e pacchetto per lettura semantica | `analysis/` |
| Controllo aggiuntivo del percorso applicativo | `integration/` |
| Verifiche metodologiche e test locali | `review/` |

## Interpretazione

Il confronto principale riguarda il componente di memoria su dialoghi uguali
per tutte le condizioni. Comprende la baseline con tutta la cronologia e tre
strategie di memoria a due budget. I dialoghi sorgente sono prefissati; le
sintesi, le estrazioni e le risposte finali sono generate dal modello.

Il controllo in `integration/` attraversa invece l'API e la chiusura/ripresa
effettiva delle sessioni, con risposte paziente generate durante il percorso.
Il suo esito e quello del confronto vanno riportati separatamente. Nessuno dei
due test da solo dimostra efficacia clinica o superiorità generale del sistema.

Le risposte errate completate restano nel campione. Un errore di disponibilità
interrompe la campagna; una ripresa richiede un'esplicita istruzione dell'utente.
Le risposte attese non entrano nella preparazione della memoria o nei prompt.
