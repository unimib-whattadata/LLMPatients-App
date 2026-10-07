# Verifica della revisione — 27 settembre 2026

## Material Passport

- Origin Skill: ARS-Codex / experiment-agent
- Origin Mode: validate
- Origin Date: 2026-09-27
- Verification Status: ANALYZED; ricalcoli deterministici verificati, nuove generazioni osservate, identificazione storica del modello incompleta.
- Version Label: reviewer_audit_v1
- Ambito: manoscritto APPLICATION, App, Agent e copie MODEL, MODEL copia, model-th-, LLMPatients, LLMDPersonality, epatients; storia Git e archivi pertinenti.
- Manoscritto e risultati storici non modificati. I dati di questa verifica sono nuovi e separati.

## Risposta alla domanda «perché non è riuscito a replicare?»

**I punteggi pubblicati si possono riprodurre con il runner del progetto.** La prima nuova somministrazione, mediante vere chiamate Vertex AI/Gemini 2.5 Pro, ha restituito Alex 1, Jason 3, Daniel 10, Crystal 26, Juanita 27, esattamente i cinque totali riportati nel paper. La cache dei risultati storici non è stata usata. Le ripetizioni hanno però già prodotto Daniel 9 e Crystal 25: la separazione «tutti i profili clinici ≥10» non è stabile.

Non disponiamo di modello, prompt e codice della replica del revisore. Perciò non si può identificare con certezza quale differenza abbia prodotto 4, 20,4 e 18,25. L'evidenza sostiene una differenza nella configurazione/input; non sostiene l'accusa di un errore o di una replica inventata da parte del revisore.

Il manoscritto APPLICATION dichiara temperatura 0,1, ma non identifica il modello della somministrazione PHQ-9, il prompt completo e tutti i parametri. MODEL dichiara la famiglia Gemini via Vertex (`main.tex:454`), senza identificativo esatto. La configurazione locale attuale seleziona `gemini-2.5-pro`, anche nell'override `QUESTIONNAIRE_MODEL_ID`. I JSON del 19 febbraio 2026 non conservano il modello: il risultato live corrispondente **non dimostra retroattivamente** che il modello storico fosse esattamente questo.

### Che cosa entra davvero nel PHQ-9

Il runner costruisce un input specifico per ogni item, senza conversazione precedente e senza memoria delle sessioni:

1. demografia del paziente;
2. caso clinico troncato a circa 400 caratteri, chiudendo all'ultima parola;
3. quattro descrizioni del funzionamento cognitivo;
4. stile durante la somministrazione;
5. le tre tendenze emotive dominanti, con descrizioni numeriche;
6. istruzione a rispondere in prima persona, finestra delle ultime due settimane, scala 0–3 e un solo item.

Impostazioni osservate: Vertex AI, `gemini-2.5-pro`, regione `us-central1`, `temperature=0.1`, `max_output_tokens=220`, `top_p=0.95`, `top_k=40`, stop sequences `\nTherapist:` e `Therapist:`. **Seed non impostato.** I filtri e gli eventuali retry sono quelli del provider originale, registrati nei nuovi log. L'item funzionale 10 è somministrato ma escluso dal totale PHQ-9.

Passare al modello il profilo YAML completo, la narrazione del paper o una conversazione con tutti gli item crea un esperimento differente, anche impostando temperatura 0,1. Non sappiamo quale di questi input abbia usato il revisore.

Fonti: `LLMPatients-Agent/agent/core/questionnaire_runner.py:179`, `:287`, `:379`, `:409`; `agent/core/llm_provider_vertex.py:253`; `data/questionnaires/phq9.yaml`.

### Controllo delle versioni

Confrontati il primo commit che contiene i risultati, `7a37818` del 19 febbraio 2026, e il commit Agent attuale `abb6cfe118b4528a8142eb750db1cf8cb1d5f6cc`:

- Crystal e Juanita canoniche sono identiche; i successivi commit «Juanita nerf» riguardano altre varianti.
- Per Daniel cambiano avatar e nome del marito, senza cambiamenti del contesto utilizzato dal PHQ-9.
- La ricostruzione dei **50 prompt** PHQ-9, dai vecchi file e dal vecchio runner, coincide byte per byte con quella attuale. Metodi di contesto, prompt e scoring risultano invariati. Metodo e hash sono in `historical_prompt_comparison.json`.

Queste modifiche storiche non spiegano i numeri diversi del revisore.

### Risposte originali disponibili

