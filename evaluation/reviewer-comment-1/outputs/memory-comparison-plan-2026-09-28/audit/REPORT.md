# Verifica dei due orari omessi

## Material Passport

- Modalità: audit locale dei dati archiviati.
- Verifica: corrispondenza dei byte, delle fonti precedenti e del prompt trasmesso.
- Chiamate al modello: zero. Punteggio originale: invariato (parziale).

## Risultato

**17:45 e 09:30 erano presenti nella memoria e nel prompt effettivamente inviato a OpenRouter.** Mancano sia nella risposta grezza del modello sia in quella restituita dall'API.

| Orario | Fonti precedenti | Memoria fattuale | Evidenza recuperata | Occorrenze nel prompt | Nella risposta |
|---|---|---|---|---:|---|
| 17:45 | presenti | presente | presente | 5 | assente |
| 09:30 | presenti | presente | presente | 4 | assente |

Il modello riporta correttamente Rina Holt e venerdì alle 18:20; distingue il mercoledì precedente dalla proposta del sabato. Omette i due orari esatti. È un'omissione nella risposta: questa traccia non mostra una perdita delle informazioni durante il salvataggio o il recupero.

La risposta termina con `STOP`, con 100 token di testo e 813 token di ragionamento contabilizzati nel log, a fronte di un limite di 4096. Non risulta un'interruzione MAX_TOKENS. Il filtro non ha alterato questo turno. La modifica tipografica dell'API non riguarda gli orari.

## Osservazione aggiuntiva sulle versioni

Nel contesto, l'appuntamento vecchio e quello aggiornato sono entrambi marcati `current=true`, ma con nomi di entità diversi. Il codice calcola la versione corrente all'interno della stessa chiave entità/attributo/parlante/stato; non unifica automaticamente questi due nomi. La cronologia e le citazioni esatte consentono comunque di distinguere i valori. Non è dimostrato che questa marcatura abbia causato l'omissione.

## Tracciabilità

- Record nativo: `b1bf7945-55f4-4310-a1cd-97fba0f577a3`; richiesta `2026-09-28T20:31:44.031894+00:00`.
- Evidenze, fonti, hash e impostazioni: `omission-evidence.json`.
- Prompt realmente trasmesso: `transmitted-prompt.txt`.
- Riproduzione dell'audit: `python3 audit_omissions.py` (nessuna rete).
- Verificati 90 file dello snapshot finale, senza modificarli.

