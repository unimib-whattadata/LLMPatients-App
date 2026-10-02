# Modifica della memoria: risultati dei test

Data: 28 settembre 2026. Codice applicativo: repository `LLMPatients-Agent`.

## Esito

La modifica è implementata. I test offline passano. Dopo l'interruzione per
OpenRouter 504, l'utente ha autorizzato la ripresa delle sole domande finali.
**Le sei verifiche di contenuto fattuale sono completate: 6/6 risposte corrette**,
senza altri errori del servizio. Le sessioni e le estrazioni già completate sono
state riutilizzate, applicando le correzioni locali verificate ai fatti salvati.

| Verifica | Risultato | Cosa dimostra |
|---|---|---|
| Backend: memoria, integrazione, generazione e rate limit | **71/71 PASS** | Comportamento del codice sui casi controllati, senza richieste al provider |
| Trasporto OpenRouter, errori in-band e budget di ragionamento | **26 PASS, 1 escluso** | Mapping delle richieste e rifiuto degli errori con HTTP simulato |
| Recupero sui dialoghi archiviati di cinque traiettorie | **20/20 fatti disponibili nel contesto** | Disponibilità delle fonti selezionate, non accuratezza delle risposte |
| Due sessioni sintetiche con Gemini 2.5 Pro | **6 generazioni complete** | Due riflessioni, due riassunti e due estrazioni valide, salvati e ricaricati tra processi |
| Verifica offline delle due estrazioni salvate sul codice finale | **3/3 controlli PASS** | Rinomina, cambio orario e conservazione di qualificatori simultanei |
| Sei domande finali al paziente simulato | **6/6 corrette** | Richiamo di valori correnti e precedenti, orario, stato della partecipazione e informazione assente, su un caso sintetico |

### Risposte finali

| Domanda | Risultato osservato | Esito |
|---|---|---|
| Nome attuale del diario | `Dawn Register` | Corretto |
| Nome originale del diario | `Harbor Atlas` | Corretto |
| Titolo della scheda separata | `Copper Sparrow` | Corretto |
| Giorno e orario aggiornati | `Friday, 09:40` | Corretto |
| Partecipazione confermata? | Esplicitamente non confermata; nessun impegno a partecipare | Corretto |
| Colore della copertina, mai indicato | Riconosce che non è stato specificato; non inventa un colore | Corretto |

Il controllo automatico e la lettura semantica delle sei risposte concordano.
La lettura è stata svolta dallo stesso assistente, senza cecità né valutatore
indipendente. Le risposte integrali, i prompt e le fonti recuperate sono in
`recall-resume-1/probe.json`. Le sei richieste reali hanno usato il modello e le
impostazioni previsti, con esito `STOP` e nessun tentativo aggiuntivo. La memoria
non è cambiata fra le domande. Durata della ripresa: circa 90 secondi; costo
riportato da OpenRouter: USD 0,09085375 (13.091 token di input e 7.449 di output).

Il punteggio riguarda i fatti. Il modello aggiunge testo conversazionale e
indicazioni fra parentesi anche quando la domanda chiede solo un titolo o un
orario: il formato conciso non è rispettato rigorosamente. La domanda sul colore
chiede esplicitamente di segnalare quando l'informazione manca.

Il test di trasporto escluso richiede una fixture del confronto longitudinale
assente nel percorso relativo della copia diagnostica. Gli altri test includono
il riconoscimento degli errori in-band, compreso il caso HTTP 200 con generazione
fallita.

## Modifiche applicate

1. I turni originali vengono conservati prima della riduzione della finestra di
   conversazione. Ogni fonte ha paziente, terapeuta, sessione, turno e parlante.
2. I fatti sono estratti separatamente dai riassunti, con citazione letterale
   verificata, valore, stato e versioni. Le domande non possono essere promosse a
   fatti; una proposta non basta a dimostrare un accordo o un'attività completata.
3. Le rinomine esplicite riutilizzano una chiave precedente univoca anche se il
   modello passa da `name` a `title`. Più qualificatori dello stesso turno restano
   simultanei: il loro ordine di hash non decide quale conservare.
