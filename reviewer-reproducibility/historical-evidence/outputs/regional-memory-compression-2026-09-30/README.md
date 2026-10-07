# Posizione dei fatti, tagli regionali e compressione OpenRouter

Esperimento su cinque profili simulati con Gemini 2.5 Pro, con protocollo e input
fissati prima delle chiamate. Tutti gli archivi precedenti restano invariati.

- **105 richieste con taglio locale**: tre posizioni del blocco di fatti; controllo
  integrale e tagli del 50%/75% all'inizio, al centro o alla fine. Circa 64k token
  iniziali. Profilo e domanda sono protetti dal taglio locale.
- **15 richieste con plugin OpenRouter**: tre posizioni dello stesso blocco in
  circa 1.2M token. Il testo trasformato dal plugin non è disponibile.

## File e riproducibilità

- `PROTOCOL.md`: disegno, endpoint, limiti e regole di arresto.
- `build.py`: preparazione offline; `corpus.json`: 30 cronologie e posizione
  effettiva del blocco; `source-support-definition.json`: fonti sufficienti.
- `inputs/<profilo>/length_<n>/<posizione>/`: scambi con provenienza originale
  e prompt integrali/tagliati. L'ordine visualizzato è ricalcolato prima dei
  tagli; le lacune restano visibili negli indici. Gli attesi non entrano nei prompt.
- `schedule.json`: 120 richieste, ordine e hash; `manifest.json`: congelamento
  anteriore alle chiamate; `source-hashes.json`: provenienza dei materiali.
- `runner.py`, `openrouter_transport.py`, `timeout_retries.py`: raccolta seriale
  OpenRouter, controllo del budget, registrazione e ritentativi tecnici limitati.
- `runtime/answers.jsonl`: esiti impegnati; `runtime/<id>/`: richieste/risposte
  native e registro dei tentativi. Un errore irrisolto arresta la raccolta.
- `review/`: esportazioni per i valutatori, giudizi, corrispondenza privata e
  modalità di esecuzione. Sono valutazioni automatiche, non cliniche umane.
- `analysis/results.json`: misure per regione, intensità, posizione e profilo.
- `analysis/runtime-verification.json`: verifica dei payload, conteggi, costi
  e registri; `figures/`: grafico dei risultati in PNG/SVG.
- `REPORT.md`: risultati e interpretazione; `final-manifest.json`: integrità finale.

## Analisi offline

Eseguire su una copia dell'archivio: questi comandi rigenerano i file di analisi
e i relativi timestamp, che sono inclusi nel sigillo finale.

    python3 outputs/regional-memory-compression-2026-09-30/analysis/summarize_v2.py compare
    python3 outputs/regional-memory-compression-2026-09-30/analysis/summarize_v2.py score
    python3 outputs/regional-memory-compression-2026-09-30/analysis/verify_runtime.py

Il confronto esporta schede per l'adjudication se i valutatori discordano; il
punteggio richiede i giudizi necessari. I comandi non invocano modelli. V2
corregge tre casi limite amministrativi emersi da test sintetici; non cambia gli
endpoint o i risultati semantici. Vedere `audit/ANALYSIS-AMENDMENT-01.md` e la patch.

Per il grafico, `analysis/plot_results.py` richiede Matplotlib. L'ambiente
temporaneo usato è `/tmp/llmpatient-regional-plot`, separato da quello delle
chiamate. La preparazione usa `google-genai[local-tokenizer]==2.25.0`; le sue
dipendenze temporanee sono state rimosse dopo la preparazione per recuperare
spazio disco. Conteggi, prompt, codice e versioni restano documentati.

La raccolta non si riavvia su un runtime esistente. Per replicare servono una
directory distinta e percorsi sorgente controllati; non cancellare STOP o
marcatori di richieste incerte. Non eliminare dati per ripetere un risultato.

## Come leggere i punteggi

Il richiamo positivo riguarda **4 categorie / 9 campi** della conversazione.
L'indicatore complessivo include anche identità (2 campi) e cognome mai stabilito
(1 campo): può quindi essere 2/6 anche quando il richiamo positivo è 0/4.
Le fonti canoniche sono sufficienti per valore e stato (attuale/precedente,
completato/proposto); la loro assenza non esclude ogni possibile indizio residuo.
La perdita dopo rimozione della fonte non prova una superiorità di un altro
sistema, che qui non viene rivalutato.

## Risultati essenziali

120/120 risposte complete; costo nativo osservato 13,74986575 USD. Con la
compressione automatica da circa 1,2M token, richiamo positivo 20/20 all'inizio,
0/20 al centro e 20/20 alla fine. Nei 105 test locali, 542/542 campi corretti con
fonte canonica sufficiente conservata e 1/403 con fonte rimossa; l'unico recupero
in quest'ultimo gruppo dispone ancora di un'eco nel testo del paziente.

Tutte le matrici del 50% e del 75%, compresi i controlli favorevoli alla baseline,
sono in `REPORT.md`; nessuna cella è esclusa. Il grafico in `figures/` e le tre
righe aggiunte al TeX del revisore riportano gli stessi dati. La precedente
esportazione TeX/PDF è conservata in `previous-review-response/` con gli hash
del checkpoint precedente.
