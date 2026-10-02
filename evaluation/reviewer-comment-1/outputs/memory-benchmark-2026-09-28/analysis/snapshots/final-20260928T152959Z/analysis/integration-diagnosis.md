# Diagnosi offline dell'arresto dell'integrazione

## Esito

Il batch originale di 15fatti è stato rifiutato dal validatore deterministico al
**fatto n.2 (indice1)**. La risposta del modello era completa (`STOP`, HTTP200)
e sintatticamente valida. L'errore riprodotto è `MemoryExtractionError`:
`The source sentence does not explicitly support agreement or completion`.

Sono state osservate **0/11 sessioni finalizzate, 5 turni del paziente e nessuna
probe di identità, richiamo finale o astensione**. Il primo ciclo si è fermato
nella chiusura della sessione 1. Non è un risultato di accuratezza longitudinale.

## Riproduzione

Ho importato esclusivamente il componente congelato
`integration/source/agent/core/factual_memory.py`. Le cinque fonti originali
sono state copiate in uno store Python in memoria; il callback `generate`
restituiva il testo originale archiviato, comprese le recinzioni JSON. Il prompt
ricostruito è risultato identico byte per byte alla richiesta archiviata.
Nessuna richiesta al modello: rete e subprocess vietati, nessuna lettura di
credenziali e nessuna scrittura ai dati o al codice congelati.

Il batch originale ha prodotto zero append anche nello store di replay. Un
trace dell'eccezione ha identificato il fatto corrente alla riga 217. In seguito
ho sottoposto separatamente ciascuno dei 15fatti invariati allo stesso validatore,
sempre in memoria, per individuare gli altri vincoli che rifiuterebbero il batch.
Questi controlli diagnostici non filtrano né sostituiscono il risultato originale.

## Cause concrete

| Fatto | Citazione originale | Stato estratto | Rifiuto |
|---|---|---|---|
| **2**, indice1 | `keeping a notebook sounds totally fine` | `agreed` | Mancano i verbi di accordo previsti dal predicato |
| 5, indice4 | `so no overthinking my overthinking` | `agreed` | Stesso vincolo lessicale |
| 11, indice10 | `I guess I'd try to say something that takes the blame` | `proposed` | La frase sorgente comprende `, you know?` e termina con `?` |

Per il primo fatto, la frase completa selezionata dal validatore è:
`But yeah, no, keeping a notebook sounds totally fine.`.
Il predicato `_supports_committed_status` richiede una parola dell'insieme
`agree/agreed/accepted/confirmed/committed` o delle forme italiane codificate
(righe 64–76). Le due frasi marcate `agreed` non soddisfano quel controllo.
Non è il filtro delle negazioni o delle ipotesi a fermarle: entrambi risultano
negativi nei controlli. Il predicato guarda la frase selezionata, non interpreta
l'assenso colloquiale o la frase successiva `I'm game.`.

Per il fatto 11, `_source_sentence` include il tag colloquiale `you know?`.
Il controllo alle righe 210–211 rifiuta qualsiasi frase selezionata che termini
con punto interrogativo. Il rifiuto è quindi riproducibile anche se la
proposizione estratta precede quel tag. Questo descrive il comportamento del
validatore; non riclassifica i fatti per far passare il test.

**L'ipotesi di un errore dovuto alle virgolette non è confermata.** Tutte le 15
citazioni sono sottostringhe letterali delle rispettive fonti e tutti i valori
sono sottostringhe delle citazioni. Anche i fatti 13 e 14 passano il controllo
letterale e la validazione isolata: dopo il parsing JSON, le virgolette coincidono
con quelle nelle fonti e non contengono backslash letterali aggiunti.

## Percorso dell'arresto

1. `factual_memory.py:217` solleva `MemoryExtractionError` sul fatto 2; nessun
   `fact_batch` viene scritto, dato il consolidamento atomico del batch.
2. `langgraph_builder.py:1433` intercetta l'errore e lo espone come
   `SessionMemoryError`, prima di persistere riflessione e sintesi cumulativa.
3. `api/app.py:545` non completa `finalize_session_memory`; non arriva alla
   chiusura del ledger né restituisce `status=finalized`.

La memoria originale contiene cinque `conversation_turn` e un `episode_summary`.
Non contiene `fact_batch`, riflessione o sintesi cumulativa persistita. Le
relative generazioni narrative precedenti restano nei log, ma il loro completamento
non equivale alla riuscita della finalizzazione. Il ledger non ha `ended_at`.

## Evidenza e limiti

I record osservati comprendono 14richieste e 14risposte native HTTP200, tutte
con terminazione `STOP`, senza eventi di errore del provider. L'ultima richiesta
è `_generate_factual_memory` e la risposta contiene 15fatti. Il campo
`accepted:true` del log indica il completamento della generazione al confine
trasporto/decoder; non indica che il validatore della memoria abbia accettato
il batch.

Fonti conservate:

- `integration/runtime/sessions/session_01/session.json`.
- `integration/runtime/sessions/session_01/generation-events.jsonl`, righe 27–28.
- `integration/runtime/sessions/session_01/openrouter-api-records.jsonl`;
  record `9359c400-8c7a-4fe6-98d4-7f3ab602f0d0`.
- JSONL della memoria e ledger sotto `integration/runtime/`.
- [Rapporto strutturato](integration-diagnosis.json): hash, trace, parametri,
  esiti dei 15controlli isolati e verifica di integrità.

Il replay stabilisce la causa concreta di questo arresto. Non misura la qualità
di tutte le estrazioni, né dimostra successo o insuccesso del richiamo a 11 sessioni.
Nessun risultato è stato scartato o reinterpretato, nessuna correzione del runtime
è stata applicata e nessuna sessione è stata rieseguita. La prova originale
rimane interrotta a 0/11 sessioni finalizzate.
