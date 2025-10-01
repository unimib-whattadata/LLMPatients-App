# Patient Response Generator

## Overview

Il **Patient Response Generator** è un servizio che gestisce la generazione delle risposte dei pazienti virtuali durante le sessioni terapeutiche. Il servizio è progettato per essere modulare e supportare sia risposte predefinite che l'integrazione futura con modelli AI esterni.

## Architettura

### Interfacce Principali

#### `PatientResponse`
```typescript
interface PatientResponse {
  message: string;                    // Il contenuto della risposta del paziente
  emotion: PatientEmotion;           // L'emozione associata alla risposta
  timestamp?: Date;                  // Timestamp della risposta (opzionale per risposte predefinite)
}
```

#### `GenerateResponseInput`
```typescript
interface GenerateResponseInput {
  patientName: string;               // Nome del paziente (es. "John", "Juanita Delgado", "Todd")
  userMessage: string;               // Messaggio dell'utente/terapeuta
  stepId: number;                    // ID del passo della sessione terapeutica
  conversationHistory?: Array<{      // Storia della conversazione (opzionale)
    content: string;
    sender: "user" | "patient";
    timestamp: Date;
  }>;
}
```

## Cosa Ritorna

### Struttura della Risposta

Il servizio restituisce sempre un oggetto `PatientResponse` con la seguente struttura:

```typescript
{
  message: "Capisco la sua preoccupazione. È difficile gestire tutto questo stress...",
  emotion: "sadness",
  timestamp: new Date("2024-01-15T10:30:00.000Z")
}
```

### Emozioni Supportate

Il campo `emotion` può assumere uno dei seguenti valori:

- **`"sadness"`** - Tristezza, malinconia, depressione
- **`"anger"`** - Rabbia, frustrazione, irritazione
- **`"anticipation"`** - Ansia, preoccupazione, attesa nervosa
- **`"trust"`** - Fiducia, apertura, conforto
- **`"surprise"`** - Sorpresa, scoperta, realizzazione
- **`"disgust"`** - Disgusto, repulsione, rifiuto
- **`"joy"`** - Gioia, sollievo, positività
- **`"base"`** - Neutro, calmo, equilibrato

### Risposte per Paziente

#### John
- **Profilo**: Uomo di mezza età con problemi di stress e depressione
- **Temi**: Lavoro, famiglia, autostima, farmaci
- **Emozioni prevalenti**: `sadness`, `anticipation`, `trust`

**Esempi di risposte:**
```typescript
{
  message: "Capisco la sua preoccupazione. È difficile gestire tutto questo stress...",
  emotion: "sadness"
}
{
  message: "Lei ha ragione, dovrei essere più proattivo. Ma a volte mi sento sopraffatto.",
  emotion: "anticipation"
}
{
  message: "Grazie per il suo supporto. Mi aiuta sapere che non sono solo in questo.",
  emotion: "trust"
}
```

#### Juanita Delgado
- **Profilo**: Donna con problemi di rabbia e isolamento
- **Temi**: Relazioni, controllo, autostima, solitudine
- **Emozioni prevalenti**: `anger`, `base`, `trust`

**Esempi di risposte:**
```typescript
{
  message: "A volte mi sento così arrabbiata con tutto. Non so come gestire questa rabbia.",
  emotion: "anger"
}
{
  message: "Lei sembra capire. È raro trovare qualcuno che non mi giudichi.",
  emotion: "trust"
}
{
  message: "Non so se ha senso parlare di questo. Ma forse... forse può aiutare.",
  emotion: "base"
}
```

#### Todd
- **Profilo**: Uomo giovane con ansia e fobie
- **Temi**: Ansia, famiglia, sicurezza, isolamento
- **Emozioni prevalenti**: `anticipation`, `sadness`, `trust`

