# Ricerca esplorativa di errori della baseline

## Material Passport

- Data: 30 settembre 2026, Europe/Rome.
- Richiesta: «Trova uno o più scenari dove la baseline fallisce».
- Materiale: pazienti simulati e dialoghi del confronto completato, con ricerca esplorativa successiva ai risultati.
- Stato iniziale: due contraddizioni trovate nell'archivio; 12 risposte di replica pianificate.
- Autorizzazione: la richiesta corrente prosegue i test già autorizzati con OpenRouter e lo stesso modello.

## Selezione e domanda

L'audit cerca nelle 825 risposte della baseline contraddizioni chiare rispetto ai record espliciti del terapeuta. Le sei prove finali per traiettoria restano valutate come nel confronto originale. Si distinguono contraddizioni, incertezze soggettive, ipotesi e dettagli creativi non vincolati dalle fonti.

I primi due casi chiari sono Alex Carter e Juanita Delgado, ripetizione 3, `s04t02`. Il terapeuta introduce come completata l'attività Folded Map listening card; la baseline nega che sia avvenuta. Le risposte corrispondenti dello strutturato accettano l'evento. Il fatto viene introdotto per la prima volta nella domanda corrente: il problema riguarda l'integrazione del record del terapeuta, e non dimostra perdita di un ricordo remoto.

La selezione è basata sugli errori osservati. La replica verifica se questi errori ricompaiono con gli stessi input; non stima un tasso generale d'errore e non sostituisce il punteggio 85/90 contro 89/90 del confronto originale. Altri candidati trovati nell'audit vengono conservati e descritti separatamente.

## Replica fissata prima delle chiamate

- Due profili × due sistemi × tre chiamate per prompt = **12 risposte**.
- Quattro prompt paziente copiati integralmente dai registri originali, verificati contro i corpi HTTP effettivamente inviati.
- Stesse configurazioni: OpenRouter `google/gemini-2.5-pro`, temperatura 0,7, top-p 0,95, output 4.096, budget di ragionamento 1.024, stesse sequenze di stop. Nessun seed API; top-k 40 omesso dal trasporto.
- Ogni richiesta è indipendente: le risposte della replica non vengono aggiunte al contesto della successiva.
- Ordine salvato con seed locale 20260930; tre ripetizioni fissate senza arresto in funzione dei risultati.
- Il contesto di ciascun sistema è esattamente quello della sua traiettoria originale. Profilo e domanda sono uguali nella coppia; i dialoghi precedenti e lo stato derivano dalle rispettive esecuzioni.
- Si ripete soltanto la generazione del paziente. Classificazione, estrazione, selezione della memoria e intero percorso di undici sessioni non vengono rieseguiti.
- Non vengono aggiunte istruzioni, tagli della cronologia, risposte attese o correzioni ai prompt.

La politica di trasporto è quella già autorizzata e congelata in `resume-07`: un canale, almeno cinque secondi fra gli invii, massimo tre tentativi per timeout o 429 verificati, con attese archiviate. Errori diversi, esiti incerti o tentativi esauriti arrestano tutto. Nessun riavvio automatico dopo l'arresto.

## Criteri di valutazione

Il record attuale del terapeuta dichiara esplicitamente completata l'attività. È una contraddizione una negazione esplicita dell'evento, della partecipazione o della sua registrazione. Una descrizione dell'esperienza coerente con l'avvenuto completamento soddisfa questa prova. L'incertezza su come ci si sia sentiti o l'espressione di ricordi vaghi, senza negare l'evento, viene tenuta distinta da una contraddizione.

Gli esiti consentiti sono `consistent`, `contradiction`, `uncertain`, `not_observed`. Tutte le risposte restano nell'archivio. Le classificazioni saranno accompagnate da citazioni e da una lettura automatizzata separata dei casi, con etichette dei sistemi nascoste. Gli originali selezionati e le repliche si riportano separatamente, senza sommarli per ottenere un tasso non distorto.

## Artefatti e limiti

`archive-audit/` conserva la ricerca nei dialoghi. `replay-inputs/` contiene i quattro prompt e la provenienza. `replay-schedule.json` fissa gli invii; `replay-manifest.json` conserva gli hash prima delle chiamate. `replay-runtime/` archivia input, risposte, costi, tentativi ed eventuale arresto. Il rapporto finale distingue risultati osservati e interpretazioni.

Questa verifica è diagnostica e selezionata dopo l'esecuzione. Tre repliche dello stesso prompt non sono tre traiettorie indipendenti. Un vantaggio locale non identifica il contributo causale della memoria e non modifica il risultato principale favorevole alla baseline.
