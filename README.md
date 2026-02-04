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
- Receive automatic feedback on empathy, setting adherence, and clinical missteps.

The goal is to provide a "safe gym" to make mistakes and learn without risks for real patients.

## Features

- **🧠 Parametric Clinical Profiles**: Patients based on the PDM-2 hierarchy (Personality > Mental Functioning > Symptoms), not simple narrative prompts.
- **📅 Multi-session Continuity**: Long-term memory (RAG) that maintains narrative and clinical coherence across 11 distinct sessions.
- **🗣️ Multimodal Interaction**: Support for text and voice chat (Text-to-Speech with Chatterbox/ElevenLabs and Speech-to-Text).
- **📉 Adaptive Dynamics**: The patient reacts to student interventions (e.g., alliance ruptures, defenses) modifying their emotional state.
- **📊 Detailed Reporting**: Analytical dashboards to track progress, view transcripts, and receive automatic evaluations.
- **🔒 Privacy-First**: Architecture designed for local execution of TTS/STT models and support for local or remote LLMs.

## Demo

> In 10 seconds: The system simulates a therapeutic session via chat or voice, reacting emotionally to the therapist's interventions.

*(Insert Dashboard and Chat Interface Screenshots or GIF here)*

## Requirements

- **Node.js**: v18 or higher.
- **pnpm**: Recommended package manager.
- **Database**: SQLite (default, included) or PostgreSQL (via Docker).
- **Python**: v3.10+ (required only if using local TTS modules like Chatterbox/VibeVoice).
- **API Keys**: OpenAI/Anthropic (for the patient's brain) and ElevenLabs (optional for cloud TTS).

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
    Copy the `.env.example` file to `.env` (see [Configuration](#configuration)).
    ```bash
    cp .env.example .env
    ```

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

Open your browser at [http://localhost:3000](http://localhost:3000).

## Configuration

Main environment variables in `.env`:

| Variable | Description | Default |
|-----------|-------------|---------|
| `DATABASE_URL` | DB connection string (e.g., `file:./dev.db`) | - |
| `AUTH_SECRET` | Secret for NextAuth (e.g., `openssl rand -base64 32`) | - |
| `OPENAI_API_KEY` | API Key for the main LLM | - |
| `TTS_PROVIDER` | Voice provider: `chatterbox`, `elevenlabs`, `vibevoice`, `none` | `none` |
| `ELEVENLABS_API_KEY` | ElevenLabs API Key (if used) | - |
| `NEXTAUTH_URL` | Base app URL | `http://localhost:3000` |

### Environments
- **Dev**: `NODE_ENV=development`
- **Prod**: `NODE_ENV=production`

## Usage

### Student
1. Log in to the platform.
2. From the **Dashboard**, select "New Simulation".
3. Choose a patient from the library (e.g., "Juanita", "Marco").
4. Start **Session 1** (Intake). Conduct the interview via chat or voice.
5. At the end, view the **Report** with automatic feedback.

### API
The system uses tRPC for client-server communication.
Example call (internal): `trpc.session.complete.mutate({ sessionId })`.

## Architecture

The project is built on **Next.js 15** (App Router) and T3 stack.

- **Frontend**: React, Tailwind CSS, Shadcn/UI.
- **Backend**: Next.js Server Actions, tRPC.
- **Database**: Drizzle ORM (SQLite/Postgres).
- **AI Core**:
    - `src/lib/ai`: LLM logic and prompt management.
    - `src/services/patient`: Patient state management (P/M/S).
    - `scripts/`: Python modules for local TTS.

## Testing

To verify system health and integrations:

```bash
pnpm test
```
This script runs a diagnosis of services (Database, TTS, API).

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

### Docker
A `docker-compose.yml` is included to orchestrate PostgreSQL.
```bash
docker-compose up -d
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
