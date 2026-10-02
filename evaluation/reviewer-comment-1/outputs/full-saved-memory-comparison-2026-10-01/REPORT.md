# Tutta la memoria salvata: confronto senza selezione o tagli

## Risultato essenziale

Nei 15 scenari derivati dalle cronologie baseline da 64 k, la memoria completa ottiene **60/60 (100,0%) categorie di richiamo** e **135/135 (100,0%) campi**. Anche la baseline integra ottiene 100% in tutte e tre le posizioni. Con i tagli baseline, il richiamo varia da 0% a 100% fra le celle; lo strutturato conserva tutta la memoria e resta al 100% nei casi valutati.

Questo recupero completo richiede **212.789–226.527 token nativi** per richiesta. Nei 15 scenari derivati da 1,2 milioni di token, il deposito completo supera il limite API di 8 MB e tutte le richieste vengono rifiutate. Per questi scenari non esiste un punteggio di accuratezza strutturata; la baseline con plugin resta valutabile e conserva i risultati riportati sotto.


## Material Passport e richiesta

Esperimento autorizzato su cinque pazienti simulati. L’utente ha richiesto esplicitamente **tutta la memoria salvata, senza selezione né tagli**. Questa prova invia l’intero deposito persistente; il test precedente limitato a otto evidenze rimane distinto e immutato.

Si usano gli stessi 30 archivi regionali, gli stessi profili, istruzioni, domande e valori attesi, con Gemini 2.5 Pro. Le 120 risposte baseline già archiviate vengono riutilizzate; non sono ripetute chiamate baseline. Gli esiti baseline e strutturati sono raccolti in momenti differenti.

Verification Status: **ANALYZED** per l'interpretazione descrittiva. La verifica meccanica di input, archivi nativi, conteggi e hash è completata; non si dichiara una replica indipendente dei risultati stocastici.


## Che cosa viene inviato

Per ogni profilo, il prefisso verificato al termine della sessione 9 contiene **81 record**: 45 scambi originali, 9 blocchi di fatti, 9 riepiloghi episodici, 9 riflessioni e 9 versioni del riepilogo a lungo termine. La SHA256 degli 81 record coincide esattamente con quella registrata alla chiusura della sessione 9. Nessuna risposta delle successive sessioni 10/11 entra nel prompt.

Sono conservati **tutti i campi di tutti i record**, le versioni precedenti dei riepiloghi e i log di estrazione, comprese le proposte rifiutate. Queste ultime mantengono le chiavi di quarantena e non sono presentate come fatti validati. Tutti gli scambi aggiunti nei 30 scenari vengono inclusi. Non si eseguono retrieval, selezione delle otto evidenze, filtri di recenza o troncamenti dei riepiloghi.

Gli 81 record originali mantengono ogni valore e la loro sequenza relativa. Ogni record non conversazionale rimane dopo lo scambio che lo precedeva nel deposito; metadati esterni descrivono la posizione sperimentale del blocco nella cronologia. I campi originali conservano la provenienza nativa. Ogni scambio originale e aggiunto compare una volta come record conversazionale.

Il riempimento era stato salvato soltanto come testo grezzo. Non viene attribuito ai riepiloghi un’elaborazione di quel riempimento che non è avvenuta. **Questa è una prova di invio integrale della memoria durevole, non una riesecuzione dell’intero grafo sui dialoghi aggiunti.** Cache di stato, log API e duplicazioni del profilo esterne al deposito non sono record aggiuntivi della memoria; il CASE comune rimane identico.