4. Il recupero cerca fatti e frasi originali con corrispondenza lessicale e
   similarità semantica. Il tema della conversazione non esclude le fonti. Vengono
   cercate anche riflessioni e sintesi precedenti.
5. Il prompt conserva parentesi e citazioni intere, con budget di contesto
   stimati; distingue valori correnti, precedenti e informazioni non disponibili.

File principali:

- `LLMPatients-Agent/agent/core/factual_memory.py`
- `LLMPatients-Agent/agent/core/langgraph_builder.py`
- `LLMPatients-Agent/agent/core/prompt_builder.py`
- `LLMPatients-Agent/agent/core/llm_provider_vertex.py`
- `LLMPatients-Agent/docs/factual-memory.md`

La configurazione generale del provider dell'applicazione non viene migrata da
questo intervento. Le chiamate remote di questa verifica sono tutte tramite
OpenRouter; nessuna è diretta a Vertex.

## Impostazioni e dati del test reale

- Modello: `google/gemini-2.5-pro`, tramite OpenRouter; nessun altro modello.
- Estrazione: temperatura 0,2; massimo 8192 token; budget di ragionamento 1024.
- Riflessioni, riassunti e risposte: temperatura 0,7; 4096 token iniziali, recupero
  a 8192 solo per `MAX_TOKENS`.
- `top_p=0.95`; stop `\nTherapist:` e `Therapist:`; nessun seed API.
- `top_k` e impostazioni di sicurezza Vertex non sono inoltrati da OpenRouter.
- Una richiesta alla volta; intervallo minimo di avvio 5 secondi; nessun retry
  su errore di disponibilità. Timeout HTTP configurato a 120 secondi.
- Encoder locale: `all-MiniLM-L6-v2`, CPU, cache offline.
- Fonti iniziali: sei scambi scritti come fixture; le risposte iniziali del
  paziente sono testo prefissato. Il modello genera realmente i sei artefatti di
  memoria. Le domande finali usano il prompt applicativo e il recupero della
  memoria, ma non eseguono l'intero grafo clinico o il server HTTP.
- Le sessioni e le domande vengono eseguite in processi separati per verificare
  il caricamento da disco. Dopo il 504, un ulteriore processo riprende le sole
  domande, caricando i fatti validati e le sintesi narrative salvate. I PID sono
  nei file di risultato e negli input delle domande.

Le estrazioni hanno prodotto 20 fatti complessivi. Il cambio di orario conserva
`Wednesday at 14:25` come valore precedente e `Friday at 09:40` come corrente.
La verifica offline sul codice finale conserva `Harbor Atlas` come nome
precedente, `Dawn Register` come corrente e mantiene entrambi i qualificatori
`optional` e `unconfirmed` per la partecipazione.

