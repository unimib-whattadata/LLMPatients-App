# Verifica conclusiva della revisione

## Material Passport

- Origin Skill: ARS-Codex / experiment-agent
- Origin Mode: run + validate
- Analysis timestamp: 2026-09-27T19:27:09.502097+00:00
- Verification status: completati i test specificati e verificata la provenienza dei risultati. Modello storico e configurazione del revisore restano parzialmente sconosciuti.
- Dati: cinque profili sintetici; nessun nuovo partecipante umano o giudizio clinico.

## Cosa è stato completato

- **100 PHQ-9**, 20 per ciascuno dei cinque pazienti, con **1.000 risposte individuali** archiviate.
- **110 sessioni longitudinali e 550 turni valutati**: cinque percorsi di 11 sessioni per ciascuna condizione, cinque turni per sessione; 540 risposte valide e 10 esiti tecnici non validi.
- Correzione della memoria troncata, **20 test software** e riapertura reale della memoria in un processo nuovo.
- Backend reale App–Agent–valutatore: **PASS**, 144.6 secondi; database temporaneo eliminato.
- Ricalcolo della valutazione misstep storica e verifica dei suoi limiti di disegno.

## 1. PHQ-9: ripetizione e continuazione

| Paziente | Pubblicato | Nuova media ± DS (20 run) | Intervallo | Run ≥10 | Revisore, media dichiarata |
|---|---:|---:|---:|---:|---:|
| Alex Carter | 1 | 1.00 ± 0.00 | 1–1 | 0/20 | — |
| Jason Smith | 3 | 3.05 ± 0.60 | 2–4 | 0/20 | — |
| Daniel Isherwood | 10 | 9.90 ± 0.31 | 9–10 | 18/20 | 4 |
| Crystal Smith | 26 | 25.60 ± 0.82 | 24–27 | 20/20 | 20.4 |
| Juanita Delgado | 27 | 26.95 ± 0.22 | 26–27 | 20/20 | 18.25 |

### PHQ-9 per composizione dell'endpoint

La media principale descrive l'intero protocollo continuato attraverso i servizi dichiarati. La tabella seguente raggruppa le somministrazioni complete secondo Vertex US, Vertex global, OpenRouter o una composizione mista degli item accettati. Una somministrazione mista conserva gli item precedenti; il punteggio usa sempre tutti i nove item. Le differenze tra gruppi non stimano un effetto causale del servizio.

| Paziente | Endpoint degli item | Run completi | Media ± DS | Run ≥10 |
|---|---|---:|---:|---:|
| Jason Smith | mixed:global+openrouter+us-central1 | 1 | 3.00 ± non stimabile | 0/1 |
| Juanita Delgado | mixed:global+openrouter+us-central1 | 1 | 27.00 ± non stimabile | 1/1 |
| Crystal Smith | mixed:openrouter+us-central1 | 1 | 25.00 ± non stimabile | 1/1 |
| Alex Carter | openrouter | 6 | 1.00 ± 0.00 | 0/6 |
| Jason Smith | openrouter | 6 | 3.17 ± 0.41 | 0/6 |
| Daniel Isherwood | openrouter | 6 | 10.00 ± 0.00 | 6/6 |
| Crystal Smith | openrouter | 5 | 25.20 ± 0.45 | 5/5 |
| Juanita Delgado | openrouter | 6 | 27.00 ± 0.00 | 6/6 |
| Alex Carter | us-central1 | 14 | 1.00 ± 0.00 | 0/14 |
| Jason Smith | us-central1 | 13 | 3.00 ± 0.71 | 0/13 |
| Daniel Isherwood | us-central1 | 14 | 9.86 ± 0.36 | 12/14 |
| Crystal Smith | us-central1 | 14 | 25.79 ± 0.89 | 14/14 |
| Juanita Delgado | us-central1 | 13 | 26.92 ± 0.28 | 13/13 |

Item accettati per endpoint: `global`: 4; `openrouter`: 308; `us-central1`: 688. La composizione esatta di ogni run è riportata in `analysis/phq-runs.csv`.

