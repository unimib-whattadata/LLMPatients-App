# Memoria strutturata e baseline negli stessi scenari regionali

## Material Passport e domanda sperimentale

Confronto autorizzato su cinque pazienti simulati. Si usano gli stessi 30 archivi integrali del test regionale: cinque profili, fatti all’inizio/al centro/alla fine, lunghezze di circa 64 mila e 1,2 milioni di token. Profilo, istruzioni, sei domande e risposte attese sono identici. Si confrontano **politiche di conservazione e recupero della memoria**.

La baseline mantiene nel prompt tutta la cronologia o la parte rimasta dopo un taglio. Il componente strutturato `EvidenceMemory` ricerca nell’archivio persistente integrale e consegna al modello un massimo di otto evidenze, con budget nativo di 1.800 token stimati per gli elementi selezionati. Il taglio del prompt della baseline non cancella l’archivio strutturato. Non è un confronto a parità di informazioni dopo il taglio, né un test di perdita dei dati prima dell’acquisizione.

È valutato il componente di recupero nativo, con fatti validati e utterance originali, **non l’intero grafo dell’applicazione**. Sommari, riflessioni, cronologia recente, memoria episodica e stato dinamico non sono aggiunti. I dialoghi di riempimento sono indicizzati come testo grezzo; non sono elaborati dal consolidamento dei fatti. La prova non sostituisce il confronto longitudinale sulle undici sessioni.


## Conteggi e valutazione

- **30/30 risposte strutturate complete**, 30 contesti e 120 confronti abbinati con gli esiti già archiviati della baseline.
- Ogni risposta strutturata a 64k è condivisa fra sette condizioni della baseline. Le 120 coppie **non sono 120 generazioni strutturate indipendenti**. Hash distinti dei prompt: 30.
- Unità di caso: cinque profili. Ogni cella completa misura 20 categorie di richiamo positivo (4 × 5) e 45 campi (9 × 5). Una categoria passa solo se tutti i campi e i rapporti sono corretti.
- Nome/età e cognome mai stabilito restano controlli separati. L’astensione su un fatto della storia integrale conta come mancato richiamo, pur potendo essere appropriata rispetto al prompt rimasto.
- Due valutatori automatici in contesti separati, senza metadati di posizione, lunghezza, condizione o evidenze. Disaccordi iniziali: **0 categorie**. Il codice usa un eventuale terzo giudizio soltanto sulle categorie discordanti. Giudizi della baseline riutilizzati senza modifiche.
- L’accordo iniziale è 180/180 categorie e 360/360 campi; nessun adjudicator è stato necessario. Il contenuto delle risposte può suggerire una perdita di contesto: l’efficacia del mascheramento non è stata misurata.
- Modello richiesto ai valutatori: `gpt-6-astra`, effort `xhigh`; identità effettiva non esposta dal runtime. Non sono giudizi clinici umani.


## Risposte strutturate distinte

| Lunghezza integrale | Fatti | Richiamo: categorie | Richiamo: campi | Complessive: categorie | Token nativi medi |
|---|---|---|---|---|---|
| 64.000 | Inizio | 7/20 (35,0%) | 17/45 (37,8%) | 17/30 (56,7%) | 6.065,0 |
| 64.000 | Centro | 6/20 (30,0%) | 15/45 (33,3%) | 16/30 (53,3%) | 6.082,0 |
| 64.000 | Fine | 6/20 (30,0%) | 16/45 (35,6%) | 16/30 (53,3%) | 6.082,0 |
| 1.200.000 | Inizio | 4/20 (20,0%) | 10/45 (22,2%) | 13/30 (43,3%) | 6.072,0 |
| 1.200.000 | Centro | 4/20 (20,0%) | 10/45 (22,2%) | 14/30 (46,7%) | 6.105,0 |
| 1.200.000 | Fine | 4/20 (20,0%) | 10/45 (22,2%) | 14/30 (46,7%) | 6.113,0 |

Totali sulle sole generazioni distinte: 31/120 (25,8%) categorie di richiamo e 78/270 (28,9%) campi di richiamo. Includendo i controlli: 90/180 (50,0%) categorie e 167/360 (46,4%) campi. Questi totali non sono una media ponderata dei 120 esiti baseline e non stimano un unico effetto comparativo.

## Archivio da circa 64 mila token: fatti inizio

