# LLMPatients-App - Virtual Patients for Psychotherapy Training

**LLMPatients** is an advanced educational platform for training psychotherapy students through realistic simulations with virtual patients powered by LLMs.

![Status](https://img.shields.io/badge/status-beta-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Build](https://img.shields.io/badge/build-passing-green)
![Node](https://img.shields.io/badge/node-18%2B-green)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Demo](#demo)
- [Requirements](#requirements)
- [Installation](#installation)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [FAQ](#faq)
- [Security](#security)
- [License](#license)
- [Credits](#credits)
- [Cite this work](#cite-this-work)

## Overview

**LLMPatients** was created to bridge the gap between theory learned in university courses and real clinical practice. Clinical psychology training often provides few opportunities to practice practical skills in safe contexts before internship.

This platform offers a **hybrid expert system** for multi-session simulation of psychotherapeutic paths. Using Large Language Models (LLMs) constrained by structured clinical profiles (based on the PDM-2 manual), the system allows students to:

- Manage a complete therapeutic journey in **11 sessions** (Intake, Intervention, Termination).
- Face patients with complex personalities, defenses, and realistic relational patterns.
- Receive automatic, step-level feedback on empathy, setting adherence, and clinical missteps after completing each chat step.

The goal is to provide a "safe gym" to make mistakes and learn without risks for real patients.

## Features

- **🧠 Parametric Clinical Profiles**: Patients based on the PDM-2 hierarchy (Personality > Mental Functioning > Symptoms), not simple narrative prompts.
- **📅 Multi-session Continuity**: Long-term memory (RAG) that maintains narrative and clinical coherence across 11 distinct sessions.
- **🗣️ Multimodal Interaction**: Support for text and voice chat (Text-to-Speech with Chatterbox/ElevenLabs and Speech-to-Text).
- **📉 Adaptive Dynamics**: The patient reacts to student interventions (e.g., alliance ruptures, defenses) modifying their emotional state.
- **🧪 Step-Level Misstep Analysis**: Every completed chat step can trigger an automatic misstep report with `Detected/Not detected`, confidence, and transcript evidence for 16 therapist misstep categories.
- **📊 Detailed Reporting**: Analytical dashboards to track progress, view transcripts, export PDFs, and review automatic evaluations.
- **☁️ Optional Vertex AI Judge**: The misstep detector works heuristically by default and can optionally refine results through Vertex AI structured-output judging.
- **🔒 Privacy-First**: Architecture designed for local execution of TTS/STT models and support for local or remote LLMs.

## Demo

> In 10 seconds: The system simulates a therapeutic session via chat or voice, reacting emotionally to the therapist's interventions.

*(Insert Dashboard and Chat Interface Screenshots or GIF here)*

## Requirements

- **Node.js**: v18 or higher.
- **pnpm**: Recommended package manager.
- **Database**: SQLite (default, included) or PostgreSQL (via Docker).
- **Python**: v3.10+ (required only if using local TTS modules like Chatterbox/VibeVoice).
- **External patient service**: Optional remote API credentials if `API=remote`.
- **Vertex AI**: Optional Google Cloud credentials if you want hybrid LLM judging for misstep analysis.

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/unimib-whattadata/LLMPatients-App.git
    cd LLMPatients
    ```

2.  **Install dependencies**:
    ```bash
    pnpm install
    ```

3.  **Configure the environment**:
    Create a `.env` file in the project root and populate it with the variables listed in [Configuration](#configuration).
    ```bash
    touch .env
    ```
    If you prefer, you can also create `.env` manually from scratch.

4.  **Prepare the database** (SQLite):
    ```bash
    pnpm db:push
    pnpm db:seed
    ```

## Quickstart

To start the application in development mode (default SQLite):

```bash
pnpm dev
```

Open your browser at [http://localhost:8080](http://localhost:8080).

## Configuration

Main environment variables in `.env`:

| Variable | Description | Default |
|-----------|-------------|---------|
| `DATABASE_URL` | DB connection string (e.g., `file:./dev.db`) | - |
| `AUTH_SECRET` | Secret for NextAuth (e.g., `openssl rand -base64 32`) | - |
| `NEXTAUTH_SECRET` | Optional explicit NextAuth secret | - |
| `API` | Patient generation mode: `local` or `remote` | `local` |
| `EXTERNAL_AI_API_KEY` | Bearer token used when `API=remote` | - |
| `API_BASE_URL` | Base URL for the external patient/orchestrator service | - |
| `API_INITIALIZE_PATIENT_ENDPOINT` | Remote endpoint for patient initialization | `/patient` or custom |
| `API_CHAT_RESPONSE_ENDPOINT` | Remote endpoint for patient chat responses | `/chat-response` or custom |
| `TTS_PROVIDER` | Voice provider: `chatterbox`, `elevenlabs`, `vibevoice`, `none` | `none` |
| `ELEVENLABS_API_KEY` | ElevenLabs API Key (if used) | - |
| `NEXTAUTH_URL` | Optional stable public app URL | request host in dev |
| `MISSTEP_ANALYSIS_MODE` | Misstep detector mode: `hybrid` or `heuristic` | `hybrid` |
| `VERTEX_MODEL_ID` | Vertex/Gemini model used for structured judging | `gemini-2.5-flash` |
| `GOOGLE_CLOUD_PROJECT` | GCP project for Vertex AI | - |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI location | `global` |
| `GOOGLE_GENAI_USE_VERTEXAI` | Enable Vertex AI through `@google/genai` | `true` |

### Misstep analysis modes

- `heuristic`: use only the built-in detector based on transcript features and rules.
- `hybrid`: run the heuristic detector first, then optionally refine results with a Vertex AI structured-output judge when Google Cloud is configured.

If `MISSTEP_ANALYSIS_MODE=hybrid` but Vertex credentials are missing or the call fails, the app automatically falls back to `heuristic`.

### Environments
- **Dev**: `NODE_ENV=development`
- **Prod**: `NODE_ENV=production`

## Usage

### Student
1. Log in to the platform.
2. From the **Dashboard**, select "New Simulation".
3. Choose a patient from the library (e.g., "Juanita", "Marco").
4. Start **Session 1** (Intake). Conduct the interview via chat or voice.
5. Mark the current chat step as completed.
6. Open the **Misstep Analysis** report for that completed step.
7. Continue across the 11-session journey until the therapy session is completed.

### API
The system uses tRPC for client-server communication.
Key internal calls for the step-evaluation flow:

- `trpc.chat.markStepDone.mutate({ therapySessionId, stepNumber })`
- `trpc.stepEvaluations.getByStep.query({ therapySessionId, stepNumber })`
- `trpc.stepEvaluations.retryByStep.mutate({ therapySessionId, stepNumber })`

## Architecture

The project is built on **Next.js 15** (App Router) and T3 stack.

- **Frontend**: React, Tailwind CSS, Shadcn/UI.
- **Backend**: Next.js Server Actions, tRPC.
- **Database**: Drizzle ORM (SQLite/Postgres).
- **AI Core**:
    - `src/server/services/patient-response-generator.ts`: patient orchestration and remote/local chat generation.
    - `src/server/services/misstep-evaluator.ts`: heuristic + optional Vertex AI misstep scoring for a single completed chat step.
    - `src/server/services/step-misstep-evaluations.ts`: persistence, queueing, and retry logic for step evaluations.
    - `scripts/`: auxiliary scripts and backend scenario tests.

## Testing

To verify system health and integrations:

```bash
pnpm test
```
This script runs a diagnosis of services (Database, TTS, API).

To run the backend integration scenario used by this project:

```bash
pnpm test:backend
```

This covers core persistence flows across SQLite and, when available, PostgreSQL, including chat-step completion and misstep evaluation persistence.

**Coverage and Linting**:
```bash
pnpm lint
pnpm typecheck
```

## Deployment

### Production Build
```bash
pnpm build
pnpm start
```

To bind the app to a different port in production:

```bash
PORT=8080 pnpm start
```

### Docker
A `docker-compose.yml` is included to orchestrate PostgreSQL.
```bash
docker-compose up -d
```

### Reverse Proxy And Process Manager
- Production macOS `launchd` example: `deployment/launchd/it.whattadata.llmpatients.plist.example`
- Remote `nginx` site config example: `deployment/nginx/llmpatient.conf.example`
- Linux-only alternative `systemd` unit: `deployment/systemd/llmpatients.service.example`

Production topology for the current deployment:
- The Next.js app runs on this Mac and listens on `149.132.178.114:8080`.
- Public HTTPS is terminated on the external proxy host `149.132.176.51`.
- The proxy forwards `llmpatient.whattadata.it` traffic to `http://149.132.178.114:8080`.

Recommended production checks:
- Make sure the `launchd` service and the `nginx` upstream use the same port.
- Keep `PORT` explicit in the service definition instead of relying on shell defaults.
- Do not use `0.0.0.0` in `API_BASE_URL` or other outbound service URLs. It is valid for binding a server, not for reaching another service over HTTP.
- On macOS, load the user service with `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/it.whattadata.llmpatients.plist`.
- Enable and restart it with `launchctl enable gui/$(id -u)/it.whattadata.llmpatients` and `launchctl kickstart -k gui/$(id -u)/it.whattadata.llmpatients`.
- After deploy, verify both the local upstream and the public domain:

```bash
curl -I http://127.0.0.1:8080
curl -I http://149.132.178.114:8080
curl -I https://llmpatient.whattadata.it/
```

### Release Checklist
- [ ] Update version in `package.json`.
- [ ] Verify `pnpm test` and `pnpm typecheck` pass.
- [ ] Production build (`pnpm build`) without errors.
- [ ] Verify database migrations (`pnpm db:migrate`).
- [ ] Git tag version.

## Contributing

We are open to contributions! To propose changes:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/new-feature`).
3. Commit changes (`git commit -m 'Add: new feature'`).
4. Push the branch.
5. Open a Pull Request.

To report bugs, use the GitHub Issues section.

## Roadmap

- [x] PDM-2 Patient Profile
- [x] Long-Term Memory (RAG)
- [x] Local TTS (Chatterbox) and Cloud TTS (ElevenLabs) Support
- [x] Step-level misstep analysis with persisted reports
- [ ] Advanced Supervisor Dashboard
- [ ] Real-time browser Speech-to-Text integration
- [ ] Patient library expansion

## FAQ

**Q: Can I use the system offline?**
A: Yes, if you configure a local LLM (e.g., with Ollama) and use local TTS (Chatterbox), the system can work without internet (except for installation).

**Q: How do I add a new patient?**
A: Patient profiles are defined in the database. Use the seed script or the administration interface (coming soon) to create new ones.

## Security

To report security vulnerabilities, please do not open a public issue. Send an email to [encrypted-email-or-private-contact].

## License

This project is distributed under the **MIT** license. See the `LICENSE` file for details.

## Credits

Developed at **University of Milano-Bicocca (UNIMIB)**.
Department of Psychology & Department of Informatics, Systems and Communication.

References and inspirations:
- PDM-2 (Psychodynamic Diagnostic Manual)
- Panksepp’s Affective Neuroscience

## Cite this work

If you use LLMPatients for your research, please cite the reference paper:

```bibtex
@article{llmpatient2025,
  title={LLMPatient: un sistema esperto ibrido per la simulazione multi-sessione di pazienti virtuali nella formazione psicoterapeutica},
  author={UNIMIB Team},
  journal={TBD},
  year={2025},
  url={https://github.com/unimib-whattadata/LLMPatients}
}
```
