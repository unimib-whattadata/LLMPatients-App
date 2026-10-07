# Memoria dei fatti: implementazione e verifica

## Material Passport

- Origin skill: ARS-Codex / experiment-agent, run + validate.
- Task: modifica del sistema di memoria e test autorizzati dall'utente.
- Dati: dialoghi e profili sintetici.
- Stato iniziale: protocollo diagnostico, nessuna prestazione del modello ancora osservata.

## Ambito

1. Test offline: persistenza, isolamento, fonti letterali, versioni, proposte, errori, budget, integrazione nel prompt e regressioni del provider.
2. Replay dei dialoghi già archiviati: solo disponibilità delle evidenze nel contesto recuperato. I valori attesi vengono letti dopo il recupero. Non è una nuova misura di accuratezza del paziente simulato.
3. Verifica reale circoscritta: caso sintetico con nomi diversi dal benchmark, chiusura/riapertura della memoria e domande su aggiornamenti, fatti lontani e informazioni mai fornite. Gemini 2.5 Pro tramite OpenRouter, temperatura 0 per estrazione e 0,7 per risposta; top-p 0,95; budget iniziale 4096, recupero massimo 8192; nessun seed API. Una richiesta alla volta, intervallo minimo 5 secondi. Arresto al primo errore di disponibilità del servizio, senza ripartenza automatica.

I risultati del confronto longitudinale precedente rimangono identificati dalla loro versione. Questa verifica tecnica non sostituisce un confronto completo ripetuto né dimostra validità clinica o superiorità architetturale. Le fixture già esaminate sono regressioni di sviluppo; il caso sintetico usa contenuti diversi ma non è un test indipendente in cieco.

## Correzione delle impostazioni durante lo sviluppo

Il tentativo `live-v1` ha prodotto riflessione e riassunto, ma l'estrazione a temperatura 0 ha esaurito sia 4096 sia 8192 token (`MAX_TOKENS`, HTTP 200). Nessuna estrazione incompleta è stata accettata. Per `live-v2` l'estrazione usa temperatura 0,2 e 8192 token fin dall'inizio; risposte e riassunti mantengono le impostazioni sopra. Le configurazioni effettivamente inviate e gli esiti di entrambi i tentativi restano archiviati. Questo adattamento riguarda il funzionamento tecnico e non costituisce una valutazione indipendente del modello.

Anche `live-v2` ha esaurito il budget di estrazione (7861 token di ragionamento su 8188 token di completamento). Per `live-v3` il codice applica un budget esplicito di 1024 token al ragionamento della sola estrazione, mantenendo 8192 token di completamento e temperatura 0,2. Il trasporto diagnostico è una copia separata con mapping `thinking_config.thinking_budget` → `reasoning.max_tokens`, verificato anche offline; quello del confronto precedente resta congelato.

## Arresto del test remoto

`live-v3` ha completato le due sessioni (sei chiamate valide), poi OpenRouter ha restituito `finish_reason=error`, errore upstream 504, alla prima domanda finale. Il test remoto si è arrestato e non è stato riavviato. Nessuna delle sei risposte finali è valutabile. L'ispezione dei dati completati ha motivato tre correzioni locali: controllare anche la punteggiatura della frase sorgente per citazioni corte; riutilizzare una chiave name/title univoca in una rinomina esplicita; conservare insieme più qualificatori contemporanei della stessa sorgente. Queste correzioni successive sono verificate esclusivamente offline, anche usando le estrazioni archiviate, e non vengono presentate come nuove inferenze.

## Ripresa autorizzata dall'utente

Dopo l'istruzione «Procedi», `resume_memory_probe.py` esegue le sole sei domande
rimaste. `recall-resume-1/` contiene una copia delle fonti e dei fatti già
validati, insieme alle quattro sintesi narrative già generate. I sei testi
originali sono confrontati con l'archivio e i file sorgente verificati tramite
hash. Non vengono rigenerate le sessioni né le estrazioni.

Le domande e il controllo automatico delle risposte restano quelli prestabiliti
in `live_memory_smoke.py`; i valori attesi non sono forniti al modello. La memoria
non viene aggiornata con le risposte alle domande, così ogni domanda interroga lo
stesso stato salvato. Le risposte completate, comprese quelle eventualmente
errate, sono salvate e non vengono ripetute. La lettura finale delle risposte
controlla anche eventuali contraddizioni che la sola presenza di una stringa non
rileverebbe. Modello e impostazioni di risposta restano invariati. Arresto al
primo errore di disponibilità, timeout complessivo 900 secondi.
