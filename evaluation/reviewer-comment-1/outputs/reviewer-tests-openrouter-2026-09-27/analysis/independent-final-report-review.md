# Revisione indipendente del report finale

**Esito: PASS. Nessuna correzione richiesta.**

- Report esaminato: `REPORT.md`, generato il 27 settembre 2026 alle 19:27:09 UTC.
- SHA-256: `c754dd332a091d9dfab9a3fbaa40717ac75be13ba415637e3c2158a0063fc369`.
- Fonti confrontate in sola lettura: `analysis/phq-validation.json`, `analysis/longitudinal-summary.json`, `analysis/longitudinal-audit.json` e le evidenze PHQ/misstep già esaminate nella revisione preliminare.
- Nessun test, inferenza o nuova esecuzione degli analizzatori. Dati, scorer, generatore e report non modificati.

## Coerenza dei risultati

Il report coincide con le analisi definitive: 100 PHQ, 1.000 risposte, 20 somministrazioni per profilo; 110 sessioni e 550 turni longitudinali, con 540 risposte tecnicamente valide e 10 esiti non validi. L'audit longitudinale è `strict`, completo, con integrità valida, nessun finding e provenienza verificata per tutte le 540 risposte valide.

| Misura | Sistema completo | Baseline |
|---|---:|---:|
| Primaria | 12/30 (40,0%) | 30/30 (100,0%) |
| Secondaria, tutti gli esiti | 46/85 (54,1%) | 75/85 (88,2%) |
| Secondaria, risposte tecnicamente valide | 46/83 (55,4%) | 75/79 (94,9%) |
| Esiti tecnici non validi | 2/275 | 8/275 |

Tutte le 60 prove primarie hanno risposte tecnicamente valide. I totali primari per paziente e le componenti nome/età, fatti aggiornati e fatto non interrogato fino a S11 coincidono con il JSON. Anche le tabelle per endpoint, le dieci traiettorie da 55 turni e i 55 avvisi sul consolidamento asincrono coincidono con le evidenze.

## Interpretazione

Il testo riporta correttamente che il risultato primario non sostiene la superiorità del sistema completo. Mantiene i fallimenti operativi nei denominatori complessivi e distingue le percentuali sulle sole risposte valide. Non trasforma i mancati match lessicali in contraddizioni.

Sono dichiarati il confronto tra configurazioni complete, le cinque coppie di traiettorie, la continuità della storia attraverso provider differenti, l'assegnazione operativa non randomizzata, le differenze nei parametri effettivi e l'assenza di validazione clinica. Non si presenta la continuazione come replica indipendente o come prova di un effetto causale della sola struttura.
