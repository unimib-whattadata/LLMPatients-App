# Posizione dei fatti e riduzione del contesto

## Risultati principali

- **120/120 risposte complete**, con tutte le condizioni pianificate riportate.
- Nei controlli integrali da circa 64k token: **60/60 categorie di richiamo corrette** nelle tre posizioni complessivamente.
- Con compressione automatica di circa 1,2M token, il richiamo per posizione è inizio: **20/20 (100,0%)**; centro: **0/20 (0,0%)**; fine: **20/20 (100,0%)**.
- Nei tagli locali, aggregando anche i controlli: **542/542 (100,0%)** campi corretti quando resta una fonte canonica sufficiente; **1/403 (0,2%)** quando tutte le fonti canoniche sufficienti sono rimosse. Sono misure descrittive di campi ripetuti, non osservazioni indipendenti.
- Le matrici sotto mostrano anche i tagli che conservano i fatti. La conclusione riguarda la conservazione delle informazioni nelle condizioni testate; il sistema strutturato non viene rivalutato.

## Material Passport

Esperimento autorizzato su cinque pazienti simulati; valutazione descrittiva di richiamo, senza partecipanti umani. 105 condizioni con tagli locali e 15 con compressione automatica OpenRouter. Il disegno è esplorativo e gli input sono fissati prima delle chiamate.

## Misure

**Richiamo positivo:** quattro categorie che interrogano nove campi introdotti nella conversazione (taccuino, appuntamenti e proposta, sedi, attività completata/pianificata). Ogni cella ha cinque profili, quindi 20 categorie e 45 campi quando tutte le risposte sono disponibili. Una categoria è corretta solo se tutti i suoi campi e rapporti sono corretti.

L’accuratezza complessiva comprende anche nome/età e astensione sul cognome mai stabilito: sei categorie e dodici campi per risposta. Se tutti i fatti della conversazione sono persi, il punteggio complessivo può ancora essere 2/6 categorie grazie a questi controlli. Non chiamiamo quel 33,3% ricordo della conversazione.

L’astensione su un fatto presente nella storia integrale conta come insuccesso di richiamo, anche quando è appropriata rispetto al contesto rimasto dopo il taglio. Questo punteggio non coincide quindi con il tasso di affermazioni false o inventate.

## Controlli senza taglio locale: circa 64 mila token

| Posizione dei fatti | Richiamo: categorie | Richiamo: campi | Accuratezza complessiva | Token nativi medi |
|---|---:|---:|---:|---:|
| Inizio | 20/20 (100,0%) | 45/45 (100,0%) | 30/30 (100,0%) | 64.081,4 |
| Centro | 20/20 (100,0%) | 45/45 (100,0%) | 30/30 (100,0%) | 64.081,4 |
| Fine | 20/20 (100,0%) | 45/45 (100,0%) | 30/30 (100,0%) | 64.081,4 |

## Taglio locale del 50% della cronologia

Righe: posizione iniziale del blocco di fatti. Colonne: regione eliminata. Valori: categorie di richiamo positivo interamente corrette.

| Posizione dei fatti | Taglio iniziale | Taglio centrale | Taglio finale |
|---|---:|---:|---:|
| Inizio | 0/20 (0,0%) | 20/20 (100,0%) | 20/20 (100,0%) |
| Centro | 10/20 (50,0%) | 0/20 (0,0%) | 5/20 (25,0%) |
| Fine | 20/20 (100,0%) | 20/20 (100,0%) | 0/20 (0,0%) |

### Campi, fonti e differenza dal controllo integrale

