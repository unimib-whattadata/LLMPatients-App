# Preparazione del confronto sulle undici sessioni

## Risultato dell'audit

**I due orari omessi erano stati conservati e recuperati correttamente.**
17:45 e 09:30 compaiono nel prompt realmente inviato a OpenRouter; sono assenti
sia nella risposta grezza sia in quella restituita dall'API. Il completamento
termina normalmente con STOP. Il risultato originale resta parziale: il dato
disponibile non è stato riportato integralmente nella risposta.

La traccia non identifica il motivo dell'omissione. L'audit registra anche che
l'appuntamento precedente e quello attuale sono marcati entrambi `current`
entro chiavi di entità diverse; la cronologia e le citazioni rimangono disponibili.

Sono stati verificati i 90 file dello snapshot conclusivo senza modificarli.
Nessuna risposta è stata rigenerata e nessuna chiamata al modello è servita
per questa analisi.

[Evidenze dell'audit](audit/REPORT.md) · [Dati e hash](audit/omission-evidence.json)

## Protocollo preparato

[PROTOCOL.md](PROTOCOL.md) definisce **5 profili × 3 ripetizioni × 2 bracci**:
30 traiettorie, 330 sessioni, 1.650 scambi generati e 180 risposte ai probe.

- Blocco clinico completo identico e istruzioni comuni nei due prompt.
- Sistema strutturato con grafo e memoria nativi e un renderer sperimentale
  dichiarato; baseline narrativa con tutta la propria cronologia.
- Fatti introdotti dal terapeuta e risposte paziente realmente generate,
  senza riusare le risposte prefissate del benchmark dei componenti.
- Domande che chiedono esplicitamente tutti i campi, gold separato e
  [rubrica fissata](SCORING.md).
- Valutazione in contesti separati con etichette dei bracci nascoste,
  dichiarata come automatizzata quando svolta da Codex.
- Dati mancanti, errori, omissioni e costi riportati separatamente; nessuna
  superiorità presupposta e nessuna rigenerazione per migliorare i punteggi.

Il campione è una scelta pratica per una verifica descrittiva. Profili e
copione sono conosciuti e non costituiscono una validazione clinica indipendente.
La baseline completa resta inclusa anche se ottiene un risultato migliore.

## Materiali generati e verificati

**6/6 controlli offline superati**, con connessioni di rete bloccate.

- 592 valori clinici preservati, compresi 30 null; 40 esclusioni dichiarate.
- Cinque copioni da 55 turni e sei probe, con gold separato.
- Matrice da 30 traiettorie e calendario di 330 esecuzioni di sessione.
- Blocco clinico e istruzioni identici nei due template.
- Helper della baseline verificato su 17 turni di prova, senza limite agli
  ultimi cinque e con rifiuto dei turni appartenenti all'altro braccio.
- Hash dei sette input originali invariati.

| Materiale | File |
|---|---|
| Profili comuni e inventario dei valori | `design/profiles/`, `design/profile-manifest.json` |
| Copioni e risposte attese | `design/scenarios/`, `design/gold/` |
| Matrice e ordine | `design/run-matrix.json`, `design/schedule.json` |
| Istruzioni e helper dei prompt | `design/COMMON_INSTRUCTIONS.txt`, `design/prompt_contract.py` |
| Generatore riproducibile | `design/build_design.py` |
| Esito dei controlli | `design/check.json`, `design/offline-checks.log` |
| Comando con le dipendenze locali | `design/README.md` |

Le verifiche del template riguardano il codice di preparazione. La presenza
identica del blocco clinico nei futuri request body deve ancora essere verificata
nel runner. Il manifest del pacchetto conserva questa distinzione.

## Stato e passaggio successivo

Questo pacchetto prepara l'analisi, il disegno e i materiali. **Le 30 traiettorie
non sono state eseguite.** Il runner appaiato e l'adapter del prompt comune
devono essere implementati, verificati offline e congelati prima dell'avvio.
I controlli sui materiali in `design/` non sostituiscono quelli del futuro runner.

Il carico previsto è circa 3.135 richieste prima di eventuali recuperi:
almeno 4 ore e 21 minuti per il solo intervallo minimo di cinque secondi, cui
si aggiungono le attese del modello e l'inizializzazione. Costi e durata reali
vanno misurati; i numeri precedenti non sono un preventivo della nuova matrice.

Rimane valida l'istruzione di fermare tutte le chiamate al primo nuovo errore
del servizio, senza retry automatici di disponibilità.

## Riprodurre l'audit senza rete

```sh
python3 outputs/memory-comparison-plan-2026-09-28/audit/audit_omissions.py
```

Il comando legge i log conservati e scrive solo i derivati nella propria
cartella `audit/`. Non importa il grafo, il trasporto o le credenziali.
Gli hash dei derivati cambiano se si rigenera la data del rapporto; i dati
originali restano immutati.
