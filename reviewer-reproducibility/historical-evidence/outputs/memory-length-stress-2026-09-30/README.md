# Accuratezza e dimensione della cronologia

Prova esplorativa del recupero della memoria su cinque pazienti simulati, con
cronologie condivise di lunghezza crescente. I risultati e i limiti sono in
[REPORT.md](REPORT.md); le misure per profilo e condizione sono in
[analysis/results.json](analysis/results.json).

## Materiali

| Contenuto | Percorso |
|---|---|
| Protocollo fissato prima delle chiamate | [PROTOCOL.md](PROTOCOL.md) |
| Matrice e ordine delle 50 richieste | [schedule.json](schedule.json) |
| Profili, domande, gold riservato ai valutatori | `inputs/<profilo>/` |
| Trascrizione completa e memoria disponibili | `inputs/<profilo>/length_<dimensione>/{history,memory}.jsonl` |
| Prompt esatti della baseline e della memoria | `inputs/<profilo>/length_<dimensione>/{flat_full_history,structured_evidence}.txt` |
| Evidenze selezionate senza accesso al gold | `inputs/<profilo>/length_<dimensione>/selected-evidence.json` |
| Conteggi locali e provenienza dei prefissi | [corpus.json](corpus.json) |
| Diagnostica del recupero e del codificatore | [retrieval.json](retrieval.json), [offline-audit.json](offline-audit.json) |
| Richieste/risposte HTTP native | `runtime/<job>/openrouter-api-records.jsonl`, `runtime-02/<job>/openrouter-api-records.jsonl` |
| Registro completo dei 50 esiti | [runtime-02/answers.jsonl](runtime-02/answers.jsonl) |
| Correzione operativa del riconoscimento dei rifiuti | [AMENDMENT-01.md](AMENDMENT-01.md), [continuation.patch](continuation.patch) |
| Valutazioni automatiche separate | `review/ratings/` |
| Corrispondenza tra schede, sistemi e lunghezze | `review/private/mapping.json` |
| Verifica di prompt, parametri, conteggi, modelli e immutabilità | [analysis/runtime-verification.json](analysis/runtime-verification.json) |
| Aggregazione riproducibile | [analysis/summarize.py](analysis/summarize.py) |
| Sigilli dei materiali | `manifest.json`, `continuation-manifest.json`, `final-manifest.json` |

`target_tokens=0` identifica il prefisso iniziale, non un prompt vuoto. Gli altri
livelli sono nominali; i prompt contengono scambi completi. I token del tokenizer
locale sperimentale, l'uso nativo nelle risposte e le stime dei rifiuti di
OpenRouter sono misure distinte.

La memoria strutturata qui usa il solo componente di evidenze; i dialoghi
aggiunti restano fonti grezze, senza nuovo consolidamento. Questo archivio va
tenuto distinto dal confronto completo sulle undici sessioni in
`../memory-comparison-run-2026-09-29/analysis/REPORT.md`.

## Codice e ambiente

`experiment.py` prepara i corpus annidati, recupera le evidenze, fissa il piano e
gestisce la raccolta iniziale. `continuation.py` contiene la sola correzione
documentata, preservando i primi 31 esiti. `review_export.py` usa lo stesso
esportatore e la stessa rubrica fissati in `analysis_tools.py`, leggendo il
registro completo della continuazione.

Ambiente: Python 3.12.14; sentence-transformers 5.2.2, transformers 4.53.3,
torch 2.9.0, numpy 2.2.6, SciPy 1.16.3. Tokenizzazione locale in ambiente separato:
google-genai 2.25.0 con l'estensione local-tokenizer. Il tokenizer non invia testi
a Google. Generazioni esclusivamente via OpenRouter, Gemini 2.5 Pro. Il modello
locale MiniLM e il relativo percorso/revisione sono riportati nel protocollo.

Per ricalcolare offline i riepiloghi dai giudizi archiviati:

```sh
python3 analysis/summarize.py compare
python3 analysis/summarize.py score
```

Il primo comando scrive il confronto fra valutatori; il secondo applica
l'eventuale adjudicazione e ricostruisce le misure. Non effettuano chiamate API.