| Fatti | Taglio | Campi di richiamo corretti | Fonti canoniche rimaste | Corretti con fonte rimasta | Corretti con fonte rimossa | Variazione categorie dal controllo | Categorie complessive |
|---|---|---:|---:|---:|---:|---:|---:|
| Inizio | Inizio | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 10/30 (33,3%) |
| Inizio | Centro | 45/45 (100,0%) | 45/45 | 45/45 (100,0%) | N/V | 0,0 pp | 30/30 (100,0%) |
| Inizio | Fine | 45/45 (100,0%) | 45/45 | 45/45 (100,0%) | N/V | 0,0 pp | 30/30 (100,0%) |
| Centro | Inizio | 35/45 (77,8%) | 35/45 | 35/35 (100,0%) | 0/10 (0,0%) | -50,0 pp | 20/30 (66,7%) |
| Centro | Centro | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 10/30 (33,3%) |
| Centro | Fine | 15/45 (33,3%) | 15/45 | 15/15 (100,0%) | 0/30 (0,0%) | -75,0 pp | 15/30 (50,0%) |
| Fine | Inizio | 45/45 (100,0%) | 45/45 | 45/45 (100,0%) | N/V | 0,0 pp | 30/30 (100,0%) |
| Fine | Centro | 45/45 (100,0%) | 45/45 | 45/45 (100,0%) | N/V | 0,0 pp | 30/30 (100,0%) |
| Fine | Fine | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 9/30 (30,0%) |

### Token e intensità effettiva

| Fatti | Taglio | Riduzione dei token della cronologia | Riduzione dell’intero input | Token nativi medi | Risposte complete |
|---|---|---:|---:|---:|---:|
| Inizio | Inizio | 49,97% | 46,30% | 34.409,2 | 5/5 |
| Inizio | Centro | 49,97% | 46,30% | 34.410,0 | 5/5 |
| Inizio | Fine | 50,01% | 46,34% | 34.386,6 | 5/5 |
| Centro | Inizio | 49,99% | 46,32% | 34.398,0 | 5/5 |
| Centro | Centro | 50,01% | 46,34% | 34.388,6 | 5/5 |
| Centro | Fine | 49,99% | 46,32% | 34.397,8 | 5/5 |
| Fine | Inizio | 49,93% | 46,26% | 34.434,4 | 5/5 |
| Fine | Centro | 49,92% | 46,25% | 34.443,8 | 5/5 |
| Fine | Fine | 50,05% | 46,38% | 34.361,4 | 5/5 |

## Taglio locale del 75% della cronologia

Righe: posizione iniziale del blocco di fatti. Colonne: regione eliminata. Valori: categorie di richiamo positivo interamente corrette.

| Posizione dei fatti | Taglio iniziale | Taglio centrale | Taglio finale |
|---|---:|---:|---:|
| Inizio | 0/20 (0,0%) | 20/20 (100,0%) | 20/20 (100,0%) |
| Centro | 0/20 (0,0%) | 0/20 (0,0%) | 0/20 (0,0%) |
| Fine | 20/20 (100,0%) | 18/20 (90,0%) | 0/20 (0,0%) |

### Campi, fonti e differenza dal controllo integrale

| Fatti | Taglio | Campi di richiamo corretti | Fonti canoniche rimaste | Corretti con fonte rimasta | Corretti con fonte rimossa | Variazione categorie dal controllo | Categorie complessive |
|---|---|---:|---:|---:|---:|---:|---:|
| Inizio | Inizio | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 10/30 (33,3%) |
| Inizio | Centro | 45/45 (100,0%) | 45/45 | 45/45 (100,0%) | N/V | 0,0 pp | 30/30 (100,0%) |
| Inizio | Fine | 45/45 (100,0%) | 45/45 | 45/45 (100,0%) | N/V | 0,0 pp | 30/30 (100,0%) |
| Centro | Inizio | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 10/30 (33,3%) |
| Centro | Centro | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 10/30 (33,3%) |
| Centro | Fine | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 10/30 (33,3%) |
| Fine | Inizio | 45/45 (100,0%) | 45/45 | 45/45 (100,0%) | N/V | 0,0 pp | 30/30 (100,0%) |
| Fine | Centro | 43/45 (95,6%) | 42/45 | 42/42 (100,0%) | 1/3 (33,3%) | -10,0 pp | 28/30 (93,3%) |
| Fine | Fine | 0/45 (0,0%) | 0/45 | N/V | 0/45 (0,0%) | -100,0 pp | 10/30 (33,3%) |

