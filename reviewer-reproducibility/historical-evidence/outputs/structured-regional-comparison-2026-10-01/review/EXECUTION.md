# Valutazione semantica automatizzata

Due agenti nativi avviati in contesti nuovi, senza la conversazione del genitore: `structured_regional_rater_a` e `structured_regional_rater_b`. Ciascuno ha ricevuto soltanto il proprio `cards.json` e `RUBRIC.txt`, con le 30 risposte distinte integrali, le domande e i valori attesi. La permutazione usa seed 2026100102. Nessun prompt, token, etichetta di posizione/lunghezza, mapping privato, selezione di evidenze, risultato baseline o giudizio del collega viene fornito. L’efficacia del mascheramento non è misurata: il contenuto della risposta può suggerire la qualità del contesto disponibile.

Modello richiesto `gpt-6-astra`, effort `xhigh`, fork della conversazione `none`. Identità effettiva non esposta: `model_observed=not_exposed_by_runtime`. Queste sono valutazioni automatiche dello stesso modello richiesto in contesti separati, non giudizi clinici umani o verifica fra famiglie diverse. Nessuna chiamata API esterna effettuata dai valutatori.

Entrambi dichiarano lettura delle 30 schede integrali. Ciascuno salva180 giudizi di categoria e 360 di campo. La verifica del codice concorda su **180/180 categorie e 360/360 campi**; zero disaccordi, quindi nessun terzo agente adjudicator. I file sono `ratings/a.json`, `ratings/b.json`; il confronto è in `../analysis/comparison.json`.

Sono corrette 90/180 categorie e 167/360 campi complessivi; il richiamo positivo, esclusi identità e cognome mai stabilito, è 31/120 categorie e 78/270 campi. Questi totali sono sulle 30 generazioni effettive, senza duplicare le risposte condivise nei 120 confronti.

Ambiguità concordemente risolte: C002 sul cognome esprime incertezza sulla registrazione, quindi manca un’astensione esplicita; C004/C030 non stabiliscono correttamente lo stato non concordato della proposta; in C022/C024/C028 “listening card” viene accettato come descrizione aggiunta al titolo “Folded Map”. Accettare il solo cognome di C002 aumenterebbe di uno i totali complessivi di categoria/campo, senza modificare il richiamo positivo. Nessuna risposta è rigenerata per accuratezza.

Il controllo computazionale usa `analysis/summarize_v2.py`: un emendamento separato richiede una corrispondenza biunivoca tra schede e job completati. La versione congelata rimane disponibile e nessun endpoint, formula o giudizio è modificato dall’emendamento.
