# 🎨 Sistema di Colori Centralizzato

## Panoramica

Questo documento descrive il sistema di colori centralizzato implementato nel progetto ePatient. Tutti i colori sono ora gestiti attraverso variabili CSS per garantire consistenza e facilità di manutenzione.

## 📁 Struttura dei File

### `src/styles/colors.css`
- **Variabili CSS principali** con prefisso `--color-`
- **Palette di colori** per avatar, timeline, fasi terapeutiche
- **Colori semantici** per success, warning, error, info
- **Colori per ruoli** admin e user

### `src/styles/components.css`
- **Classi Tailwind utility** per i colori centralizzati
- **Componenti CSS** che utilizzano le variabili colore
- **Sistema di pill** e bottoni con colori standardizzati

## 🎯 Categorie di Colori

### 1. **Colori Avatar**
```css
--color-avatar-pink: #E91E63
--color-avatar-purple: #9C27B0
--color-avatar-blue: #2196F3
/* ... altri colori avatar */
```

**Classi Tailwind:**
```html
<div class="bg-avatar-pink">Pink Avatar</div>
<div class="bg-avatar-blue">Blue Avatar</div>
```

### 2. **Colori Timeline**
```css
--color-timeline-knowledge: #B9C87C    /* Fase Conoscenza */
--color-timeline-intervention: #E3B23C /* Fase Intervento */
--color-timeline-conclusion: #B4A7E6   /* Fase Conclusione */
```

**Classi Tailwind:**
```html
<div class="bg-timeline-knowledge">Knowledge Phase</div>
<div class="bg-timeline-intervention">Intervention Phase</div>
```

### 3. **Colori Fasi Terapeutiche**
```css
/* Fase Conoscenza */
--color-phase-knowledge-bg: #1a2720
--color-phase-knowledge-text: #E8F4E3
--color-phase-knowledge-accent: #9BD0A8

/* Fase Intervento */
--color-phase-intervention-bg: #2a1f0f
--color-phase-intervention-text: #FFF4E6
--color-phase-intervention-accent: #E3B23C

/* Fase Conclusione */
--color-phase-conclusion-bg: #2a2548
--color-phase-conclusion-text: #EEE9FF
--color-phase-conclusion-accent: #B8A7F4
```

**Classi Tailwind:**
```html
<div class="bg-phase-knowledge text-phase-knowledge">
  Knowledge Phase Content
</div>
```

### 4. **Colori Semantici**
```css
--color-success-500: #22C55E
--color-warning-500: #F59E0B
--color-error-500: #EF4444
--color-info-500: #3B82F6
```

### 5. **Colori Focus e Interazione**
```css
--color-focus-blue: #3b82f6
--color-focus-green: #059669
--color-focus-primary: #4F9D69
```

**Classi Tailwind:**
```html
<button class="focus:ring-2 focus:ring-blue focus:outline-none">
  Focus Button
</button>
```

## 🚀 Come Utilizzare

### 1. **In CSS**
```css
.my-component {
  background-color: var(--color-primary-500);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}
```

### 2. **In React (Inline Styles)**
```tsx
<div style={{
  backgroundColor: "var(--color-avatar-blue)",
  color: "var(--text-primary)"
}}>
  Content
</div>
```

### 3. **Con Classi Tailwind**
```html
<div class="bg-avatar-blue text-primary">
  Avatar Content
</div>
```

### 4. **In JavaScript/TypeScript**
```typescript
const avatarColors = [
  "var(--color-avatar-pink)",
  "var(--color-avatar-purple)",
  "var(--color-avatar-blue)"
];
```

## 📋 Best Practices

### ✅ **Da Fare**
- Utilizzare sempre le variabili CSS invece di colori hardcoded
- Preferire le classi Tailwind utility quando possibile
- Utilizzare i colori semantici per stati (success, error, warning)
- Mantenere la consistenza con il sistema di design

### ❌ **Da Evitare**
- Non utilizzare colori hex diretti (`#FF0000`)
- Non creare nuove variabili senza aggiungerle a `colors.css`
- Non mescolare sistemi di colori diversi
- Non ignorare l'accessibilità dei colori

## 🔧 Manutenzione

### Aggiungere Nuovi Colori
1. Aggiungere la variabile CSS in `colors.css`
2. Creare le classi Tailwind utility in `components.css`
3. Documentare il nuovo colore in questo file
4. Aggiornare i componenti che lo utilizzano

### Modificare Colori Esistenti
1. Modificare solo la variabile CSS in `colors.css`
2. Verificare che tutti i componenti si aggiornino automaticamente
3. Testare l'accessibilità dei nuovi colori

## 🎨 Esempi di Utilizzo

### Avatar Component
```tsx
const avatarStyle = {
  backgroundColor: `var(--color-avatar-${colorName})`,
  color: "white"
};
```

### Timeline Step
```tsx
const stepStyle = {
  backgroundColor: isCompleted 
    ? "var(--color-success-500)" 
    : "var(--color-timeline-knowledge)"
};
```

### Phase Background
```tsx
const phaseStyle = {
  backgroundColor: "var(--color-phase-knowledge-bg)",
  color: "var(--color-phase-knowledge-text)"
};
```

## 📊 Benefici

1. **Consistenza**: Tutti i colori seguono lo stesso sistema
2. **Manutenibilità**: Modifiche centrali si propagano automaticamente
3. **Accessibilità**: Colori testati per contrasto e leggibilità
4. **Performance**: Meno CSS duplicato e migliore caching
5. **Developer Experience**: API chiara e documentata

---

*Ultimo aggiornamento: Dicembre 2024*