### Token e intensità effettiva

| Fatti | Taglio | Riduzione dei token della cronologia | Riduzione dell’intero input | Token nativi medi | Risposte complete |
|---|---|---:|---:|---:|---:|
| Inizio | Inizio | 75,03% | 69,52% | 19.533,2 | 5/5 |
| Inizio | Centro | 74,92% | 69,42% | 19.596,8 | 5/5 |
| Inizio | Fine | 74,93% | 69,43% | 19.591,2 | 5/5 |
| Centro | Inizio | 75,03% | 69,52% | 19.533,2 | 5/5 |
| Centro | Centro | 74,95% | 69,45% | 19.578,6 | 5/5 |
| Centro | Fine | 74,97% | 69,46% | 19.569,8 | 5/5 |
| Fine | Inizio | 74,94% | 69,43% | 19.588,4 | 5/5 |
| Fine | Centro | 74,98% | 69,47% | 19.565,0 | 5/5 |
| Fine | Fine | 74,97% | 69,46% | 19.569,8 | 5/5 |

## Fonti precedenti rimaste senza aggiornamento

Questi conteggi descrivono l’input: la fonte dell’accordo precedente è rimasta, mentre quella dell’aggiornamento è stata rimossa. Non sono automaticamente conteggi di risposte errate né provano che il modello abbia usato la fonte precedente. Sono elencate tutte le celle con almeno un caso; le altre celle manuali hanno zero casi di questa esposizione.

| Posizione dei fatti | Condizione | Solo appuntamento precedente | Solo sede precedente |
|---|---|---:|---:|
| Centro | `drop_end_50` | 5/5 | 5/5 |

## Compressione automatica OpenRouter: circa 1,2 milioni di token

Questo è un esperimento distinto dai tagli locali: si sposta lo stesso blocco di fatti in una cronologia più lunga e si lascia operare il plugin `context-compression`. Il testo successivo alla trasformazione non è restituito; la copertura delle fonti dopo il plugin è quindi sconosciuta.

| Posizione dei fatti | Richiamo: categorie | Richiamo: campi | Accuratezza complessiva | Token nativi medi | Riduzione stimata dell’input | Risposte |
|---|---:|---:|---:|---:|---:|---:|
| Inizio | 20/20 (100,0%) | 45/45 (100,0%) | 30/30 (100,0%) | 258.485,4 | 78,46% | 5/5 |
| Centro | 0/20 (0,0%) | 0/45 (0,0%) | 10/30 (33,3%) | 257.362,4 | 78,55% | 5/5 |
| Fine | 20/20 (100,0%) | 45/45 (100,0%) | 30/30 (100,0%) | 258.477,8 | 78,46% | 5/5 |

## Esempi verificabili e ambiguità

Per Daniel, con il plugin, i job `109` (inizio) e `115` (fine) recuperano “Tern Window”. Il job `108` (centro) risponde invece “The exact title for the reflection notebook was not established”. Per l’attività completata riporta “Reflection example 1”, mentre il valore atteso è “Folded Map”. Le tre risposte integrali sono raccolte in `analysis/illustrative-position-example.json`. L’esempio serve a illustrare le tabelle complete, non a selezionare quali esiti contare.

Nel job `085`, Crystal con fatti alla fine e taglio centrale del 75% recupera il titolo del quaderno pur avendo perso la fonte canonica iniziale. Il prompt conserva una successiva eco del paziente: “you giving the notebook a name, "Tern Window,"”. Questo mostra perché fonte canonica rimossa non significhi necessariamente assenza di ogni indizio. Non attribuiamo con certezza la risposta a uno specifico passaggio interno del modello.