| Politica baseline | Baseline: richiamo | Strutturato: richiamo | Differenza (pp) | Campi B / S | Profili S migliori / pari / peggiori |
|---|---|---|---|---|---|
| Nessun taglio | 20/20 (100,0%) | 7/20 (35,0%) | -65,0 | 45/45 / 17/45 | 0 / 0 / 5 |
| Inizio 50% | 0/20 (0,0%) | 7/20 (35,0%) | 35,0 | 0/45 / 17/45 | 5 / 0 / 0 |
| Centro 50% | 20/20 (100,0%) | 7/20 (35,0%) | -65,0 | 45/45 / 17/45 | 0 / 0 / 5 |
| Fine 50% | 20/20 (100,0%) | 7/20 (35,0%) | -65,0 | 45/45 / 17/45 | 0 / 0 / 5 |
| Inizio 75% | 0/20 (0,0%) | 7/20 (35,0%) | 35,0 | 0/45 / 17/45 | 5 / 0 / 0 |
| Centro 75% | 20/20 (100,0%) | 7/20 (35,0%) | -65,0 | 45/45 / 17/45 | 0 / 0 / 5 |
| Fine 75% | 20/20 (100,0%) | 7/20 (35,0%) | -65,0 | 45/45 / 17/45 | 0 / 0 / 5 |

La stessa risposta strutturata di ciascun profilo è riutilizzata nelle sette righe. Le percentuali di taglio riguardano la cronologia; profilo, istruzioni e domanda sono protetti.

## Archivio da circa 64 mila token: fatti centro

| Politica baseline | Baseline: richiamo | Strutturato: richiamo | Differenza (pp) | Campi B / S | Profili S migliori / pari / peggiori |
|---|---|---|---|---|---|
| Nessun taglio | 20/20 (100,0%) | 6/20 (30,0%) | -70,0 | 45/45 / 15/45 | 0 / 0 / 5 |
| Inizio 50% | 10/20 (50,0%) | 6/20 (30,0%) | -20,0 | 35/45 / 15/45 | 0 / 2 / 3 |
| Centro 50% | 0/20 (0,0%) | 6/20 (30,0%) | 30,0 | 0/45 / 15/45 | 4 / 1 / 0 |
| Fine 50% | 5/20 (25,0%) | 6/20 (30,0%) | 5,0 | 15/45 / 15/45 | 2 / 2 / 1 |
| Inizio 75% | 0/20 (0,0%) | 6/20 (30,0%) | 30,0 | 0/45 / 15/45 | 4 / 1 / 0 |
| Centro 75% | 0/20 (0,0%) | 6/20 (30,0%) | 30,0 | 0/45 / 15/45 | 4 / 1 / 0 |
| Fine 75% | 0/20 (0,0%) | 6/20 (30,0%) | 30,0 | 0/45 / 15/45 | 4 / 1 / 0 |

La stessa risposta strutturata di ciascun profilo è riutilizzata nelle sette righe. Le percentuali di taglio riguardano la cronologia; profilo, istruzioni e domanda sono protetti.

## Archivio da circa 64 mila token: fatti fine

| Politica baseline | Baseline: richiamo | Strutturato: richiamo | Differenza (pp) | Campi B / S | Profili S migliori / pari / peggiori |
|---|---|---|---|---|---|
| Nessun taglio | 20/20 (100,0%) | 6/20 (30,0%) | -70,0 | 45/45 / 16/45 | 0 / 0 / 5 |
| Inizio 50% | 20/20 (100,0%) | 6/20 (30,0%) | -70,0 | 45/45 / 16/45 | 0 / 0 / 5 |
| Centro 50% | 20/20 (100,0%) | 6/20 (30,0%) | -70,0 | 45/45 / 16/45 | 0 / 0 / 5 |
| Fine 50% | 0/20 (0,0%) | 6/20 (30,0%) | 30,0 | 0/45 / 16/45 | 4 / 1 / 0 |
| Inizio 75% | 20/20 (100,0%) | 6/20 (30,0%) | -70,0 | 45/45 / 16/45 | 0 / 0 / 5 |
| Centro 75% | 18/20 (90,0%) | 6/20 (30,0%) | -60,0 | 43/45 / 16/45 | 0 / 0 / 5 |
| Fine 75% | 0/20 (0,0%) | 6/20 (30,0%) | 30,0 | 0/45 / 16/45 | 4 / 1 / 0 |

