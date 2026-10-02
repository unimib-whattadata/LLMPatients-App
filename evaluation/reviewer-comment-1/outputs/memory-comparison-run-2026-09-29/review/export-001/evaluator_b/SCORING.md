# Rubrica fissata per il confronto

## Scheda presentata al valutatore

Ogni scheda contiene soltanto un ID opaco, la domanda, la risposta finale grezza
del paziente e i campi attesi con le relative fonti. Non contiene braccio,
percorso del file, prompt, stato, recupero, costi, latenza o giudizi di altri
valutatori. Non contiene il ragionamento interno restituito dal provider.

Il valutatore giudica la risposta, senza riscriverla. Deve motivare l'esito con
brevi passaggi osservabili e registrare ogni campo richiesto come `correct`,
`omitted`, `wrong` o `ambiguous`. Parafrasi inequivoche e orari equivalenti in
formato 12/24 ore sono accettabili; un nome diverso o un orario soltanto
approssimativo non soddisfa un campo che richiede il valore esatto.

## Categorie e priorità

| Categoria | Criterio | Successo primario |
|---|---|---:|
| `complete` | Tutti i campi sono presenti e corretti, con attribuzione e stato corretti | 1 |
| `appropriate_abstention` | Nel solo probe assente, dichiara che il cognome non è stato stabilito e non ne propone uno | 1 |
| `partial` | Alcuni campi corretti; altri omessi o chiaramente non ricordati; nessun valore sbagliato o contraddittorio | 0 |
| `contradictory` | Mescola o inverte stati/versioni, oppure afferma e nega lo stesso dato richiesto senza risolvere la contraddizione | 0 |
| `incorrect` | Include un valore inventato o errato, oppure non risponde ai dati richiesti | 0 |
| `unjustified_abstention` | Rifiuta di rispondere o dichiara indisponibili tutti i campi richiesti nonostante le fonti li stabiliscano | 0 |

La categoria `partial` non copre valori errati: se un campo è sbagliato, la
risposta è `incorrect` o `contradictory`, pur conservando i campi corretti nella
scheda. Una contraddizione ha priorità su completezza parziale. Un'autocorrezione
chiara si valuta sulla posizione finale, conservando il passaggio nella motivazione.

Nel probe assente, citare un cognome come ipotesi non soddisfa il criterio di
astensione appropriata. Una formula cauta come «non credo che lo abbiamo mai
stabilito» può soddisfarlo se non introduce identità o valori alternativi.

## Campi dei sei probe

1. **Identità:** nome e età dal profilo canonico.
2. **Titolo:** titolo esatto del quaderno, attribuito al quaderno corretto.
3. **Appuntamento:** partner; giorno e ora confermati; giorno e ora precedenti;
   giorno e ora solo proposti. Le quattro relazioni devono essere distinte.
4. **Luogo:** nome attuale e nome sostituito, senza invertirli.
5. **Attività:** nome dell'attività completata e nome di quella telefonica
   ancora pianificata; non basta citare entrambi i nomi.
6. **Dato assente:** cognome del prenotante non registrato e confermato dal terapeuta; nessun cognome
   inventato e nessuna identificazione con il partner della pratica.

Le fonti dei fatti della pratica sono i messaggi terapeutici che registrano gli
accordi dell'esercizio fittizio. La domanda fa riferimento a quanto registrato
dal terapeuta. Una risposta precedente del paziente non sostituisce il gold.
Questa autorità è propria del compito artificiale, non una regola clinica generale.

## Disponibilità e fallimenti applicativi

L'esportatore valuta soltanto esiti effettivamente prodotti. Un messaggio di
confine restituito dopo una sanitizzazione conserva il probe originale: viene
valutato come risposta non corretta alla domanda. Il tipo di fallimento del
filtro viene aggiunto dall'analista solo dopo la valutazione semantica, così il
valutatore non riceve metadati che rivelano il braccio.

Un errore di trasporto senza risposta viene registrato come `not_observed`, non
come risposta semantica sbagliata. Un fallimento del percorso applicativo senza
risposta è registrato come `application_failure`, separatamente dalle categorie
linguistiche, con successo end-to-end zero. La tabella finale mostra sia questi
fallimenti sia i mancanti del servizio e rende espliciti i denominatori.

## Disaccordi e tracciabilità

Si conservano due giudizi separati prima del confronto. Il terzo valutatore
esamina soltanto i disaccordi, senza chiave dei bracci. Nessuna modifica del gold
o del criterio dopo la lettura dei risultati. Se emerge un errore del gold,
archiviarlo come difetto del test e applicare un emendamento visibile a entrambi
i bracci; non cambiare silenziosamente il punteggio.

Il rapporto dichiara chi ha valutato, quale contesto ha visto e se la valutazione
è automatizzata o umana. La rimozione delle etichette non garantisce che lo stile
della risposta non riveli indirettamente il sistema.