I due valutatori segnalano la stessa ambiguità in `C060` (job `040`): la risposta lascia incerto se il cognome sia mai stato registrato, anziché negarlo chiaramente. Manteniamo il giudizio conservativo di insuccesso. Accettare quel campo modificherebbe i totali complessivi da 512/720 a 513/720 categorie e da 992/1.440 a 993/1.440 campi; **nessun punteggio di richiamo positivo riportato nelle matrici cambierebbe**.

## Calcoli e fonti

- Accuratezza di richiamo per cella = categorie interamente corrette / (5 profili × 4 categorie) × 100. Per i campi il denominatore è 5 × 9 = 45. Le unità indipendenti restano i cinque profili, non i 20 o 45 quesiti.
- Riduzione della cronologia = 1 − token locali della cronologia mantenuta / token locali della cronologia integrale. Profilo, istruzioni e domanda sono esclusi da questo denominatore e protetti dal taglio locale.
- Riduzione dell’intero input = 1 − token locali del prompt mantenuto / token locali del prompt integrale.
- Riduzione stimata dal plugin = 1 − token nativi / (token locali inviati − 1). La calibrazione locale/nativa è verificata sui prompt accettati; manca un conteggio nativo della versione integrale sopra il limite. Non è una misura diretta dei caratteri rimossi.
- Variazione abbinata = media, sui profili disponibili della stessa posizione, della differenza fra categorie corrette nella condizione e nel controllo integrale, divisa per quattro e moltiplicata per cento.
- Fonti canoniche: dichiarazioni autorevoli sufficienti per valore **e stato**; un vecchio appuntamento non stabilisce da solo che quel valore sia ora precedente. Le associazioni sono congelate in `source-support-definition.json`. Un campo può essere corretto anche senza quella fonte grazie a indizi residui; la categoria “fonte rimossa” non equivale a prova di assenza di qualsiasi indizio.
- Un denominatore nullo è N/V; una richiesta rifiutata non diventa uno zero semantico. I conteggi delle fonti descrivono gli input locali, non un’ipotetica visibilità del testo trasformato dal plugin.

## Esecuzione e verifiche

Stato: **completed**. 120/120 risposte complete; 121 richieste HTTP, errori HTTP/API: 1. Costo nativo osservato: **13,749866 USD**. Il costo della valutazione automatizzata non è incluso. L’unico errore è un 429 a monte, contenuto in una risposta HTTP 200; il controllo lo ha riconosciuto e ha ripetuto lo stesso payload dopo 60 secondi. Il record nativo dell’errore riporta un costo pari a zero.

Modelli attestati: `google/gemini-2.5-pro`; provider: Google. Temperatura 0,7; top-p 0,95; output massimo 4096 e ragionamento richiesto 1024; due sequenze di stop: una nuova riga seguita da `Therapist:`, e `Therapist:`. Nessun seed API, top-k non inoltrato e nessun fallback. Un solo messaggio utente per richiesta.

Raccolta UTC: 2026-09-30T20:14:07.935638+00:00 → 2026-09-30T20:38:38.056541+00:00. Verificati 184 file congelati e 29 sorgenti; Richieste con ritentativi tecnici: 1; con recupero per limite di output: 0. Prompt manuali con differenza dal conteggio locale calibrato: 0.

Due valutazioni automatiche cieche rispetto alle etichette di condizione, posizione e copertura delle fonti. Disaccordi iniziali: 0 categorie. Non è necessaria una terza valutazione. Nessuna risposta è rigenerata per migliorarne il contenuto. Vedere `review/EXECUTION.md` per modelli e modalità.

La preparazione degli input è terminata prima della raccolta. Un problema di spazio durante l’installazione del programma per i grafici è stato risolto rimuovendo soltanto due directory temporanee di dipendenze ormai inutilizzate; dati e ambiente del processo di raccolta sono rimasti invariati. Vedere `audit/temp-space-recovery.json`. Tre casi limite dell’analisi sono corretti in una copia separata del programma; endpoint e file congelati restano invariati (`audit/ANALYSIS-AMENDMENT-01.md`).