La stessa risposta strutturata di ciascun profilo è riutilizzata nelle sette righe. Le percentuali di taglio riguardano la cronologia; profilo, istruzioni e domanda sono protetti.

## Archivio da circa 1,2 milioni di token: plugin OpenRouter

| Fatti | Baseline: richiamo | Strutturato: richiamo | Differenza (pp) | Campi B / S | Profili S migliori / pari / peggiori |
|---|---|---|---|---|---|
| Inizio | 20/20 (100,0%) | 4/20 (20,0%) | -80,0 | 45/45 / 10/45 | 0 / 0 / 5 |
| Centro | 0/20 (0,0%) | 4/20 (20,0%) | 20,0 | 0/45 / 10/45 | 4 / 1 / 0 |
| Fine | 20/20 (100,0%) | 4/20 (20,0%) | -80,0 | 45/45 / 10/45 | 0 / 0 / 5 |

Il plugin è `context-compression`. Il testo dopo la trasformazione non è restituito dall’API: non sono direttamente osservabili le fonti rimaste. I tagli locali a 64k e il plugin a 1,2M sono condizioni distinte e non isolano da soli un effetto della lunghezza.

## Dimensione effettiva degli input

| Archivio e politica baseline | Fatti | Token B medi | Token S medi | Riduzione S vs B (%) | Coppie complete |
|---|---|---|---|---|---|
| 64k / Nessun taglio | Inizio | 64.081,4 | 6.065,0 | 90,54 | 5/5 |
| 64k / Nessun taglio | Centro | 64.081,4 | 6.082,0 | 90,51 | 5/5 |
| 64k / Nessun taglio | Fine | 64.081,4 | 6.082,0 | 90,51 | 5/5 |
| 64k / Inizio 50% | Inizio | 34.409,2 | 6.065,0 | 82,39 | 5/5 |
| 64k / Inizio 50% | Centro | 34.398,0 | 6.082,0 | 82,33 | 5/5 |
| 64k / Inizio 50% | Fine | 34.434,4 | 6.082,0 | 82,35 | 5/5 |
| 64k / Centro 50% | Inizio | 34.410,0 | 6.065,0 | 82,39 | 5/5 |
| 64k / Centro 50% | Centro | 34.388,6 | 6.082,0 | 82,33 | 5/5 |
| 64k / Centro 50% | Fine | 34.443,8 | 6.082,0 | 82,36 | 5/5 |
| 64k / Fine 50% | Inizio | 34.386,6 | 6.065,0 | 82,38 | 5/5 |
| 64k / Fine 50% | Centro | 34.397,8 | 6.082,0 | 82,33 | 5/5 |
| 64k / Fine 50% | Fine | 34.361,4 | 6.082,0 | 82,31 | 5/5 |
| 64k / Inizio 75% | Inizio | 19.533,2 | 6.065,0 | 69,00 | 5/5 |
| 64k / Inizio 75% | Centro | 19.533,2 | 6.082,0 | 68,91 | 5/5 |
| 64k / Inizio 75% | Fine | 19.588,4 | 6.082,0 | 69,00 | 5/5 |
| 64k / Centro 75% | Inizio | 19.596,8 | 6.065,0 | 69,11 | 5/5 |
| 64k / Centro 75% | Centro | 19.578,6 | 6.082,0 | 68,99 | 5/5 |
| 64k / Centro 75% | Fine | 19.565,0 | 6.082,0 | 68,96 | 5/5 |
| 64k / Fine 75% | Inizio | 19.591,2 | 6.065,0 | 69,09 | 5/5 |
| 64k / Fine 75% | Centro | 19.569,8 | 6.082,0 | 68,98 | 5/5 |
| 64k / Fine 75% | Fine | 19.569,8 | 6.082,0 | 68,98 | 5/5 |
| 1,2M / Plugin automatico | Inizio | 258.485,4 | 6.072,0 | 97,65 | 5/5 |
| 1,2M / Plugin automatico | Centro | 257.362,4 | 6.105,0 | 97,63 | 5/5 |
| 1,2M / Plugin automatico | Fine | 258.477,8 | 6.113,0 | 97,64 | 5/5 |

Gli input strutturati completi variano fra **5.102 e 6.982 token nativi**, inclusi profilo e domande. Differenze dal conteggio locale meno un token: 0. La corrispondenza dei conteggi non rileva riduzioni ulteriori dei piccoli prompt; il testo trasformato non è esposto.

