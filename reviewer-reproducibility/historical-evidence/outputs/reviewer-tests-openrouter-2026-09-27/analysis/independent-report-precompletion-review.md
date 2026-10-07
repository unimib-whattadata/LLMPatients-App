# Revisione indipendente prima del completamento

## Perimetro

Revisione in sola lettura del generatore `scripts/build_final_report.py` (SHA-256 `3e484a1e06f5bf247fc18c6df9d0346a6aa64ed66721f95c820144a4729e3b53`), dei risultati PHQ e misstep conclusi, dell'audit storico e dell'inventario software. Non sono stati eseguiti nuovi test, inferenze o analisi longitudinali. Questo verbale è l'unico file aggiunto dalla revisione. `REPORT.md` non era ancora presente.

## Esito

**Nessun problema sostanziale che richieda una correzione del generatore prima del completamento.**

- I valori PHQ coincidono con `analysis/phq-validation.json` e `runtime/phq-completion.json`: 100 somministrazioni, 1.000 risposte, 20 run per profilo; medie 1,00 / 3,05 / 9,90 / 25,60 / 26,95 per Alex / Jason / Daniel / Crystal / Juanita. Daniel supera o raggiunge 10 in 18/20 run. I risultati non identificano la causa precisa dello scarto del revisore.
- La composizione è dichiarata correttamente: 68 run solo regionali, 29 solo OpenRouter, tre misti; 688 item regionali, quattro globali e 308 OpenRouter. Il report mantiene i punteggi completi dei run misti, distingue parametri richiesti ed effettivi, non presenta la continuazione come replica indipendente e non attribuisce effetti causali al servizio.
- Le affermazioni storiche sono sostenute dall'audit iniziale e dal confronto dei 50 prompt. L'identificativo del modello odierno non è attribuito retroattivamente agli output storici. Il riferimento al BES di Daniel è confermato in `main.tex:716` e `:734`.
- Panel B, κ complessivo e κ nel sottoinsieme appropriate coincidono con `runtime/app-backend-sensitivity-audit.json`. Saturazione, varietà limitata degli errori, precisione interna al corpus e assenza di una misura dell'efficacia dell'accecamento sono esplicitati correttamente.
- Risultati del backend e della correzione della memoria coincidono con gli artefatti runtime. `COMMIT-NOTES.md` concorda con lo stato Git di Agent, App e manoscritto; le modifiche preesistenti sono separate dalle correzioni della campagna.

## Controllo finale ancora necessario

La campagna longitudinale era in corso: nessun suo valore parziale è approvato come risultato definitivo da questo verbale. Dopo il completamento occorre verificare il `REPORT.md` prodotto, i conteggi e le tabelle finali. Aggiornare allora anche l'apertura di `COMMIT-NOTES.md`, che attualmente indica correttamente che i test longitudinali sono ancora in corso.
