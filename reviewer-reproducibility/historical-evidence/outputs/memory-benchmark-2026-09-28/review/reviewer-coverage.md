## Material Passport

- Artifact: copertura della critica sulla continuità in undici sessioni.
- Data: 2026-09-28.
- Modalità: revisione metodologica e ispezione statica; nessuna chiamata al provider e nessuna modifica al runtime.
- Materiali: `PROTOCOL.md` del benchmark; runner `run_longitudinal_session_openrouter.py` già archiviato; runtime attuale `agent/api/app.py`, `agent/core/langgraph_builder.py`, `agent/core/prompt_builder.py`, `agent/core/factual_memory.py`, `agent/utils/run_logger.py`.
- Stato: ANALYZED, raccomandazione prospettica; non certifica risultati ancora da raccogliere.
- Dati: soli profili e dialoghi sintetici, già autorizzati dall'utente.

## Risposta breve

Il protocollo preparato può rispondere **direttamente ma con un perimetro limitato** al quesito del revisore: verifica il recupero di fatti dopo undici sessioni processate cronologicamente e confronta rappresentazioni della memoria con un prompt narrativo che riceve la stessa storia. Consente inoltre di misurare quanto aggiungono i fatti strutturati rispetto al semplice recupero delle frasi originali, a parità di budget.

Non basta, da solo, a dichiarare che l'intera applicazione conserva identità e memoria durante undici sessioni effettivamente generate dal suo grafo. Le risposte intermedie sono fixture, il prompt finale è controllato e in JSON, i nodi di classificazione/emozione/ruolo sono esclusi, il limite di recupero è 64 invece del default 8 e la condizione structured può proseguire dopo un'estrazione rifiutata. Nell'applicazione reale una finalizzazione fallita rimane aperta.

Questa limitazione non rende inutile il confronto: delimita esattamente la domanda a cui può rispondere. Il PHQ-9 riguarda una verifica distinta e non deve essere ripetuto per coprire la continuità.

## Minimo complemento end-to-end consigliato

Eseguire **una traiettoria di undici sessioni, cinque turni per sessione**, sul runtime modificato e congelato, come controllo di integrazione longitudinale. Scegliere il profilo prima di qualsiasi risultato, per esempio il primo nell'ordine casuale già congelato. Non scegliere a posteriori il profilo con il risultato migliore.

Cinque turni per sessione raggiungono la soglia nativa del riassunto episodico e permettono un controllo contenuto. Sono 55 vere risposte del paziente, oltre alle chiamate ausiliarie. Questo è il minimo controllo tecnico; non è una nuova stima di accuratezza generalizzabile ai cinque profili.

### Percorso da usare

1. Una cartella di output, un therapist_id e un archivio JSONL nuovi; nessun uso della memoria o delle risposte già ottenute nei test precedenti.
2. Profilo canonico e memoria nativa, senza preinserire fatti estratti, riassunti o risposte attese.
3. Un processo nuovo per ogni sessione. Richieste reali a `api.send_message(...)`, che esegue `graph.invoke(...)`, poi `api.end_session(...)`, che esegue la finalizzazione nativa.
4. Risposte intermedie effettivamente generate dal paziente. Il medesimo Gemini 2.5 Pro viene instradato tramite OpenRouter per **tutte** le chiamate, comprese classificazione, episodi, riflessioni, sintesi ed estrazione.
5. Prompt, limite di otto record, budget e controlli del runtime nativi. Nessun override del benchmark dei componenti e nessun fallback ad hoc che dichiari chiusa una sessione fallita.
6. L'avvio della sessione successiva ripristina solamente lo stato persistito dal runtime. La cronologia completa non viene reinserita nel prompt come scorciatoia.
7. Arresto immediato su indisponibilità del provider e conservazione dei checkpoint. Errori locali di finalizzazione sono esiti del controllo; non sono sessioni completate.

### Eventi e domande

Riutilizzare la struttura del runner longitudinale: informazioni attribuite esplicitamente al terapeuta, cambiamento successivo dello stesso oggetto e richiamo nella sessione 11. Per un controllo tecnico è lecito riutilizzare gli scenari precedenti, purché sia chiamato controllo di regressione e non corpus indipendente. In alternativa, congelare nuovi valori prima della prima risposta, mantenendo identici tempi di introduzione e domande.