## Esecuzione e riproducibilità

Modello attestato: `google/gemini-2.5-pro`; provider: Google. Temperatura 0,7; top-p 0,95; massimo output 4.096 token; ragionamento richiesto 1.024; stop `\nTherapist:` e `Therapist:`. Nessun seed API, top-k non inoltrato, nessun fallback. Un solo messaggio utente, plugin di compressione attivo anche sui piccoli input strutturati. Ordine randomizzato con seed locale 2026100101, esportazione cieca con 2026100102.

Retrieval nativo invariato: `EvidenceMemory`, otto elementi, budget 1.800 token stimati, `all-MiniLM-L6-v2` revisione `1110a243fdf4706b3f48f1d95db1a4f5529b4d41`. La domanda accorpa sei quesiti: 272 token dell’encoder contro un massimo di 256, con troncamento dell’embedding come nella prova di lunghezza. La ricerca lessicale usa il testo integrale della domanda. Cronologia dei record e dei fatti reindicizzata sulle posizioni effettive; testo, valori, chiavi, stati, citazioni e identificatori sono preservati. Vedere `preparation.json`, `archive-view.json` e audit di preparazione.

Raccolta UTC: 2026-09-30T23:27:34.161039+00:00 → 2026-09-30T23:32:23.948931+00:00. **30 richieste HTTP**, 30 risposte native e 0 errori API. Ritentativi tecnici: 0 job; recuperi per limite di output: 0. Nessuna rigenerazione basata sull’accuratezza.

**Costo delle sole chiamate strutturate: 0,513440 USD**; costo storico delle 120 condizioni baseline: 13,749866 USD, senza nuove chiamate baseline. Costi di embedding locale e valutazione automatizzata non inclusi. Le risposte condivise sono contate una sola volta nei costi e nei token totali. Verificati 122 file congelati, 74 sorgenti e tutti gli archivi nativi.


## Interpretazione dei risultati

Il componente conserva un vantaggio di richiamo quando la baseline perde i fatti dal proprio input, ma il recupero rimane incompleto. Con plugin e fatti al centro dell’archivio da 1,2M, baseline **0/20** categorie e componente **4/20** (20%): quattro profili migliorano e uno è pari. Con i fatti all’inizio o alla fine, baseline **20/20** e componente **4/20**: tutti e cinque i profili peggiorano. Non è dimostrata una superiorità generale.

A 64k senza tagli la baseline ottiene **20/20** in tutte le posizioni; il componente **7/20** all’inizio e **6/20** al centro/alla fine. Quando i tagli annullano il richiamo della baseline, il componente conserva quel 30–35%. Con fatti centrali e taglio finale del 50%, la differenza di categorie è +5 punti (6/20 contro 5/20), mentre i campi sono pari a 15/45: i due indicatori non vanno confusi.

L’ispezione delle evidenze effettivamente consegnate rileva valori o rapporti richiesti non selezionati e conserva separatamente citazioni del terapeuta, ricordi/proposte del paziente, valori obsoleti e informazioni parziali (`analysis/delivered-support-audit.json`). È un’analisi descrittiva successiva alla preparazione, svolta senza leggere le risposte, con criteri propri; non sostituisce i giudizi ciechi e non dimostra da sola il meccanismo causale di ciascun errore. L’archivio integro non garantisce che le otto evidenze coprano tutti i quesiti.

A parità di profilo e lunghezza, le tre posizioni consegnano gli stessi contenuti semantici selezionati, con metadati cronologici reindicizzati e prompt testualmente diversi. Le piccole differenze fra risposte strutturate non vanno interpretate come un effetto isolato della posizione; i metadati variano e la generazione è stocastica.


## Esempio abbinato: Daniel, fatti centrali a 1,2M

La baseline (job `108`) dice che i nomi delle sedi corrente e precedente non sono stati stabiliti. Lo strutturato (job `015`) indica invece correttamente “Plover Annex” come sede corrente e “Larch Reading Room” come precedente. Questa categoria passa con lo strutturato e fallisce con la baseline.