Il controllo del budget segue la documentazione di
[OpenRouter](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
e [Gemini](https://ai.google.dev/gemini-api/docs/thinking): il ragionamento deve
lasciare spazio al contenuto visibile.

## Registro degli esiti di sviluppo

- `replay/`: 1/20 evidenze disponibili. Il ranking penalizzava un intero turno
  assertivo quando terminava con una domanda del terapeuta. Corretto.
- `replay-v2/` e `replay-final/`: 20/20 evidenze disponibili. Solo dialoghi
  archiviati, recupero lessicale e frasi originali; nessun fatto generato dal
  modello e nessuna risposta attesa fornita al recupero. I valori attesi vengono
  caricati dopo la selezione delle fonti.
- `live-v1/`: estrazione incompleta a temperatura zero, sia con 4096 sia con
  8192 token. Test arrestato senza accettare il JSON parziale.
- `live-v2/`: estrazione ancora incompleta con temperatura 0,2 e 8192 token;
  7861 token di ragionamento su 8188 di completamento. Il solo aumento del limite
  non ha risolto il problema.
- `live-v3/`: con ragionamento limitato a 1024 token, entrambe le estrazioni
  completano (`STOP`). La prima domanda finale termina con errore in-band
  OpenRouter upstream 504 dopo circa 130 secondi. Il controller interrompe tutto.
- Dopo la versione usata da `live-v3` sono stati affinati il controllo delle
  domande, l'allineamento delle chiavi nelle rinomine e le versioni simultanee.
  Queste modifiche sono verificate nei test offline e sulle estrazioni complete
  già salvate. Il test remoto è rimasto fermo fino all'autorizzazione dell'utente.
- `recall-resume-1/`: ripresa autorizzata delle sole domande. Sei risposte
  completate, tutte corrette, senza errori o rigenerazioni. Nessuna sessione o
  estrazione è stata ripetuta. Sono stati verificati gli hash del codice, degli
  archivi sorgente e della memoria; le risposte valutate coincidono con quelle
  native di OpenRouter. I risultati del primo arresto rimangono conservati.

## Dove trovare gli artefatti

Tutti i percorsi seguenti sono relativi a
`LLMPatient---APPLICATION/outputs/factual-memory-tests-2026-09-28/`:

| Percorso | Contenuto |
|---|---|
| `unit-integration-final.log` | Esito dei 71 test del backend |
| `transport-tests.log` | Esito dei test del trasporto |
| `replay-final/retrieval-replay.json` | Domande, evidenze, fonti e valutazione di disponibilità |
| `live-v3/manifest.json` | Impostazioni, fixture, domande previste e hash del codice usato |
| `live-v3/api-records.jsonl` | Richieste e risposte native archiviate con redazione delle credenziali |
| `live-v3/one.json`, `live-v3/two.json` | Riflessioni, riassunti e fatti realmente estratti |
| `live-v3/memory/` | Memoria persistita dal test reale |
| `live-v3/status.json`, `live-v3/probe-failure.json` | Arresto e motivo del mancato completamento |
| `live-v3/source/` | Codice della versione usata nelle chiamate reali |
| `saved-extractions-validation/validation.json` | Controlli offline sul codice finale usando le estrazioni salvate |
| `recall-resume-1/manifest.json` | Provenienza della memoria riutilizzata, impostazioni e hash della ripresa |
| `recall-resume-1/probe.json` | Tutte le sei risposte, domande, prompt, evidenze ed esiti |
| `recall-resume-1/api-records.jsonl` | Sei richieste e sei risposte native della ripresa |
| `recall-resume-1/verification.json` | Controlli di provenienza, lettura semantica ed esito 6/6 |
| `recall-resume-1/source/`, `recall-resume-1/memory/` | Codice e memoria usati per le domande |
| `source-final/`, `final-code-manifest.json` | Copia del codice consegnato e hash dei file |
| `live_memory_smoke.py`, `resume_memory_probe.py`, `validate_saved_extractions.py`, `scripts/` | Harness e trasporto diagnostico |

I tentativi falliti restano disponibili. Gli artefatti del confronto longitudinale
pubblicabile non sono stati sovrascritti.

## Limiti e lavoro rimasto

La correzione rende disponibili informazioni che la compressione narrativa
perdeva. **20/20 fonti recuperate non equivale a 20/20 risposte corrette**. Il caso
sintetico è una verifica di sviluppo e non un campione indipendente in cieco.
La validazione letterale verifica la provenienza, mentre attribuzione semantica,
entità e stati richiedono ancora interpretazione del modello; i controlli
linguistici sono conservativi. Archivi grandi, sessioni concorrenti e costi a
regime non sono stati misurati.

Le sei domande completano la verifica tecnica prevista su questo caso. Per
misurare il miglioramento nel quesito del revisore resta da ripetere il confronto
longitudinale completo con la baseline. Il risultato 6/6 non è una stima di
accuratezza generalizzabile, non dimostra superiorità rispetto alla baseline e
non aggiorna i risultati scientifici del paper.

## Material Passport

- Origin skill: ARS-Codex / experiment-agent.
- Autorizzazione: modifica della memoria e test richiesti dall'utente; dati
  simulati; Gemini via OpenRouter.
- Tipo: verifica tecnica descrittiva, senza inferenza clinica o statistica.
- Stato finale: implementazione, test offline e sei domande finali completati;
  ripresa remota effettuata solo dopo autorizzazione dell'utente.