Gli elementi minimi sono: identità invariata; un'etichetta introdotta nelle prime sessioni e non ripetuta; un nome e un giorno/orario aggiornati a metà percorso; distinzione fra valore iniziale e attuale; domanda su un dettaglio mai specificato. Le etichette devono descrivere ciò che il terapeuta ha scritto o proposto: il loro ground truth resta valido anche se il paziente è riluttante. Accordi e completamenti non possono essere imposti da una fixture quando si lascia al paziente la generazione libera; vanno valutati sulla conversazione effettiva oppure lasciati al benchmark controllato.

### Criteri di completamento e prove archiviate

- Undici sessioni davvero finalizzate e 55 risposte valide del modello, oppure conteggio preciso del punto di arresto e del motivo.
- Tra una sessione e l'altra: ripristino del medesimo paziente/terapeuta, identità stabile, fonti senza duplicazioni e ordine temporale corretto.
- Cronologia breve entro il limite nativo, con fonti delle sessioni precedenti ancora presenti sul disco.
- Per ogni domanda valutata: prompt effettivo, risposta, evidence_context, episodi recuperati, sintesi, riferimenti di fonte e record nativi del provider.
- Risultati separati per richiamo corretto, contraddizione temporale, invenzione, astensione e fallimento operativo. Non trasformare automaticamente un rifiuto di rispondere in prova che il dato sia stato cancellato: la disponibilità della fonte nel prompt è una misura distinta.
- Token e costi di tutte le chiamate, tempo di costruzione della memoria e latenza delle risposte. Le chiamate di estrazione vanno etichettate come tali.

## Come usare il runner esistente senza alterare gli archivi

La funzione `run_full` del runner archiviato invoca già direttamente le route Python `send_message` e `end_session`, ricostruisce RunLogger e usa processi distinti. È una buona base da copiare in un harness nuovo e parametrizzato, puntato alla fotografia del runtime modificato.

Non avviare direttamente i vecchi launcher: percorsi `OUT`/`ROOT`, manifest, amendment, checkpoint e politica di retry sono legati alla campagna precedente. Il controllo deve avere un nuovo manifest e la politica attuale di arresto su indisponibilità.

La classificazione delle chiamate in `ObservedModel` va estesa per riconoscere `_generate_factual_memory`; altrimenti l'estrazione viene registrata come `patient_response` e l'attribuzione dei costi è errata. È un adattamento di osservazione del nuovo harness, non una modifica degli esiti.

Il test tramite route Python attraversa il grafo e la persistenza, ma non il trasporto HTTP o l'interfaccia utente. Per il quesito sulla continuità questo percorso è sufficiente; va descritto correttamente.

Inoltre, nel runtime attuale `MessageRequest.step_id` non viene incluso da `_build_graph_payload`, e `State` non espone quel campo. Assegnare step_id da 1 a 11 nel runner non prova quindi che siano state eseguite undici fasi terapeutiche distinte. La formulazione corretta è **undici sessioni consecutive con chiusura e ripristino dello stato**. La conformità a un arco clinico completo richiede un'altra verifica.

## Portata della risposta al revisore

Il benchmark controllato più questo controllo di integrazione consentono una risposta del tipo:

> Abbiamo valutato la continuità fattuale attraverso undici sessioni su dialoghi sintetici identici per tutte le condizioni, confrontando cronologia completa, sintesi, recupero delle frasi e memoria strutturata. Il confronto controlla il contenuto clinico e misura separatamente accuratezza e costo del contesto. Un controllo aggiuntivo ha verificato la persistenza e l'uso della memoria lungo undici sessioni del runtime applicativo. Riportiamo i risultati di questi due controlli separatamente.

La frase sul controllo aggiuntivo può essere usata solo dopo il suo completamento effettivo. Gli esiti numerici e gli eventuali fallimenti vanno inseriti senza presumere superiorità.

Se si vuole invece sostenere una **superiorità dell'intero sistema** sul paziente a prompt narrativo, il minimo controllo sopra non basta. Serve un confronto aggiornato delle due configurazioni complete sugli stessi cinque profili, ciascuna con le proprie risposte generate e undici sessioni. Un solo percorso end-to-end e un benchmark dei componenti non devono essere combinati in una presunta stima comparativa dell'intera applicazione.

## Raccomandazione operativa

Completare il confronto controllato approvato; aggiungere il percorso end-to-end contenuto descritto sopra se la risposta intende affermare che il runtime modificato ha attraversato davvero undici sessioni. Tenere distinti risultato del componente, esito dell'integrazione e risultati storici del sistema precedente. Nessun test richiede che la baseline fallisca per essere informativo.
