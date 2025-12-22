# Servizi TTS - VibeVoice

Questa cartella contiene i servizi di Text-to-Speech utilizzati nel progetto LLMPatients.

## 🎙️ VibeVoice

VibeVoice è un framework open-source di Microsoft per la sintesi vocale in tempo reale che supporta input di testo in streaming e generazione di discorsi lunghi.

### Requisiti

- Python 3.9 o superiore
- pip
- Virtual environment (venv)

### Setup iniziale

1. **Naviga nella cartella VibeVoice:**
   ```bash
   cd services/VibeVoice
   ```

2. **Crea e attiva il virtual environment (se non esiste già):**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Su macOS/Linux
   # oppure su Windows: venv\Scripts\activate
   ```

3. **Installa le dipendenze:**
   ```bash
   pip install --upgrade pip
   pip install -e .
   ```

   Questo installerà tutte le dipendenze necessarie, inclusi:
   - PyTorch
   - Transformers
   - FastAPI
   - Uvicorn
   - e altre librerie richieste

### Avvio del server

Una volta completato il setup, puoi avviare il server VibeVoice con:

```bash
cd services/VibeVoice
source venv/bin/activate
python demo/vibevoice_realtime_demo.py
```

### Opzioni di avvio

Il server supporta diverse opzioni da riga di comando:

```bash
python demo/vibevoice_realtime_demo.py [opzioni]
```

**Opzioni disponibili:**

- `--port PORT`: Porta su cui avviare il server (default: 3000)
- `--model_path PATH`: Percorso del modello HuggingFace (default: `microsoft/VibeVoice-Realtime-0.5B`)
- `--device DEVICE`: Dispositivo da utilizzare per l'inferenza
  - `cpu`: CPU (default su sistemi senza GPU)
  - `cuda`: GPU NVIDIA (se disponibile)
  - `mps`: Apple Silicon GPU (Mac con chip M1/M2/M3)
  - `mpx`: Alias per `mps`
- `--reload`: Abilita il reload automatico durante lo sviluppo

### Esempi di utilizzo

**Avvio su CPU:**
```bash
python demo/vibevoice_realtime_demo.py --device cpu --port 3000
```

**Avvio su Apple Silicon (M1/M2/M3):**
```bash
python demo/vibevoice_realtime_demo.py --device mps --port 3000
```

**Avvio su GPU NVIDIA:**
```bash
python demo/vibevoice_realtime_demo.py --device cuda --port 3000
```

**Avvio con porta personalizzata:**
```bash
python demo/vibevoice_realtime_demo.py --port 8080
```

### Accesso al servizio

Una volta avviato, il server sarà disponibile su:

- **Web Interface**: http://localhost:3000
- **WebSocket Endpoint**: ws://localhost:3000/stream

### Voci disponibili

Il servizio include diverse voci pre-configurate in `demo/voices/streaming_model/`:

- **Inglese**: Carter, Davis, Emma, Frank, Grace, Mike, Samuel
- **Multilingue**: Voci per DE, FR, IT, JP, KR, NL, PL, PT, ES

### Note importanti

1. **Primo avvio**: Al primo avvio, il modello verrà scaricato automaticamente da HuggingFace. Questo può richiedere alcuni minuti e spazio su disco (~1-2 GB).

2. **Memoria**: Il modello richiede almeno 4-8 GB di RAM disponibile.

3. **Dispositivi**:
   - Su macOS con Apple Silicon, usa `--device mps` per migliori prestazioni
   - Su sistemi senza GPU, usa `--device cpu` (più lento ma funziona)

4. **Warning**: Potresti vedere alcuni warning durante l'avvio (tokenizer, OpenSSL). Non sono critici e non impediscono il funzionamento.

### Troubleshooting

**Problema: "ModuleNotFoundError"**
- Soluzione: Assicurati di aver attivato il virtual environment e installato le dipendenze con `pip install -e .`

**Problema: "Voices directory not found"**
- Soluzione: Verifica che la cartella `demo/voices/streaming_model/` esista e contenga file `.pt`

**Problema: Server non si avvia**
- Soluzione: Controlla che la porta non sia già in uso. Prova con una porta diversa usando `--port`

### Documentazione aggiuntiva

Per maggiori informazioni su VibeVoice, consulta:
- [Repository originale](https://github.com/microsoft/VibeVoice)
- [Documentazione tecnica](https://microsoft.github.io/VibeVoice)
- [HuggingFace Collection](https://huggingface.co/collections/microsoft/vibevoice-68a2ef24a875c44be47b034f)