I cinque JSON originali, datati 19 febbraio 2026, contengono le risposte ai singoli item. Quello di Daniel è accessibile anche nel repository pubblico: [phq9.json](https://github.com/unimib-whattadata/LLMPatients-Agent/blob/main/data/questionnaire_results/daniel_isherwood_001/phq9.json). Altra copia: `LLMPatients-App/evaluation/psycoquestionnaire/results/patient_questionnaire_scores`.

Daniel: `[1,1,1,2,2,2,1,0,0]`, somma 10. Crystal: `[3,3,3,3,3,3,3,3,2]`, somma 26. Juanita: nove 3, somma 27. **Tutti i 30 scoring archiviati**, sui cinque pazienti e sei strumenti, sono stati ricalcolati dal codice e coincidono con i rispettivi JSON. Questo verifica lo scoring, non rigenera le risposte dei sei strumenti.

L'archivio locale `LLMPatients-Agent-runtime-anonymous.zip` include runner e profili ma omette definizioni dei questionari e risultati. Se era il pacchetto ricevuto dal revisore, la disponibilità pubblica attuale non risolve ciò che mancava nel materiale consegnato allora.

Attenzione operativa: senza `force`, il runner restituisce un risultato già salvato (`questionnaire_runner.py:181`). Ripetere il comando non prova quindi di aver effettuato nuove somministrazioni. Non sappiamo se questo abbia avuto alcun ruolo nella replica del revisore, che dichiara di aver reimplementato il protocollo.

## Nuove somministrazioni PHQ-9

| Paziente | Paper | Nuovi totali, in ordine | n complete |
|---|---:|---|---:|
| Alex Carter | 1 | 1, 1, 1 | 3 |
| Jason Smith | 3 | 3, 3, 2 | 3 |
| Daniel Isherwood | 10 | 10, 9, 10 | 3 |
| Crystal Smith | 26 | 26, 25, 25 | 3 |
| Juanita Delgado | 27 | 27, 27, 27 | 3 |

Completate **15 somministrazioni indipendenti**, tre per paziente, per **150 risposte a item** nuove con 150 response ID distinti. Tutti i 150 output osservati terminano con `STOP`; nessun `MAX_TOKENS` nelle somministrazioni complete. Registrati 86 tentativi API falliti nei run completi, gestiti dal retry originale. Non sono chiamate aggiuntive conteggiate come somministrazioni indipendenti.

L'harness era predisposto per 20 run per paziente. È stato fermato dopo tre completi ciascuno: la riproducibilità dei valori e il controesempio al cutoff erano già osservati, mentre i frequenti HTTP429 rallentavano fortemente la campagna estesa. Le quarte somministrazioni parziali sono conservate ma escluse dai totali; i loro raw API record ancora in memoria non sono stati salvati alla terminazione. **Questa verifica non è una replica da 20 run né una stima precisa della varianza o della probabilità di superare la soglia.** Nessuna esecuzione completa è stata omessa. Vedi `evidence/summary.json`, `evidence/campaign_status.json` e `evidence/phq9_runs/`.

L'harness usa il codice originale, scrive ogni ripetizione in una cartella distinta e conserva prompt, risposte raw del provider, parametri, versione dichiarata dal servizio e hash degli input. Cinque pazienti vengono eseguiti in parallelo; l'intervallo applicativo fra item è posto a zero, mentre il backoff originale su HTTP 429 rimane attivo. Questa è una differenza di scheduling documentata, non una modifica dei prompt o dei parametri di generazione.

Nella seconda somministrazione di Daniel cambia soltanto l'item 6, da 2 a 1: il totale scende da 10 a 9. Il dato mostra direttamente la fragilità della soglia. Le differenze dell'item funzionale 10 sono conservate ma non influenzano il totale.

I dati del revisore sono disponibili soltanto come medie citate nella revisione, senza risposte grezze; non è possibile ricostruirne varianza o procedura. Le nostre nuove osservazioni non autorizzano un test statistico tra i due esperimenti.

## Daniel e appropriatezza dello strumento

Il PHQ-9 misura sintomi depressivi; la soglia 10 non è una soglia per «qualsiasi patologia psichiatrica». Fonte primaria: [Kroenke et al., 2001](https://pmc.ncbi.nlm.nih.gov/articles/PMC1495268/).

Il profilo di Daniel è centrato sul binge eating e descrive umore eutimico, affetto reattivo, vergogna e stanchezza dopo le abbuffate, senza disperazione pervasiva (`data/patients/daniel_isherwood_001.yaml:100`) e senza comorbidità indicata (`:126`). Un punteggio sotto 10 non basta quindi a dichiarare incoerente questo profilo. Il paper contiene già un controllo specifico pertinente, BES=34 (`APPLICATION/main.tex:716`, `:734`). L'altro manoscritto MODEL riconosce già il possibile sovraendorsement depressivo di Daniel (`main.tex:599`).

Il risultato 10 è documentato e riproducibile; usarlo come requisito di separazione universale tra controlli e profili clinici eccede ciò che questi dati dimostrano. La critica del revisore su questo punto è fondata.

## Continuità tra sessioni e confronto con prompt narrativo

Non è stata trovata una validazione empirica dell'intero arco di 11 sessioni. Il PHQ-9 opera fuori dal grafo conversazionale e non usa la memoria: non può validarla.

Esistono invece 20 transcript set con **tre mini-sessioni da cinque scambi**: 10 full e 10 prompt-only. I workbook dei clinici conservano anche rating globali di continuità, completi, scala 1–5:

| Clinico | Full (10 set) | Prompt-only (10 set) |
|---|---:|---:|
| Rater 1 | 4,6 | 4,4 |
| Rater 2 | 5,0 | 5,0 |

Il manoscritto dichiara esplicitamente che le due condizioni sono aggregate senza confronto (`main.tex:761`). I rating hanno un forte effetto soffitto e non dimostrano un vantaggio della memoria strutturata.

È stato recuperato il generatore dalla storia Git (`402edea:evaluation/generate_real_transcripts.py`, poi rimosso). I 20 transcript attuali sono identici a quelli di quel commit. Il generatore mostra che la baseline:

- usa gli stessi YAML ma omette alcuni campi, tra cui `clinicalFunctioning`, `medicalAndPhysicalHistory`, parte della demografia e `emotionTraits`;
- azzera la storia all'inizio di ciascuna sessione;
- dichiara `gemini-2.5-pro` e temperatura 0,7.

Il full conserva il terapeuta e chiude ogni sessione mediante `/session-end`. Gli header dichiarano lo stesso modello, ma quello del server full non viene verificato dal generatore. Un controllo eseguito offline sulle funzioni originali conferma il reset della baseline. **Il confronto non isola la struttura a parità di contenuto clinico e disponibilità di storia.**

Pertanto «non esiste alcun materiale multi-sessione/baseline» sarebbe troppo assoluto; «la Sezione 4 non dimostra la continuità su 11 sessioni e il vantaggio della struttura» è sostenuto dalle prove.

I log storici full contengono inoltre episodi con riepiloghi troncati o richieste di reflection mancante al posto di riassunti. Sono evidenze di problemi nei log, non una misura complessiva della frequenza dei fallimenti.

## Misstep: calcoli corretti, generalizzazione non dimostrata

Eseguiti lo script originale di ricalcolo e un controllo indipendente sulle 600 etichette cliniche. Tutte le righe dei Panel A e B coincidono con il manoscritto; κ=0,518970, accordo osservato 76,333%, 377 positivi su 600 giudizi. Il detector archiviato è `gemini-3.1-pro-preview`, timestamp 25 giugno 2026; il modello paziente dichiarato nel corpus è `gemini-2.5-pro`. Non sono stati rigenerati i 20 output del detector.

Il corpus contiene 150/300 turni con errori deliberati, concentrati in dieci transcript completamente positivi. Ci sono soltanto **15 battute terapeuta di errore distinte, ripetute dieci volte**, con risposte paziente diverse: il numero di turni non equivale alla varietà di errori indipendenti.

| Controllo | Esito ricalcolato |
|---|---:|
| Seeded individuati da entrambi i clinici | 150/150 |
| Disaccordi clinici, tutti nella metà appropriate | 71 |
| κ nei soli appropriate | 0,016620 |
| Detector: seeded segnalati | 131/150 = 87,33% |
| Detector: appropriate segnalati | 62/150 = 41,33% |
| Dei 62, confermati da almeno un clinico | 30 |
| Dei 62, confermati da entrambi | 1 |

Le etichette della condizione sono state effettivamente rimosse dai workbook. L'ordine non è randomizzato, con seeded sempre negli ID pari. Non sono state trovate domande ai clinici per verificare se avessero indovinato la condizione. Il sospetto del revisore è plausibile, ma **non è dimostrato che l'accecamento sia fallito**.

La precisione .68–.83 è corretta come descrizione di questo corpus, non una stima della precisione in sessioni reali con errori radi. Esempio matematico, non dato sugli studenti: mantenendo sensibilità 131/150 e specificità 88/150, con prevalenza ipotetica 10% la precisione sarebbe circa 19%. Non conosciamo la prevalenza reale né se quelle due prestazioni rimarrebbero costanti.

Il runner del detector concatena le tre sessioni e passa `stepNumber=1`; i flag binari di turno sono ricostruiti dai riferimenti nelle evidenze di categoria. Questi dettagli sono necessari a una replica fedele. Un corpus più realistico e una verifica dell'accecamento sarebbero nuovi esperimenti: l'avvio del software non li sostituisce.

## Avvio e verifiche tecniche

- Docker, applicazione su 8080 e PostgreSQL su 5432 avviati; pagina principale HTTP200 e database healthy.
- Il Python del vecchio `.venv` punta a un interprete mancante. Usato Python bundled3.12 con i pacchetti esistenti; **7/7 test unitari Agent passati**.
- L'Agent completo richiede qui un overlay temporaneo SciPy1.16.3: la versione1.15.3 prevista non viene caricata dal linker dell'host. Avvio riuscito, OpenAPI200 e accesso dal container App verificato. Questo non prova l'avvio con requirements immutate.
- Un turno reale con Daniel e `/session-end` sono riusciti; memoria persistita e riletta. Tuttavia reflection e long-term summary sono **interrotte a metà frase** (57 e96 caratteri). Il replay diagnostico ha ricevuto429: non è possibile attribuire con certezza il troncamento a `MAX_TOKENS`.
- Il test backend applicativo completo **non passa**: senza configurazione manca `GOOGLE_CLOUD_PROJECT`; caricando `.env`, si esaurisce l'attesa di5secondi della valutazione misstep. Non è dimostrato da questo errore se il servizio sia lento o non configurato correttamente.
- `/patient` funziona; `/patients` e `/initialise-patient` restituiscono404. Il container attivo usa il percorso corretto; i default di compose e l'ambiente host differiscono.
- L'Agent temporaneo con memoria audit è stato arrestato. Docker, App8080 e PostgreSQL5432 restano attivi. Nessun codice o dato originale è stato corretto in questa verifica.

Comandi ed evidenze completi in [appendix/runtime_audit.md](appendix/runtime_audit.md). Lo smoke test dimostra avvio, generazione e persistenza; non dimostra stabilità clinica, efficacia didattica o correttezza su11sessioni.

## Copertura metodologica ARS

Esaminati 11/11 rischi del protocollo. Questo elenco descrive i controlli, non certifica la validità dello studio.

| Rischio | Esito |
|---|---|
| Paradosso di Simpson | Aggregate e condizioni separate controllate; nessuna inversione dimostrata, forte eterogeneità appropriate/seeded. |
| Fallacia ecologica | Da evitare l'inferenza di efficacia didattica sui singoli studenti da questi dati sintetici. |
| Selezione/Berkson | Corpus costruito e saturo; non dimostrato un effetto collider/Berkson specifico. |
| Collider bias | Nessun modello di aggiustamento pertinente; non applicabile alle tabelle descrittive. |
| Base rate neglect | Rischio concreto: precisione non trasferibile direttamente a errori radi. |
| Regressione alla media | Nessun disegno pre/post selezionato su estremi; non identificata. |
| Survivorship | Sei strumenti e cinque profili archiviati; generazioni nuove/429 e prove non completate dichiarate. L'assenza di una storia completa degli esperimenti storici impedisce una garanzia globale. |
| Look-elsewhere | Nessun test di significatività usato qui; non ricostruibile l'eventuale selezione delle esecuzioni storiche. |
| Scelte analitiche multiple | Un solo run storico per strumento, soglie e riferimento clinico variabile; nessuna prova confermatoria preregistrata. |
| Correlazione/causalità | Nessun confronto adeguato per attribuire un vantaggio causale a memoria/struttura o apprendimento. |
| Causalità inversa | Non pertinente al semplice ricalcolo; nessuna inferenza causale proposta. |

## Che cosa consente di sostenere questa verifica

1. Si può mostrare al revisore che i totali originali PHQ-9 esistono e sono ottenibili oggi con configurazione e prompt espliciti; le risposte item-level sono già archiviate. Occorre distinguere la configurazione osservata oggi da quella storica non registrata.
2. Non si può attribuire con certezza lo scarto del revisore a uno specifico parametro senza la sua configurazione. La sola temperatura 0,1 non definisce la replica.
3. Va presa sul serio la fragilità del cutoff di Daniel: è osservata anche nelle nuove generazioni.
4. La critica sulla validazione multi-sessione resta fondata; il confronto disponibile non controlla contenuto e storia.
5. Le metriche misstep sono aritmeticamente corrette. La critica riguarda campionamento, varietà, accecamento non verificato e validità esterna della precisione.

Per una risposta scientificamente sostenibile servono il pacchetto esatto di riproduzione e claim commisurati ai dati. La presente verifica non modifica il manoscritto né costituisce una nuova validazione clinica o longitudinale.


## File della verifica

- [Risultati PHQ-9](evidence/summary.json), con risposte e prompt nei sottofolder `evidence/phq9_runs/`.
- [Provenienza e hash](evidence/source_manifest.json); [confronto dei 50 prompt storici](evidence/historical_prompt_comparison.json).
- [Audit misstep dettagliato](appendix/misstep_audit.md) e [ricalcolo numerico](evidence/misstep_audit.json).
- [Audit runtime](appendix/runtime_audit.md), [risposta reale](evidence/runtime_chat.json) e [memoria riletta](evidence/runtime-memory-readback.json).
- Script eseguiti e generatore storico recuperato in `scripts/`. Gli script riportano i percorsi locali usati nella verifica; non contengono chiavi.