La compressione del prompt è esplicitamente disattivata con `plugins:[{"id":"context-compression","enabled":false}]`, secondo la [documentazione OpenRouter](https://openrouter.ai/docs/guides/features/message-transforms). I file su disco usano gzip senza perdita; prima della richiesta viene ripristinato il testo completo. Questa codifica dei file non riduce il contenuto ricevuto dall’API.


### Inventario della memoria originaria

| Profilo | Scambi | Blocchi fatti | Fatti validati | Proposte rifiutate archiviate | Riepiloghi / riflessioni / versioni a lungo termine |
|---|---|---|---|---|---|
| alex_carter_001 | 45 | 9 | 213 | 11 | 9 / 9 / 9 |
| crystal_smith_001 | 45 | 9 | 202 | 17 | 9 / 9 / 9 |
| daniel_isherwood_001 | 45 | 9 | 208 | 22 | 9 / 9 / 9 |
| jason_smith_001 | 45 | 9 | 232 | 6 | 9 / 9 / 9 |
| juanita_delgado_001 | 45 | 9 | 237 | 9 | 9 / 9 / 9 |

## Disponibilità e dimensioni

**15/30 risposte strutturate complete**; 15 input rifiutati per capacità. I rifiuti non diventano risposte semanticamente errate. Ogni risposta strutturata a 64 k è condivisa tra sette condizioni baseline: 30 contesti e 120 confronti mappati non equivalgono a 120 generazioni indipendenti. Sono valutabili 105 coppie.

| Cronologia baseline integrale | Posizione fatti | Token locali: memoria completa (min–max) | Token nativi medi S | Risposte S | Baseline: richiamo | Strutturato: richiamo |
|---|---|---|---|---|---|---|
| 64.000 | Inizio | 212.858–226.528 | 218.758,2 | 5/5 | 20/20 (100,0%) | 20/20 (100,0%) |
| 64.000 | Centro | 212.790–226.460 | 218.690,2 | 5/5 | 20/20 (100,0%) | 20/20 (100,0%) |
| 64.000 | Fine | 212.790–226.460 | 218.690,2 | 5/5 | 20/20 (100,0%) | 20/20 (100,0%) |
| 1.200.000 | Inizio | 2.308.877–2.348.459 | N/V | 0/5 | 20/20 (100,0%) | N/V |
| 1.200.000 | Centro | 2.308.746–2.348.328 | N/V | 0/5 | 0/20 (0,0%) | N/V |
| 1.200.000 | Fine | 2.308.692–2.348.274 | N/V | 0/5 | 20/20 (100,0%) | N/V |

Differenze fra token nativi osservati e conteggio locale calibrato (locale meno uno): **0**. Nessun conteggio nativo viene inventato per le richieste rifiutate. Le dimensioni 64 k/1,2M descrivono la cronologia baseline originale: il deposito completo è più grande perché contiene anche tutte le rappresentazioni derivate, i metadati e i log.

## Tutte le condizioni a 64 k: fatti inizio

| Politica baseline | B: categorie memoria | S: categorie memoria | Differenza(pp) | B: campi memoria | S: campi memoria | Profili S migliori / pari / peggiori |
|---|---|---|---|---|---|---|
| Nessun taglio | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Inizio 50% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Centro 50% | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Fine 50% | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Inizio 75% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Centro 75% | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Fine 75% | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |

Le sette righe condividono le medesime risposte strutturate dei cinque profili. Lo strutturato conserva e invia l’archivio intero; i tagli riguardano il prompt della baseline.

## Tutte le condizioni a 64 k: fatti centro

| Politica baseline | B: categorie memoria | S: categorie memoria | Differenza(pp) | B: campi memoria | S: campi memoria | Profili S migliori / pari / peggiori |
|---|---|---|---|---|---|---|
| Nessun taglio | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Inizio 50% | 10/20 (50,0%) | 20/20 (100,0%) | 50,0 | 35/45 (77,8%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Centro 50% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Fine 50% | 5/20 (25,0%) | 20/20 (100,0%) | 75,0 | 15/45 (33,3%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Inizio 75% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Centro 75% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Fine 75% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |

Le sette righe condividono le medesime risposte strutturate dei cinque profili. Lo strutturato conserva e invia l’archivio intero; i tagli riguardano il prompt della baseline.

## Tutte le condizioni a 64 k: fatti fine

| Politica baseline | B: categorie memoria | S: categorie memoria | Differenza(pp) | B: campi memoria | S: campi memoria | Profili S migliori / pari / peggiori |
|---|---|---|---|---|---|---|
| Nessun taglio | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Inizio 50% | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Centro 50% | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Fine 50% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |
| Inizio 75% | 20/20 (100,0%) | 20/20 (100,0%) | 0,0 | 45/45 (100,0%) | 45/45 (100,0%) | 0 / 5 / 0 |
| Centro 75% | 18/20 (90,0%) | 20/20 (100,0%) | 10,0 | 43/45 (95,6%) | 45/45 (100,0%) | 2 / 3 / 0 |
| Fine 75% | 0/20 (0,0%) | 20/20 (100,0%) | 100,0 | 0/45 (0,0%) | 45/45 (100,0%) | 5 / 0 / 0 |

Le sette righe condividono le medesime risposte strutturate dei cinque profili. Lo strutturato conserva e invia l’archivio intero; i tagli riguardano il prompt della baseline.

## Confronto con il plugin baseline a 1,2M

| Fatti | Risposte B / S | B: categorie memoria | S: categorie memoria | Differenza(pp) | B: campi memoria | S: campi memoria |
|---|---|---|---|---|---|---|
| Inizio | 5/5 / 0/5 | 20/20 (100,0%) | N/V | N/V | 45/45 (100,0%) | N/V |
| Centro | 5/5 / 0/5 | 0/20 (0,0%) | N/V | N/V | 0/45 (0,0%) | N/V |
| Fine | 5/5 / 0/5 | 20/20 (100,0%) | N/V | N/V | 45/45 (100,0%) | N/V |

N/V significa assenza di una risposta valutabile. Non è 0% di accuratezza. La baseline attiva il plugin; lo strutturato lo disattiva per rispettare la richiesta di invio senza tagli. Questi esiti non isolano un effetto della sola architettura.

## Token per tutte le 24 celle

| Scenario baseline | Fatti | Token B medi | Token S medi | Variazione S rispetto a B(%) | Coppie valutabili |
|---|---|---|---|---|---|
| 64 k / Nessun taglio | Inizio | 64.081,4 | 218.758,2 | 241,38 | 5/5 |
| 64 k / Nessun taglio | Centro | 64.081,4 | 218.690,2 | 241,27 | 5/5 |
| 64 k / Nessun taglio | Fine | 64.081,4 | 218.690,2 | 241,27 | 5/5 |
| 64 k / Inizio 50% | Inizio | 34.409,2 | 218.758,2 | 535,84 | 5/5 |
| 64 k / Inizio 50% | Centro | 34.398,0 | 218.690,2 | 535,86 | 5/5 |
| 64 k / Inizio 50% | Fine | 34.434,4 | 218.690,2 | 535,18 | 5/5 |
| 64 k / Centro 50% | Inizio | 34.410,0 | 218.758,2 | 535,80 | 5/5 |
| 64 k / Centro 50% | Centro | 34.388,6 | 218.690,2 | 536,03 | 5/5 |
| 64 k / Centro 50% | Fine | 34.443,8 | 218.690,2 | 535,02 | 5/5 |
| 64 k / Fine 50% | Inizio | 34.386,6 | 218.758,2 | 536,26 | 5/5 |
| 64 k / Fine 50% | Centro | 34.397,8 | 218.690,2 | 535,85 | 5/5 |
| 64 k / Fine 50% | Fine | 34.361,4 | 218.690,2 | 536,53 | 5/5 |
| 64 k / Inizio 75% | Inizio | 19.533,2 | 218.758,2 | 1.020,60 | 5/5 |
| 64 k / Inizio 75% | Centro | 19.533,2 | 218.690,2 | 1.020,25 | 5/5 |
| 64 k / Inizio 75% | Fine | 19.588,4 | 218.690,2 | 1.017,12 | 5/5 |
| 64 k / Centro 75% | Inizio | 19.596,8 | 218.758,2 | 1.017,24 | 5/5 |
| 64 k / Centro 75% | Centro | 19.578,6 | 218.690,2 | 1.017,76 | 5/5 |
| 64 k / Centro 75% | Fine | 19.565,0 | 218.690,2 | 1.018,40 | 5/5 |
| 64 k / Fine 75% | Inizio | 19.591,2 | 218.758,2 | 1.017,30 | 5/5 |
| 64 k / Fine 75% | Centro | 19.569,8 | 218.690,2 | 1.018,38 | 5/5 |
| 64 k / Fine 75% | Fine | 19.569,8 | 218.690,2 | 1.018,38 | 5/5 |
| 1,2M / Plugin automatico | Inizio | 258.485,4 | N/V | N/V | 0/5 |
| 1,2M / Plugin automatico | Centro | 257.362,4 | N/V | N/V | 0/5 |
| 1,2M / Plugin automatico | Fine | 258.477,8 | N/V | N/V | 0/5 |

Variazione positiva indica più token nello strutturato. È la media dei rapporti entro profilo, non il rapporto delle medie.

## Valutazione e calcoli

Richiamo positivo: quattro categorie e nove campi per risposta. Identità e cognome mai comunicato sono controlli separati. Una categoria è corretta soltanto quando tutti i valori e le relazioni richieste sono corretti. L’astensione su un fatto della storia integrale è mancato richiamo, anche quando appropriata rispetto al contesto rimasto.

Sulle sole 15 risposte distinte valutabili: **60/60 (100,0%) categorie di memoria**, **135/135 (100,0%) campi di memoria**; includendo i controlli, 90/90 (100,0%) categorie e 180/180 (100,0%) campi. Questi totali non duplicano i controlli condivisi e non vanno confrontati direttamente con una media dei 120 esiti baseline.

Due valutatori automatici in contesti nuovi ricevono soltanto schede randomizzate, domande, gold e risposte. Modello richiesto `gpt-6-astra`, effort `xhigh`, identità effettiva non esposta. Disaccordi iniziali: 0 categorie. La terza valutazione, se necessaria, viene usata soltanto sulle categorie discordanti. Sono valutazioni automatiche, non giudizi clinici umani; l’efficacia del mascheramento non è misurata. Nessuna rigenerazione per accuratezza.

Differenza abbinata in punti percentuali = media entro profilo di `(categorie corrette S − B)/4 ×100`; per i campi il divisore è 9. Solo coppie complete, con denominatori dichiarati. Vittorie/parità/sconfitte usano le quattro categorie. Risposte mancanti e rifiuti sono esiti di disponibilità, non zeri semantici.


## Esecuzione, errore iniziale e correzione

Modello attestato nelle risposte: `google/gemini-2.5-pro`; provider: Google. Temperatura 0,7, top-p 0,95, output massimo 4096, ragionamento 1024, stop `\nTherapist:` e `Therapist:`, nessun seed API, top-k omesso e nessun fallback. Plugin esplicitamente disattivato. Ordine seed 2026100103, esportazione seed 2026100104.

Prima richiesta: HTTP 400, messaggio nativo “The total text input size exceeds 8 MB”. Il controllo iniziale riconosceva limiti di token ma non di byte, quindi si è fermato. La copia corretta registra questo come rifiuto di capacità e conserva quel primo esito **senza ripetere la richiesta**. Prosegue soltanto sui 29 job non ancora tentati. Tutti gli input e parametri restano identici. Codice iniziale, log e STOP restano inalterati; vedere `AMENDMENT-01.md` e `manifest-amendment-01.json`.

Stato finale: completed. **31 richieste HTTP**, 15 risposte native riuscite, 16 errori API archiviati. Job con ritentativi: 1; recuperi per limite di output: 0. Il job 004 ha restituito un errore upstream 429 dentro una risposta HTTP 200: il controllo ha atteso 60 secondi e il secondo tentativo è riuscito con lo stesso payload. I 15 rifiuti per 8 MB non sono stati ripetuti. Costo nativo osservato delle chiamate strutturate: **8,448092 USD**. Errori con costo esposto: 1; senza costo esposto: 15. Un costo assente non è una dichiarazione del provider di costo zero. Costo della valutazione non incluso. Baseline storica: 13,749866 USD, senza nuove chiamate.

Ultimo segmento di raccolta UTC: 2026-10-01T08:49:37.358534+00:00 → 2026-10-01T09:00:29.627210+00:00. La prima richiesta e il fermo sono documentati nel runtime iniziale. Verificati 94 file congelati, 85 sorgenti, i payload nativi completi e l’archivio della correzione. Nessun limite di dimensione è aggirato e nessun contenuto è eliminato per ottenere una risposta.


## Interpretazione e limiti

Questo test risponde alla richiesta di inviare tutto ciò che è salvato: la misura comprende anche dati grezzi, metadati, log e versioni storiche. Non è il normale prompt compatto dell’applicazione. Il richiamo completo nei 15 casi valutabili mostra che l'informazione è recuperabile quando tutto il deposito è disponibile. Il confronto con il recupero limitato a otto evidenze modifica sia la quantità sia la rappresentazione del contenuto e non isola quale componente produca la differenza. Le condizioni baseline integre e quelle favorevoli alla compressione sono tutte mantenute.

Un rifiuto per 8 MB è un limite dell’API sul testo, non una misura diretta della capacità contestuale o del ragionamento del modello. La disponibilità della baseline compressa non implica che conservi tutti i fatti: i suoi punteggi restano distinti per posizione. Il confronto non stabilisce superiorità generale dell’architettura strutturata o di quella narrativa.

Cinque profili, un campione per contesto, riempimento sintetico e raccolte separate consentono descrizioni di questi casi. Le posizioni, le domande e i 120 collegamenti condivisi sono dipendenti. Nessun intervallo binomiale indipendente o p-value. Le informazioni dopo i tagli differiscono tra le politiche; la perdita prima dell’acquisizione nel deposito non è testata. Le prime 9 sessioni e i loro ricordi sono reali esiti simulati archiviati; l’aggiunta regionale non equivale a nuove sessioni eseguite dall’applicazione.

## Controllo statistico: 11/11

| Rischio | Verifica e limite |
|---|---|
| Simpson | Tutte le 24 celle restano separate per posizione e politica, con gli stessi profili; nessuna sola media comparativa aggregata. |
| Fallacia ecologica | Nessuna generalizzazione dai profili simulati a pazienti reali. |
| Berkson | Casi e perturbazioni intenzionali; nessuna esclusione secondo l’esito. |
| Collider | Nessun aggiustamento per variabili prodotte dalle risposte; le coppie complete sono esplicite. |
| Tasso di base | Le proporzioni artificiali dei tagli non stimano la frequenza degli errori nell’uso reale. |
| Regressione verso la media | Si mantengono controlli baseline riusciti e tutte le posizioni; una generazione non misura la varianza delle repliche. |
| Sopravvivenza | Si riportano tutti i 30 esiti, inclusi input rifiutati; accuratezza condizionata alla disponibilità dichiarata. |
| Confronti multipli | Tutte le 24 celle visibili, nessun p-value o selezione delle sole differenze favorevoli. |
| Percorsi analitici | Input e rubrica congelati prima delle chiamate; correzione del classificatore di capacità separata e senza ripetere il primo esito. |
| Causalità | Politiche, volume, rappresentazione e plugin differiscono; non si isola l’architettura né si stima un effetto clinico. |
| Causalità inversa | Risposte e punteggi non cambiano input o numero di tentativi. |

## Materiali

`outputs/full-saved-memory-comparison-2026-10-01/`: `PROTOCOL.md`, `preparation.json`, `contexts.json`, `schedule.json`, `manifest.json`, `manifest-amendment-01.json`, `inputs/`, `runtime/`, `runtime-02/`, `review/ratings/`, `analysis/results.json`, `analysis/runtime-verification.json` e `final-manifest.json`.

`inputs/<profilo>/length_<n>/<posizione>/full_saved_memory.txt.gz` conserva il prompt integrale; `completeness.json` contiene conteggi e hash del testo decompresso. I log nativi sono `runtime/001/openrouter-api-records.jsonl.gz` e `runtime-02/<id>/openrouter-api-records.jsonl.gz`. `runtime-02/answers.jsonl` raccoglie tutti gli esiti, incluso il primo rifiuto ereditato. Gzip è solo una codifica senza perdita dell’archivio su disco.

`audit/saved-memory-inventory.json` documenta il prefisso prima dei test; `audit/full-payload-completeness-review.json` verifica tutti i 30 payload. `figures/full-saved-memory-recall.png` e `.svg` mostrano le 24 celle. I percorsi sono nella copia locale, senza pubblicazione remota. L’esportazione TeX/PDF precedente è conservata con hash in `previous-review-response/`.

