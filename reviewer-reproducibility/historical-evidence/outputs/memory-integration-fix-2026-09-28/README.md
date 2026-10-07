# Correzione della memoria e controllo su undici sessioni

## Esito conclusivo

**11/11 sessioni finalizzate e 55/55 scambi archiviati**, con OpenRouter
`google/gemini-2.5-pro`. Chiusure, fonti e ripristino della memoria fra sessioni
sono verificati. La prosecuzione finale ha prodotto 12 richieste e 12 risposte,
senza nuovi errori del servizio.

Sui sei controlli fissati prima del test:

| Esito | Numero | Dettaglio |
|---|---:|---|
| Pienamente corretto | 4 | Identità, sostituzione del luogo, attività completata/pianificata, astensione sul cognome mai stabilito |
| Parziale | 1 | Partner e appuntamento attuale corretti; omessi gli orari precedente 17:45 e proposto 09:30 |
| Bloccato dal filtro | 1 | La domanda sul titolo del quaderno è stata sostituita dal filtro dell'input |

Il filtro riconosceva `call` dentro `recall`. La regex è stata corretta aggiungendo
confini di parola dopo il turno 51; i quattro turni rimanenti hanno usato il
modulo corretto, verificato tramite percorso e hash. La risposta già bloccata è
conservata e resta nel denominatore. Non è valutabile come richiamo della memoria.
L'omissione dei due orari nella risposta parziale non dimostra da sola che siano
stati persi dalla memoria.

Sono archiviati **216 voci fattuali validate dai controlli automatici** e
**26 proposte respinte**. Dieci chiusure segnalano consolidamento parziale;
l'ultima è completa rispetto alle quattro fonti utilizzabili su cinque
conservate. Il turno bloccato rimane `usable=false`: non è promosso nei batch
fattuali, mentre resta nella cronologia narrativa. I 55 scambi hanno fonti
uniche e 54 sono utilizzabili per l'estrazione fattuale.

**Rapporto completo:** [safety-recall-fix/REPORT.md](safety-recall-fix/REPORT.md).

## Cosa dimostra

È una prova di regressione su un singolo profilo simulato, con cinque scambi per
sessione, processi separati e recuperi espliciti dopo gli arresti. Documenta il
completamento del percorso tecnico e i singoli esiti dei controlli. Il filtro è
cambiato durante la traiettoria; non è una replica indipendente con codice
invariato, una validazione clinica o una prova di superiorità sulla baseline.

Il confronto separato su cinque profili in `../memory-benchmark-2026-09-28/`
rimane immutato: full history, raw e structured hanno ottenuto 40/40 per
condizione; summary 4k 20/40 e summary 8k 26/40. Questi risultati non vanno
attribuiti alla traiettoria nativa corretta.

## Correzioni e verifiche

- La chiusura nativa conserva i fatti che superano tutti i controlli e archivia
  separatamente le proposte respinte, con fonti ed estrazione originale.
- Lo stato `memory_status=partial` è esposto dall'API e persistito nel registro.
  Provider, contenuti vuoti ed errori di persistenza continuano a fermare il test.
- Il controllo sui comandi usa confini di parola per evitare il falso positivo
  su `recall`; le altre guardie restano attive.
- Sono passati 86 test iniziali di produzione e 22 test iniziali d'integrazione.
  Per la correzione del filtro sono passati sette test di produzione (inclusi
  tutti i 55 input) e tre test mirati della prosecuzione, con rete bloccata.
- Verificati immutati 35 file originali congelati, le tre precedenti modifiche
  del controller, i runtime precedenti, 335 artefatti del confronto e tutti
  gli snapshot precedenti. Nessun processo di test è ancora attivo.

## Traiettoria conservata

| Archivio | Punto raggiunto | Motivo dell'arresto o della chiusura |
|---|---|---|
| `integration/runtime/` | 2 scambi, 0 sessioni chiuse | 429 del provider |
| `resume-01/runtime/` | 26 scambi, 5 sessioni chiuse | Completamento vuoto del classificatore |
| `resume-02/runtime/` | 40 scambi, 8 sessioni chiuse | 429 del provider |
| `resume-03/runtime/` | 51 scambi, 10 sessioni chiuse | Falso positivo del filtro su `recall` |
| `safety-recall-fix/runtime/` | 55 scambi, 11 sessioni chiuse | Completato |

I turni archiviati non sono stati rigenerati per migliorare i punteggi. I log
copiati sono contati una volta sola: 158 richieste, 156 risposte e due errori
nativi del provider. Il completamento vuoto precedente è incluso fra le
risposte. Costo dichiarato cumulativo delle risposte: **USD 2.0431225**; ultima
prosecuzione **USD 0.14163**. Sono gli importi nei log, non una fattura verificata.

## Impostazioni

OpenRouter `google/gemini-2.5-pro`; temperature paziente/classificatore/memoria
0.7/0.0/0.2; output 4096/4096/8192 token; top-p 0.95; thinking budget 1024;
nessun seed API. Il trasporto omette il top-k. Richieste seriali distanziate
almeno cinque secondi; unico recupero consentito 4096→8192 dopo MAX_TOKENS.
Prompt, risposte e parametri effettivi sono archiviati. Nessuna credenziale è
inclusa nei materiali della prova.

## Percorsi nel repository

| Materiale | Percorso |
|---|---|
| Rapporto e risultati conclusivi | `safety-recall-fix/REPORT.md`, `safety-recall-fix/results.json` |
| Copione e criteri congelati | `integration/scenario.json`, `integration/gold.json` |
| Prompt, risposte e log completi | `safety-recall-fix/runtime/sessions/` |
| Memoria persistente e registro | `safety-recall-fix/runtime/memory/`, `safety-recall-fix/runtime/runs/` |
| Risposte ai probe e valutazione | `safety-recall-fix/runtime/probe-review.json`, `safety-recall-fix/probe-assessment.json` |
| Protocollo della correzione finale | `safety-recall-fix/PROTOCOL.md`, `safety-recall-fix/manifest.json` |
| Patch del filtro e test | `safety-recall-fix/analysis/`, `safety-recall-fix/offline-tests.log` |
| Patch iniziale della memoria | `analysis/runtime-correction.patch` |
| Integrità e conferma di chiusura | `safety-recall-fix/integrity-check.json`, `safety-recall-fix/completion-evidence.json` |
| Snapshot finale: 90 file | `safety-recall-fix/snapshots/completed-20260928T203601Z/` |
| Stato operativo | `WORK_STATE.md` |