Daniel raggiunge la soglia in **18/20** somministrazioni. Il suo valore pubblicato di 10 è confermato dal JSON storico, ma non deve essere interpretato come separazione stabile garantita. Il PHQ-9 misura sintomi depressivi ([validazione originale](https://pubmed.ncbi.nlm.nih.gov/11556941/)); Daniel è un profilo centrato sul binge eating e il manoscritto include anche il BES come controllo specifico.

**Configurazione richiesta per questa campagna:** Vertex AI, `gemini-2.5-pro`, endpoint iniziale `us-central1` e successiva continuazione su `global`, temperatura 0,1, limite iniziale 220 token, top-p 0,95, top-k richiesto 40, stop sequences archiviate, nessun seed impostato. La successiva continuazione OpenRouter, quando presente, usa il mapping dichiarato sotto. Ogni item è indipendente e non attraversa il grafo o la memoria. Il contesto seleziona campi del profilo e tronca il caso clinico a 400 caratteri.

La [scheda ufficiale del modello](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-pro), consultata il 27 settembre 2026, indica top-k 64 fisso. I log provano che il codice richiede 40; le risposte del servizio non attestano il top-k effettivamente applicato. Si distingue quindi la configurazione richiesta da quella interna al servizio. Questa osservazione non identifica la causa della differenza con il revisore e non modifica le richieste del protocollo congelato.

Le risposte provengono da 1437 tentativi API, con 414 tentativi falliti archiviati. Gli ID delle 1023 risposte restituite sono univoci. 2 risposte intere sono state accettate dal runner originale pur con un motivo di terminazione diverso da STOP: la campagna conserva quel comportamento e lo segnala, senza sostituire le risposte.

I primi tre run per paziente sono quelli già completati nell'audit iniziale. I run 04 allora interrotti, privi di registrazione API completa, sono conservati nel vecchio dossier ma esclusi e furono ricominciati all'avvio della campagna regionale secondo una decisione documentata prima dei nuovi risultati. Dopo l'interruzione per capacità, tutti i 68 run regionali completi e gli item già salvati dei run parziali sono stati riutilizzati nella continuazione su `global`. I risultati regionali non sono contati come repliche aggiuntive.

**Perché il revisore non replica:** la causa esatta non è identificabile senza il suo codice e gli item grezzi. I 50 prompt ricostruiti dal codice storico coincidono con quelli attuali; gli output storici non attestano modello/versione, seed e configurazione completa. Una reimplementazione con un modello o un contesto diverso non è lo stesso esperimento. La nuova campagna documenta le configurazioni e le continuazioni effettivamente usate, senza attribuirle retroattivamente ai dati storici.

Fonti: [validazione PHQ](analysis/phq-validation.json), [risposte per item](analysis/phq-items.csv), [prompt esatti](analysis/phq-exact-prompts.json), [audit storico](../reviewer-audit-2026-09-27/REPORT.md).

## 2. Continuità su undici sessioni

La versione corretta del sistema viene confrontata con una baseline narrativa che riceve lo stesso YAML clinico completo e tutta la propria storia. Ogni sessione riparte in un processo nuovo; il sistema completo ricarica lo stato e la memoria da disco. Testi del terapeuta, profili, parametri iniziali di generazione e criteri sono fissati prima dei risultati.

| Condizione | Prove primarie finali | Prove secondarie | Risposte tecnicamente non valide |
|---|---:|---:|---:|
| Sistema completo | 12/30 (40.0%) | 46/85 (54.1%) | 2/275 |
| Baseline narrativa + storia integrale | 30/30 (100.0%) | 75/85 (88.2%) | 8/275 |

In questo protocollo la baseline ottiene più richiami primari corretti del sistema completo. Il nuovo esperimento non sostiene una superiorità del sistema completo nella misura primaria di continuità. Il manoscritto deve riportare questo esito e circoscrivere il contributo architetturale alle proprietà effettivamente verificate.

Il percorso attraversa provider e politiche di servizio differenti, secondo interruzioni operative e non secondo un'assegnazione randomizzata. Il risultato aggregato descrive questi percorsi misti: le eventuali differenze tra condizioni non possono essere attribuite soltanto alla struttura del sistema o separate dagli effetti del servizio.

Le percentuali seguenti considerano soltanto le risposte tecnicamente valide, mantenendo nel denominatore anche i mancati ricordi. Sono descrittive: non indicano quale sarebbe stato il risultato dei turni rimasti senza risposta.

| Condizione | Prove primarie su risposte valide | Prove secondarie su risposte valide |
|---|---:|---:|
| Sistema completo | 12/30 (40.0%) | 46/83 (55.4%) |
| Baseline narrativa + storia integrale | 30/30 (100.0%) | 75/79 (94.9%) |

Durante una sequenza persistente di errori di capacità HTTP 429 sono stati sospesi e poi arrestati i processi regionali. Una diagnosi con lo stesso progetto e modello ha restituito 429 su `us-central1` e 200 su `global`. La campagna è stata proseguita sull'endpoint globale, conservando le 32 sessioni concluse, la sessione parziale e tutti gli esiti tecnici osservati. Le operazioni sono registrate in [eventi di esecuzione](runtime/operational-events.jsonl) e nell'[emendamento operativo](endpoint-amendment.json). Modello e input scientifici restano quelli congelati; endpoint e disponibilità del servizio sono limiti espliciti del confronto.

Le sessioni parziali riprendono dall'ultimo turno salvato. I tentativi falliti dei turni non conclusi restano nel registro; la ripresa può ricostruire diversamente lo stato intermedio non salvato. Il seed Python viene reinizializzato nel nuovo processo, perché il runner originario non salvava lo stato dell'RNG. Non si dichiara una riproduzione byte per byte del turno interrotto; le risposte già accettate sono invece preservate e verificate.

Dopo ulteriori errori del servizio, l'utente ha richiesto l'arresto e successivamente autorizzato la ripresa. Alla pausa erano conservati 68 PHQ completi, 32 sessioni complete e 165 turni complessivi. La ripresa documentata in [process-resumption.json](process-resumption.json) usa lo stesso modello ed endpoint globale, mantiene il checkpoint di 375 file e riduce a uno il numero iniziale di worker per campagna. Le due sessioni parziali conservano rispettivamente tre e due turni già salvati.

Anche la continuazione globale ha incontrato errori 429. Le pause e la riduzione temporanea della concorrenza sono annotate negli eventi operativi e non sostituiscono le risposte osservate. Le latenze includono indisponibilità e pause del processo e non costituiscono un benchmark del solo tempo di generazione. La [documentazione del servizio](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/resources/throughput-quota) descrive la capacità condivisa come possibile causa di 429; l'audit non ha potuto consultare le quote del progetto con l'account di servizio e non ne attribuisce una causa specifica non verificata.

Una successiva ripresa introduce soltanto un livello esterno per regolare la frequenza delle richieste e le attese condivise dopo errori di capacità. L'[emendamento rate-limit](rate-limit-amendment.json) conserva lo snapshot scientifico, i prompt, i parametri e la regola originale di accettazione delle risposte, compresa quella PHQ per MAX_TOKENS. Il [checkpoint del secondo arresto](resume-stop-input-manifest-20260927T140335Z.json) tutela 375 file: 68 PHQ completi, 12 item parziali già accettati, 32 sessioni complete e 165 turni. Tutti i 151 hash longitudinali coincidono con il checkpoint precedente; non viene introdotta una nuova eccezione sui prompt.

La verifica della memoria resta ancorata ai quattro file dello snapshot `longitudinal-source` già sottoposto ai test, preservando i risultati originali. I successivi cambiamenti dell’Agent live non riscrivono questa prova. Il nuovo limiter ha 45 test offline superati, documentati in [rate-limit-implementation.json](runtime/rate-limit-implementation.json). Altri 18 test dell’[overlay congelato](runtime/rate-limit-overlay-preflight.json), nove per ciascun percorso, verificano la conservazione degli argomenti di generazione e dell’accettazione originale di MAX_TOKENS, l’archiviazione degli errori effettivi prima della pausa e la conservazione delle risposte già accettate. Il livello di trasporto usato è identificato separatamente mediante hash e registri operativi. Disponibilità, tentativi e latenza attraversano politiche operative diverse e non costituiscono un confronto con una sola politica di trasporto.

### Continuazione con OpenRouter

Su richiesta dell'utente, la raccolta prosegue con `google/gemini-2.5-pro` tramite OpenRouter. L'[emendamento di provider](openrouter-provider-amendment.json), congelato prima della nuova raccolta, conserva i 375 file del checkpoint, 68 PHQ completi, 12 item parziali e 165 turni. Il dossier Vertex precedente rimane separato. Si tratta della continuazione del dataset esistente, non di una replica indipendente con un solo provider.

Il messaggio utente rimane identico; temperatura, limite di output, top-p e stop sequences vengono inoltrati. **Top-k e i controlli di sicurezza Vertex non vengono inoltrati.** Non è impostato un override del ragionamento; i valori interni e le politiche del servizio non sono dichiarati equivalenti. Il routing può scegliere endpoint upstream per il medesimo modello; nessun fallback a un altro modello è autorizzato. I payload HTTP nativi, il provider upstream quando dichiarato, i motivi di fine e la normalizzazione del testo visibile sono archiviati e verificati separatamente dagli output SDK. Il valore `region=openrouter` identifica un percorso API nel formato storico: la regione geografica upstream è ignota. Il nome normalizzato del modello e il nome nativo attestano l'identificativo restituito, non una revisione immutabile del backend.

Il [preflight OpenRouter](runtime/openrouter-preflight.json) documenta 34 test offline: 20 d'integrazione con i runner congelati e 14 del trasporto. Le quattro funzioni scientifiche del wrapper, lo scorer, gli scenari, i profili e le regole distinte di accettazione delle risposte PHQ e longitudinali restano invariati. I test software non costituiscono una validazione clinica.

### Correzione degli errori nativi del servizio

Nella chiusura di Juanita, sessione 4, il gateway ha restituito HTTP 200 con `finish_reason=error` e codice upstream 504. Il primo adattatore lo aveva normalizzato come `OTHER`, causando il fallimento della finalizzazione dopo cinque turni già salvati. Il payload nativo, la risposta normalizzata originale e il fallimento restano archiviati; non vengono riclassificati retroattivamente o eliminati.

L'[emendamento separato](openrouter-error-handling-amendment.json) aggiunge un'estensione esterna che riconosce questi errori prima della normalizzazione, preservando separatamente stato HTTP e codice upstream. I sei file OpenRouter originali rimangono immutati. La decisione di ritentare resta ai provider congelati e al limitatore condiviso; i prompt, i parametri e il trattamento originale delle risposte senza errori nativi, compresi MAX_TOKENS e SAFETY, restano quelli dichiarati.

Il checkpoint conserva 427 file: 85 PHQ completi, sei item parziali, 35 sessioni complete e 184 turni. Juanita riprende soltanto la finalizzazione, senza ripetere i cinque turni; Alex conserva quattro turni e completa T05. I nuovi processi e gli eventi di trasporto dichiarano l'identità dell'estensione. Il [preflight](runtime/openrouter-error-handling-preflight.json) documenta 25 test offline, otto verifiche dei classificatori d'errore congelati e l'assenza di risposte paziente STOP non registrate. Nessuna nuova eccezione sui prompt è introdotta.

### Risultati longitudinali per endpoint

Gli strati seguenti attribuiscono ogni turno all'endpoint della sua esecuzione. Le risposte globali e OpenRouter possono usare memoria e dialoghi raccolti con servizi precedenti. L'assegnazione dipende dal momento dell'interruzione, non è randomizzata e non permette di stimare un effetto dell'endpoint o del provider.

| Endpoint | Condizione | Turni | Esiti tecnici non validi | Prove primarie | Prove secondarie |
|---|---|---:|---:|---:|---:|
| global | Sistema completo | 2 | 1 | — (nessuna prova) | 1/1 (100.0%) |
| global | Baseline | 2 | 2 | — (nessuna prova) | 0/3 (0.0%) |
| openrouter | Sistema completo | 197 | 0 | 12/30 (40.0%) | 31/57 (54.4%) |
| openrouter | Baseline | 188 | 0 | 30/30 (100.0%) | 47/51 (92.2%) |
| us-central1 | Sistema completo | 76 | 1 | — (nessuna prova) | 14/27 (51.9%) |
| us-central1 | Baseline | 85 | 6 | — (nessuna prova) | 28/31 (90.3%) |

| Paziente | Condizione | Composizione del percorso | Turni osservati |
|---|---|---|---:|
| Alex Carter | full | mixed:openrouter+us-central1 | 55 |
| Alex Carter | baseline | mixed:openrouter+us-central1 | 55 |
| Jason Smith | full | mixed:global+openrouter+us-central1 | 55 |
| Jason Smith | baseline | mixed:openrouter+us-central1 | 55 |
| Daniel Isherwood | full | mixed:openrouter+us-central1 | 55 |
| Daniel Isherwood | baseline | mixed:openrouter+us-central1 | 55 |
| Crystal Smith | full | mixed:openrouter+us-central1 | 55 |
| Crystal Smith | baseline | mixed:openrouter+us-central1 | 55 |
| Juanita Delgado | full | mixed:openrouter+us-central1 | 55 |
| Juanita Delgado | baseline | mixed:global+openrouter+us-central1 | 55 |

| Paziente | Sistema completo, prove finali | Baseline, prove finali |
|---|---:|---:|
| Alex Carter | 2/6 | 6/6 |
| Jason Smith | 3/6 | 6/6 |
| Daniel Isherwood | 3/6 | 6/6 |
| Crystal Smith | 2/6 | 6/6 |
| Juanita Delgado | 2/6 | 6/6 |

| Misura primaria | Sistema completo | Baseline |
|---|---:|---:|
| Nome ed età | 10/10 (100.0%) | 10/10 (100.0%) |
| Titolo e pianificazione aggiornati | 2/15 (13.3%) | 15/15 (100.0%) |
| Titolo introdotto in S2, non interrogato fino a S11 | 0/5 (0.0%) | 5/5 (100.0%) |

Sono prove lessicali conservative con risposte attese tracciate alla loro introduzione. Citare sia un valore vecchio sia quello attuale viene classificato come ambiguo; un non-match non è automaticamente una contraddizione. Le risposte di fallback rimangono nel denominatore complessivo e sono anche riportate separatamente.

Il confronto riguarda **intere configurazioni**, comprese selezione e compressione del contesto. Cinque coppie di percorsi, una generazione per condizione, non identificano l'effetto causale della sola struttura e non dimostrano validità clinica o efficacia formativa. I fatti sono dati del percorso di esercitazione; il test non equivale a undici sedute cliniche validate da esperti.

Le fasi del percorso sono definite nell'App come organizzazione didattica e suggerimenti al terapeuta. L'Agent registra `step_id` nei metadati, senza selezionare un prompt del paziente in base alla fase; il confronto usa i testi prefissati e misura la continuità della memoria. Vedi [perimetro del percorso](analysis/pathway-scope.md).

Nei log sono registrati 55 avvisi relativi alla soglia di dieci secondi per il consolidamento asincrono. Le evidenze dei processi, delle risposte e della memoria restano disponibili; gli avvisi non sono nascosti o trasformati in richiamo corretto.

Fonti: [protocollo](longitudinal/protocol.md), [risultati](analysis/longitudinal-report.md), [audit delle fonti e del runtime](analysis/longitudinal-audit.json), [riepilogo](analysis/longitudinal-summary.json).

## 3. Corpus misstep

I ricalcoli coincidono con i numeri archiviati. Il corpus contiene 20 trascrizioni e 300 turni del terapeuta: 150 errori deliberati, concentrati in dieci trascrizioni. Quindici frasi con errore distinte sono ripetute dieci volte.

| Riferimento del detector | Precisione | Sensibilità/recall | F1 |
|---|---:|---:|---:|
| Rater 1 | 0.824 | 0.716 | 0.766 |
| Rater 2 | 0.694 | 0.865 | 0.770 |
| Either | 0.834 | 0.719 | 0.772 |
| Both | 0.684 | 0.863 | 0.763 |
| Seeded | 0.679 | 0.873 | 0.764 |

L'accordo tra clinici è κ=0.519 sul totale e κ=0.017 nel sottoinsieme appropriate. Entrambi marcano tutti i 150 errori deliberati. Le etichette di condizione sono state rimosse dai fogli, ma non è stata misurata la capacità dei clinici di indovinare la condizione dal testo.

Il revisore ha quindi ragione sul limite di trasferibilità. Questi risultati possono essere presentati come **analisi su un corpus artificiale saturo**, con precisioni descrittive del corpus; non come precisione attesa nelle sessioni reali degli studenti. Il test backend passato prova il funzionamento del percorso eseguito, non risolve questo limite scientifico.

Fonti: [audit del corpus](runtime/app-backend-sensitivity-audit.md), [ricalcoli](runtime/app-backend-sensitivity-audit.json).

## 4. Correzioni e verifica del software

Il provider accettava una risposta parziale prima di controllare il motivo di terminazione; inoltre `str(FinishReason.MAX_TOKENS)` restituiva `2`, rendendo inefficace il confronto testuale. Ora il provider scarta i completamenti incompleti e applica un recupero con limite esplicito. Per le chiamate interne Gemini il budget iniziale è 4096. La finalizzazione segnala un errore se non ottiene entrambe le memorie e mantiene la sessione disponibile per riprovare.

Il test backend caricava in modo incompleto l'ambiente e attendeva soltanto cinque secondi per un'analisi asincrona. Il test corretto ha osservato una valutazione reale completata in circa 13,6 secondi; verifica inoltre risposte REAL, assenza di fallback e pulizia delle connessioni e del database temporaneo.

Fonti: [correzione memoria](runtime/runtime_memory_fix.md), [risultati delle regressioni e del test reale](runtime/memory_fix_results.json), [backend](runtime/app-backend-findings.md), [esito backend](runtime/app-backend-real.json).

## 5. Controllo dell'interpretazione statistica: 11/11

| Rischio | Trattamento |
|---|---|
| Paradosso di Simpson | Risultati longitudinali riportati anche per paziente, con denominatori uguali; i profili PHQ non sono ridotti a un solo valore medio. |
| Fallacia ecologica | Nessuna inferenza su pazienti reali, clinici o studenti dai profili sintetici. |
| Selezione/Berkson | Cinque casi scelti intenzionalmente; non un campione rappresentativo. |
| Collider bias | Nessun modello causale aggiustato per variabili post-trattamento. |
| Base rate neglect | Il 50% di errori deliberati è dichiarato; nessuna precisione proiettata come osservata su studenti. |
| Regressione verso la media | Le differenze dalle singole misure storiche non sono presentate come miglioramento clinico. |
| Survivorship bias | Run completi conservati, errori API archiviati, risposte di fallback nel denominatore; parziali storici esclusi documentati. |
| Look-elsewhere effect | Nessun test di significatività; tutte le misure primarie e secondarie previste sono rendicontate. |
| Scelte analitiche multiple | Protocollo locale e criteri congelati prima dei percorsi; non presentati come preregistrazione esterna. |
| Correlazione/causalità | Nessuna attribuzione causale alla sola struttura del profilo o all'efficacia didattica. |
| Causalità inversa | Introduzione e interrogazione dei fatti sono ordinate temporalmente; nessuna inferenza causale clinica. |

## 6. Cosa aggiornare nella revisione

1. Aggiungere protocollo esatto, modello osservato, parametri, assenza di seed, emendamenti di endpoint/provider e archivio per item della nuova campagna; indicare quali metadati storici mancano.
2. Ridimensionare la separazione PHQ basata sulla singola soglia e distinguere il controllo dei sintomi depressivi dalla coerenza di un profilo centrato sul binge eating.
3. Inserire il nuovo confronto come verifica tecnica di continuità della versione corretta, riportandone anche fallimenti, limiti e risultato della baseline.
4. Qualificare il corpus misstep come saturo e la precisione come interna a quel corpus; dichiarare che l'efficacia dell'accecamento non è stata misurata.

Le modifiche software riguardano provider, memoria, propagazione degli errori e rate limit condiviso in Agent, due script di test in App e il trasporto OpenRouter della campagna. L’inventario aggiornato è in [COMMIT-NOTES.md](COMMIT-NOTES.md); le patch e le verifiche sono in `runtime/`. Il manoscritto non è stato riscritto e non sono stati eseguiti commit. L'ambiente del test usa Python 3.12 e un overlay SciPy 1.16.3, documentati in [runtime-environment.json](runtime-environment.json).