**Esempi di risposte:**
```typescript
{
  message: "Mi dispiace, è difficile per me parlare di queste cose. Mi sento così ansioso...",
  emotion: "anticipation"
}
{
  message: "Dopo che papà è morto, tutto è cambiato. Non sono mai più riuscito a sentirmi sicuro.",
  emotion: "sadness"
}
{
  message: "Quando lei mi fa queste domande, mi sento meno solo. È confortante.",
  emotion: "trust"
}
```

## Selezione Contestuale

Il servizio utilizza un sistema di selezione contestuale che analizza:

### Parole Chiave Analizzate

- **Famiglia**: `famiglia`, `moglie`, `familiare`, `papà`
- **Lavoro**: `lavoro`, `ufficio`, `competente`
- **Ansia**: `ansia`, `paura`, `nervoso`, `battito`
- **Rabbia**: `rabbia`, `arrabbiato`, `frustrato`
- **Speranza**: `speranza`, `migliorare`, `aiuto`

### Logica di Selezione

1. **Analisi del messaggio utente**: Cerca parole chiave specifiche
2. **Filtro delle risposte**: Seleziona risposte pertinenti al contesto
3. **Selezione casuale**: Sceglie una risposta dal set filtrato
4. **Fallback**: Se nessuna risposta contestuale, usa tutte le risposte disponibili

## Gestione degli Errori

### Fallback Automatico

Se si verifica un errore durante la generazione della risposta:

```typescript
{
  message: "Mi dispiace, non sono sicuro di come rispondere. Puoi ripetere?",
  emotion: "base",
  timestamp: new Date()
}
```

### Risposte di Default

Per pazienti non riconosciuti:

```typescript
{
  message: "Interessante. Puoi elaborare ulteriormente?",
  emotion: "base",
  timestamp: new Date()
}
```

## Integrazione con AI Esterna

### Architettura Modulare

Il servizio supporta l'integrazione futura con modelli AI esterni attraverso l'interfaccia `ExternalAIService`:

```typescript
interface ExternalAIService {
  generateResponse(input: GenerateResponseInput): Promise<PatientResponse>;
}
```

### Configurazione

```typescript
// Abilitare AI esterna
patientResponseGenerator.setUseExternalAI(true);

// Impostare servizio AI personalizzato
patientResponseGenerator.setExternalAI(new CustomAIService());
```

## Utilizzo

### Chiamata API tRPC

```typescript
const response = await api.chat.generatePatientResponse.mutate({
  patientName: "John",
  userMessage: "Come ti senti oggi?",
  stepId: 1,
  conversationHistory: [
    {
      content: "Ciao John, come stai?",
      sender: "user",
      timestamp: new Date()
    }
  ]
});
```

### Risposta Attesa

```typescript
{
  message: "Oggi è un giorno difficile. Mi sento sopraffatto da tutto quello che devo fare.",
  emotion: "sadness",
  timestamp: new Date("2024-01-15T10:30:00.000Z")
}
```

## Performance

- **Delay simulato**: 1.5-3.5 secondi per simulare elaborazione AI
- **Caching**: Le risposte predefinite sono caricate in memoria
- **Fallback veloce**: Risposta immediata in caso di errore

## Estensibilità

### Aggiungere Nuovi Pazienti

1. Aggiungere il paziente a `ENHANCED_PATIENT_RESPONSES`
2. Definire risposte appropriate per il profilo psicologico
3. Il sistema gestirà automaticamente la selezione contestuale

### Personalizzare Selezione Contestuale

Modificare la funzione `selectContextualResponse` per:
- Aggiungere nuove parole chiave
- Implementare logica di selezione più sofisticata
- Integrare con analisi del sentiment

## Note Tecniche

- **Thread-safe**: Il servizio è progettato per essere utilizzato in ambiente multi-thread
- **Memory efficient**: Le risposte predefinite sono caricate una sola volta
- **Type-safe**: Tutti i tipi sono definiti con TypeScript per sicurezza del tipo
- **Error resilient**: Gestione robusta degli errori con fallback automatico
