# Valutazione semantica automatizzata

Due agenti nativi avviati il 30 settembre 2026 in contesti nuovi, senza la
conversazione del genitore: `regional_rater_a` e `regional_rater_b`. Ciascuno ha
ricevuto soltanto il proprio `cards.json` e la medesima `RUBRIC.txt`: 120 risposte
integrali, domande e valori attesi. La permutazione usa il seed di esportazione
2026093002. Posizione, taglio, numero di token, prompt di generazione, copertura
delle fonti, mapping privato e giudizi dell'altro valutatore non sono stati forniti.
Il contenuto della risposta può comunque rendere intuibile la perdita di contesto;
non si sostiene che sia stata misurata l'efficacia del mascheramento.

Entrambe le esecuzioni richiedono `gpt-6-astra`, effort `xhigh`. Il runtime non
espone un'attestazione dell'identità effettivamente servita:
`model_observed = not_exposed_by_runtime`. Si tratta di valutazioni automatiche
in contesti separati dello stesso modello richiesto, non di valutazioni cliniche
umane né di verifica fra famiglie di modelli differenti.

Ogni agente ha dichiarato la lettura delle 120 risposte complete e ha salvato
720 giudizi di categoria e 1.440 giudizi di campo. Il programma di confronto
verifica schema, corrispondenza delle schede e uguaglianza di tutti i booleani:
**720/720 categorie e 1.440/1.440 campi concordi**. Non è stata avviata una terza
valutazione, perché non vi sono disaccordi. I file sono `ratings/a.json` e
`ratings/b.json`; il confronto è in `../analysis/comparison.json`.

I valutatori concordano su 512 categorie corrette, 992 campi corretti e 63
risposte con tutte le sei categorie corrette. Questi totali mescolano condizioni
sperimentali artificiali e non stimano l'accuratezza in uso reale. Le analisi
principali restano distinte per posizione e politica di riduzione.

Entrambi segnalano C060: la frase «whether you recorded the surname» lascia
ambiguo se sia negata la registrazione del cognome. Applicando la richiesta di
astensione esplicita, il campo è conservativamente errato. Accettarlo porterebbe
il solo totale complessivo a 513/720 categorie e 993/1.440 campi; **tutti i risultati
di richiamo positivo (quattro categorie/nove campi) resterebbero invariati**.
Nessuna risposta è stata rigenerata per modificarne l'accuratezza.
