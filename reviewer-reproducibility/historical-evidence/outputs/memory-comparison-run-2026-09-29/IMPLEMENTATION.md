# Confronto della continuità su 11 sessioni: implementazione

## Material Passport

- Materiale di riferimento: protocollo e rubriche congelati in `../memory-comparison-plan-2026-09-28/`.
- Questa directory contiene il runner sperimentale e i suoi controlli offline.
- Le risposte delle fixture verificano il codice: non sono risultati di Gemini né misure di accuratezza.
- Il confronto previsto riguarda due pacchetti applicativi, con 5 profili × 3 ripetizioni × 2 sistemi, 330 esecuzioni di sessione e 180 probe.
- Le evidenze precedenti e il loro punteggio parziale restano conservati nelle rispettive directory.

## Che cosa esegue il runner

`paired_runner.py live` legge l'ordine già fissato dal piano. Ogni sessione parte in
un processo nuovo. Ogni combinazione di profilo, ripetizione e sistema ha un
registro integrale, una directory e identificatori propri. Prima di riaprire la
sessione il runner confronta i testi e i conteggi dei registri, verifica gli hash
dello stato chiuso e controlla la continuità del numero di turni.

Il sistema strutturato usa il grafo, le fonti originali, il recupero, la
consolidazione e la finalizzazione del runtime congelato. L'adapter del prompt
viene installato **prima** della compilazione del grafo. Sostituisce le sezioni
cliniche selettive con il profilo comune completo. Gli argomenti e le emozioni
dinamiche sono etichettati separatamente come stato. Le memorie conservano i
limiti nativi: evidenze 1.800, episodi 700 e storia recente 1.800 token stimati;
sintesi 900 caratteri con soglia 1.200 e riflessione 600 caratteri, inclusa la
semantica nativa delle ellissi.

La baseline usa lo stesso profilo e le stesse istruzioni, più tutti i propri
scambi precedenti. Rilegge il registro completo anche oltre cinque turni. Non
invoca classificazione, recupero, estrazione o sintesi. La chiusura attesta
soltanto la conservazione del dialogo. Il filtro deterministico dell'input e la
normalizzazione del testo restituito sono le stesse funzioni native nei due
bracci. I restanti componenti del grafo sono differenze dichiarate del pacchetto.

Il renderer non riceve gold. I materiali di generazione passati ai worker sono
in `generation/`: profili, domande e configurazioni prive di risposte attese. I
worker accedono inoltre al sorgente congelato e allo stato della propria traiettoria. Gli
hash del piano vengono controllati dal controller. Le risposte prodotte da un
sistema non vengono passate all'altro. Il registro `accepted-turns.jsonl`
include anche risposte sbagliate, parziali o alterate dal filtro: `accepted`
significa salvata, non corretta.

## Identificatori e provenienza

I byte dei cinque YAML restano identici agli input congelati. In particolare
`jason_smith_001` è la chiave del file nel piano; gli identificatori archiviati
sono `Jason_001`. Il resolver nativo riceve quest'ultimo e carica una copia
identica chiamata `Jason_001.yaml`. La mappatura è esplicita in
`generation/routing.json` e `input-provenance.json`.

Il codice nativo deriva da `../memory-integration-fix-2026-09-28/integration/source/`.
La correzione già verificata del falso positivo `call` dentro `recall` è presente
dal primo turno. Il file `transport.diff` documenta il passaggio a
`allow_fallbacks=false`; il trasporto precedente resta invariato.

## Impostazioni e arresto

| Voce | Valore |
|---|---|
| Provider e modello richiesto | OpenRouter, `google/gemini-2.5-pro` |
| Temperatura paziente / classificazione / memoria | 0,7 / 0 / 0,2 |
| Output paziente / classificazione / memoria | 4.096 / 4.096 / 8.192 |
| Top-p e thinking budget | 0,95 e 1.024 |
| Stop | `\nTherapist:` e `Therapist:` |
| Seed del provider / top-k inoltrato | nessuno / nessuno |
| Routing | `require_parameters=true`, `allow_fallbacks=false` |
| Chiamate | mutex globale, minimo 5 secondi fra gli inizi |
| Timeout HTTP / processo di sessione | 120 / 1.200 secondi |
| Tetto comune del prompt completo | 64.000 token stimati localmente |

Lo stimatore dell'intero prompt è `max(1, ceil(byte_UTF8 / 3))`. È un'euristica
locale, non il tokenizer del provider né un limite superiore garantito. Un
superamento ferma tutto il confronto senza troncare la baseline. I contatori
nativi delle sottosezioni restano quelli del codice congelato.

Ogni richiesta salva un intento prima dell'invio. Il gate conserva il blocco
durante richiesta, validazione e scrittura dell'esito. Una richiesta interrotta
lascia un marcatore persistente di esito incerto. Il primo errore di servizio,
rate limit, trasporto, risposta vuota o completamento non valido ferma l'intera
matrice. Nessun probe di disponibilità o retry automatico viene avviato. È
ammesso soltanto un tentativo aggiuntivo 4.096→8.192 dopo `MAX_TOKENS` esplicito.

Una seconda esecuzione sullo stesso output è rifiutata, anche se il processo
precedente si è interrotto. La ripresa richiede l'istruzione successiva
dell'utente e la riconciliazione documentata dei registri. Un cambiamento del
codice dopo il lancio richiede un emendamento separato. Il controller non
rigenera mai una risposta per migliorarla.

## Verifica ed esecuzione

Con il Python disponibile nel workspace:

```sh
python3 prepare_execution.py prepare
python3 offline_checks.py
python3 prepare_execution.py freeze
python3 paired_runner.py verify
python3 paired_runner.py live
```

La preparazione e i test offline non leggono credenziali reali. Il runner
seleziona per i worker il Python e le dipendenze nativi dichiarati nel codice.
Il trasporto legge la chiave soltanto quando viene effettivamente invocato.
La verifica offline blocca le connessioni e sostituisce le risposte HTTP con
fixture esplicite, mantenendo il grafo e i registri reali.

`offline-checks/results.json` contiene conteggi, esiti, log e hash del codice
verificato. Il freeze è rifiutato se un file cambia dopo il controllo. Il
manifest di esecuzione comprende sorgente, adapter, trasporto, configurazioni,
test e specifiche. `paired_runner.py status` legge i registri senza chiamate
remote: distingue sessioni completate, probe osservati ed errori di servizio.

## Valutazione e limiti

`export_review.py` prepara due copie identiche delle schede con ID opachi.
Domanda, risposta visibile originale e fonti restano disponibili; mapping dei
bracci, prompt, ragionamento, costo e flag applicativi restano fuori dalle
directory dei valutatori. Vedi `EXPORT_INTERFACE.md`. L'esportatore non assegna
punteggi. Servono valutazioni in contesti separati e l'eventuale adjudication
prevista dal protocollo. La rimozione dei metadati non garantisce una cecità
perfetta e non equivale a una valutazione clinica indipendente.

Il confronto comprende uno scenario già conosciuto e sessioni brevi. Non è un
test su dati mai visti, non stima efficacia clinica e non dimostra in anticipo
un vantaggio della memoria strutturata. Le risposte mancanti per indisponibilità
restano distinte dagli errori di contenuto. I risultati andranno riportati con
le rubriche e i limiti per dati mancanti del piano, mantenendo tutti i sei probe
previsti per traiettoria.