## Limiti dell’interpretazione

Le cinque storie sono le unità di caso; posizioni, tagli e domande sono perturbazioni correlate. Una generazione per cella, cinque profili e dialoghi di riempimento sintetici non stimano una prestazione clinica di popolazione. Il blocco mantiene la propria cronologia interna, ma il suo spostamento è una manipolazione sperimentale della posizione del contesto. Non si tratta di nuove sessioni cliniche.

La perdita dopo eliminazione della fonte dimostra il limite di quella politica di gestione del contesto. Non dimostra da sola inferiore capacità di ragionamento o superiorità di una memoria strutturata. **Il sistema strutturato non è rivalutato in questo esperimento.** I risultati longitudinali e del componente di recupero restano negli archivi separati.

## Controllo dell’interpretazione statistica: 11/11 verifiche

| Rischio | Verifica e limite |
|---|---|
| Paradosso di Simpson | Le celle mantengono gli stessi cinque profili; sono conservati i punteggi individuali e le differenze abbinate. Posizione, regione e intensità non sono fuse in un unico effetto. |
| Fallacia ecologica | Le medie descrivono questi cinque profili simulati; non diventano prestazioni di pazienti reali o di una popolazione di dialoghi. |
| Selezione di Berkson | Il corpus è intenzionale e deriva da storie già disponibili. Nessuna cella viene scelta o esclusa sulla base del punteggio, ma la selezione dei profili limita la generalizzabilità. |
| Collider | Non si aggiustano gli effetti per variabili prodotte dalla risposta. Il richiamo condizionato alla fonte usa una proprietà dell’input fissata prima della generazione; non sostituisce il risultato complessivo. |
| Trascuratezza del tasso di base | Questo non è un test diagnostico o di rilevamento degli errori del terapeuta. Le quote artificiali di tagli e posizioni non stimano la frequenza dei guasti in uso reale. |
| Regressione verso la media | Si includono tutti i cinque profili e i rispettivi controlli senza taglio. Una sola generazione per cella non stima la variabilità fra ripetizioni; non si selezionano soltanto risposte inizialmente errate. |
| Sopravvivenza | Sono riportate tutte le 120 condizioni pianificate e le 120 risposte complete. Gli errori tecnici sono archiviati; eventuali risposte mancanti restano esiti di disponibilità. |
| Confronti multipli | Sono mostrate tutte le 24 celle e tutti i denominatori. Nessun p-value o selezione di sole differenze favorevoli. |
| Percorsi analitici alternativi | Disegno, input, rubrica e copertura delle fonti sono congelati prima della raccolta; la prova resta esplorativa, motivata dai risultati precedenti. L’emendamento del codice corregge tre casi limite e conserva la versione iniziale. |
| Correlazione e causalità | I tagli sono manipolazioni controllate, ma un solo campione stocastico per cella limita la precisione dell’effetto. Tagli a 64k e plugin a 1,2M sono esperimenti distinti; non stimano un effetto isolato del plugin né un vantaggio dello strutturato. |
| Causalità inversa | Posizione e tagli sono stabiliti prima delle risposte; i punteggi non modificano gli input o il numero di tentativi. Nessuna inferenza clinica direzionale. |

## Materiali

Directory nella copia di lavoro: `outputs/regional-memory-compression-2026-09-30/`. `inputs/`, `schedule.json`, `manifest.json`, `runtime/`, `review/ratings/`, `analysis/results.json` e `analysis/runtime-verification.json` permettono di controllare ogni cella. `figures/regional-memory-recall.png` e `.svg` mostrano il richiamo positivo; `final-manifest.json` registra gli hash finali. Questi percorsi non implicano pubblicazione remota.