La stessa risposta strutturata però non recupera il titolo del quaderno e fornisce valori errati per appuntamenti e attività: il suo richiamo è 1/4 categorie, non 4/4. L’esempio mostra insieme il recupero utile e il limite residuo. Risposte integrali, gold e identificativi nativi sono in `analysis/illustrative-paired-example.json`; nessun caso è selezionato o escluso dal calcolo delle tabelle.


## Calcoli e limiti

- Accuratezza = risposte interamente corrette / risposte valutabili per l’indicatore × 100. Campo e categoria hanno denominatori distinti.
- Differenza abbinata per cella = media sui cinque profili di `(categorie S − categorie B) / 4 × 100`. Per i campi il divisore è nove. Vittoria/parità/sconfitta confrontano le categorie del singolo profilo, non test statistici.
- Riduzione dei token = media per profilo di `1 − token nativi S / token nativi B`; non è necessariamente uguale al rapporto delle medie.
- Le risposte mancanti restano esiti di disponibilità. Le differenze usano solo coppie complete, con denominatori dichiarati. Non si convertono errori di servizio in errori semantici.
- La prova è esplorativa e motivata dai risultati regionali già noti; i prompt, il protocollo e la rubrica sono congelati prima delle chiamate strutturate. Le due politiche sono raccolte separatamente nel tempo, senza randomizzazione simultanea fra bracci.
- Cinque profili, una risposta per contesto, un blocco di 45 scambi originali e riempimento sintetico non stimano una prestazione clinica di popolazione. Posizioni, campi e confronti condivisi sono dipendenti. Non sono calcolati intervalli binomiali indipendenti o p-value.
- Il recupero usa sia fatti validati sia utterance: non si attribuisce l’effetto alla sola rappresentazione in fatti. Un archivio integro rende possibile il recupero, ma non garantisce che otto evidenze includano ogni dettaglio richiesto.
- Un eventuale vantaggio dopo la perdita di testo nel prompt dimostra utilità della persistenza e selezione nei casi osservati. Non dimostra superiorità generale del sistema completo, né modifica i risultati del confronto sulle undici sessioni.

## Controllo dell’interpretazione statistica: 11/11

| Rischio | Controllo e limite |
|---|---|
| Simpson | Tutte le 24 celle e le coppie individuali sono conservate; non si confondono posizioni e politiche con una sola media. |
| Fallacia ecologica | Risultati limitati ai cinque profili simulati; nessuna inferenza su pazienti reali. |
| Berkson | Profili e scenari intenzionali già disponibili; nessuna esclusione per esito, ma selezione che limita la generalizzazione. |
| Collider | Nessun aggiustamento per variabili prodotte dalle risposte; disponibilità e confronto sulle coppie complete sono espliciti. |
| Tasso di base | Le proporzioni artificiali di tagli e posizioni non stimano la frequenza dei guasti nell’uso reale. |
| Regressione verso la media | Sono inclusi anche tutti i controlli baseline riusciti; una generazione non stima la variabilità delle repliche. |
| Sopravvivenza | Tutti i 30 contesti e i 120 collegamenti sono riportati; errori tecnici e mancanze restano visibili. |
| Confronti multipli | Nessuna selezione delle sole celle favorevoli, nessun p-value; 120 coppie non diventano 120 risposte strutturate indipendenti. |
| Percorsi analitici | Disegno e input congelati prima delle risposte; eventuali correzioni del codice di analisi sono separate e tracciate. |
| Correlazione e causalità | Confronto di politiche con informazioni diverse dopo il taglio; componente, archivio e tempi di raccolta impediscono una conclusione causale sul sistema completo. |
| Causalità inversa | I punteggi non determinano prompt, posizione, budget o ripetizioni. |

## Materiali nella copia di lavoro

`outputs/structured-regional-comparison-2026-10-01/`: `PROTOCOL.md`, `preparation.json`, `manifest.json`, `contexts.json`, `schedule.json`, `inputs/`, `runtime/`, `review/ratings/`, `analysis/results.json`, `analysis/runtime-verification.json` e `final-manifest.json`. I file `selected-evidence.json`, `structured_evidence.txt` e `archive-view.json` documentano ciò che entra nel prompt e la provenienza. I corpora integrali sono referenziati all’archivio regionale sigillato, senza duplicarli.

`figures/paired-regional-recall.png` e `.svg` visualizzano tutte le 24 celle. `previous-review-response/` conserva l’esportazione TeX/PDF precedente con hash. I percorsi locali non implicano pubblicazione remota.

