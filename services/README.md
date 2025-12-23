## TTS Services – VibeVoice

This directory contains the Text-to-Speech services used by the **LLMPatients** project, in particular the local **VibeVoice** server.

### 🎙️ VibeVoice overview

VibeVoice is an open-source framework by Microsoft for real-time speech synthesis.
In LLMPatients, it runs as a **separate Python server**, and the Next.js app connects to it over HTTP/WebSocket through the `VibeVoiceProvider` in TypeScript.

High-level architecture:

- LLMPatients (Next.js) → `VibeVoiceProvider` (`src/lib/tts/providers/vibevoice.ts`)
- WebSocket connection to the VibeVoice Python server (`/stream`)
- The server streams PCM16 audio chunks, which are converted to WAV and returned to the frontend.

---

### Environment configuration (`.env`)

The main environment variables related to TTS/VibeVoice are:

```bash
# TTS provider used by LLMPatients:
#   - "none"
#   - "elevenlabs"
#   - "vibevoice"
TTS_PROVIDER=vibevoice

# Base HTTP URL of the local VibeVoice server.
# The TypeScript provider will convert this to a WebSocket URL internally.
VIBEVOICE_URL=http://localhost:3001

# VibeVoice runtime configuration
# Port and device are configurable and used when starting the Python server
VIBEVOICE_PORT=3001
VIBEVOICE_DEVICE=mps   # cpu | cuda | mps | mpx

# Only required if using ElevenLabs as a provider
# ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

The `VibeVoiceProvider` will:

- Read `VIBEVOICE_URL` from `process.env` / `env`  
- Convert it from HTTP to WebSocket (e.g. `http://localhost:3001` → `ws://localhost:3001/stream`)  
- Connect, send text and voice preset, and collect the streamed audio

So, in practice the **VibeVoice-specific env variables you must set** are:

- `VIBEVOICE_URL` – must match the host and port where the Python server is running  
- `VIBEVOICE_PORT` – the port the Python server listens on  
- `VIBEVOICE_DEVICE` – the device the model uses for inference

Make sure your `.env` is consistent, for example:

```bash
TTS_PROVIDER=vibevoice
VIBEVOICE_URL=http://localhost:3001
VIBEVOICE_PORT=3001
VIBEVOICE_DEVICE=mps
```

---

### Requirements

- Python 3.9 or higher  
- `pip`  
- Virtual environment (`venv`)

---

### Initial setup

From the project root:

```bash
cd services/VibeVoice
```

1. **Create and activate the virtual environment (if it does not exist yet):**

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # macOS / Linux
   # or on Windows:
   # venv\Scripts\activate
   ```

2. **Install dependencies:**

   ```bash
   pip install --upgrade pip
   pip install -e .
   ```

   This will install all required dependencies, including:

   - PyTorch  
   - Transformers  
   - FastAPI  
   - Uvicorn  
   - and other libraries required by VibeVoice

---

### Starting the VibeVoice server

After the setup, start the VibeVoice server with the port and device taken from your environment:

```bash
cd services/VibeVoice
source venv/bin/activate

# Use values from .env (loaded into your shell) for port and device
python demo/vibevoice_realtime_demo.py \
  --port "${VIBEVOICE_PORT:-3001}" \
  --device "${VIBEVOICE_DEVICE:-cpu}"
```

> **Important:**  
> Use a port that does not conflict with Next.js (usually `3000`), for example `3001`.  
> The port used here **must match** the one in `VIBEVOICE_URL` and `VIBEVOICE_PORT`
> (e.g. `VIBEVOICE_URL=http://localhost:3001` and `VIBEVOICE_PORT=3001`).

---

### Run options

The server supports several command-line options:

```bash
python demo/vibevoice_realtime_demo.py [options]
```

**Common options:**

- `--port PORT` – port where the server will listen  
- `--model_path PATH` – HuggingFace model path  
  (default: `microsoft/VibeVoice-Realtime-0.5B`)  
- `--device DEVICE` – device for inference  
  - `cpu` – CPU (default on systems without GPU)  
  - `cuda` – NVIDIA GPU (if available)  
  - `mps` – Apple Silicon GPU (Mac M1/M2/M3)  
  - `mpx` – alias for `mps`  
- `--reload` – enable auto-reload during development

#### Example commands

Run on CPU (overriding env values):

```bash
python demo/vibevoice_realtime_demo.py --device cpu --port 3001
```

Run on Apple Silicon (M1/M2/M3):

```bash
python demo/vibevoice_realtime_demo.py --device mps --port 3001
```

Run on NVIDIA GPU:

```bash
python demo/vibevoice_realtime_demo.py --device cuda --port 3001
```

---

### Service access

Once running, the server is available at:

- **Web interface**: `http://localhost:3001`  
- **WebSocket endpoint**: `ws://localhost:3001/stream`

These values are derived from `VIBEVOICE_URL` in `.env`, so keep them aligned.

---

### Voices

The service ships with several pre-configured voices under `demo/voices/streaming_model/`, including:

- **English**: Carter, Davis, Emma, Frank, Grace, Mike, Samuel  
- **Multilingual**: voices for DE, FR, IT, JP, KR, NL, PL, PT, ES

---

### Notes

1. **First run** – on the first startup, the model is downloaded from HuggingFace.  
   This can take a few minutes and ~1–2 GB of disk space.

2. **Memory** – the model typically needs at least 4–8 GB of available RAM.

3. **Devices** –  
   - On macOS with Apple Silicon, prefer `--device mps` for better performance.  
   - On systems without a GPU, use `--device cpu` (slower but works everywhere).

4. **Warnings** – you may see warnings (tokenizer, OpenSSL, etc.) when starting the server.  
   They are usually non-blocking and do not prevent the server from working.

---

### Troubleshooting

**Issue: `ModuleNotFoundError`**  
- Ensure the virtual environment is activated and dependencies installed with:

  ```bash
  pip install -e .
  ```

**Issue: `Voices directory not found`**  
- Check that `demo/voices/streaming_model/` exists and contains `.pt` files.

**Issue: server does not start**  
- Ensure the chosen port is not already in use.  
- Try a different port and update `VIBEVOICE_URL` in `.env` accordingly.

---

### Additional documentation

For more information about VibeVoice itself:

- Original repository: `https://github.com/microsoft/VibeVoice`  
- Technical docs: `https://microsoft.github.io/VibeVoice`  
- HuggingFace collection: `https://huggingface.co/collections/microsoft/vibevoice-68a2ef24a875c44be47b034f`


