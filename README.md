# LLMPatients-App

Virtual patient simulations for psychotherapy training, built with Next.js, tRPC, Drizzle ORM and PostgreSQL.

![Status](https://img.shields.io/badge/status-beta-orange)
![Node](https://img.shields.io/badge/node-22-green)
![Package%20manager](https://img.shields.io/badge/pnpm-10.12.4-blue)
![Database](https://img.shields.io/badge/database-PostgreSQL%2018-blue)

## Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Workflow](#database-workflow)
- [Useful Commands](#useful-commands)
- [Testing](#testing)
- [Production](#production)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Citation](#citation)

## Overview

LLMPatients is an educational platform for psychotherapy students. It lets students practice multi-session therapeutic journeys with structured virtual patients, receive automatic feedback on clinical missteps, and review progress through dashboards and persisted reports.

The application is designed around one database backend: **PostgreSQL**. SQLite is no longer supported by the runtime, scripts, Drizzle config, or migrations.

## Core Features

- Structured virtual patients with clinical profiles, objectives, difficulty and therapeutic journey data.
- Multi-step therapeutic simulations with chat, session state and progress tracking.
- Step-level misstep analysis with persisted reports and retry support.
- Optional hybrid misstep judging with Vertex AI; heuristic mode is available without cloud credentials.
- Optional TTS providers: `none`, `elevenlabs`, `vibevoice`, `chatterbox`.
- Admin/user flows, impersonation support and seeded demo accounts for local development.
- PostgreSQL migrations managed by Drizzle Kit in `drizzle-postgres/`.

## Tech Stack

- **Runtime**: Node.js 22
- **Framework**: Next.js 15 App Router
- **UI**: React 19, Tailwind CSS 4, Radix UI primitives
- **API**: tRPC
- **Auth**: NextAuth v5 beta
- **Database**: PostgreSQL 18, Drizzle ORM, `postgres` client
- **Package manager**: pnpm 10.12.4
- **Container support**: Dockerfile for the app, Docker Compose for PostgreSQL

## Requirements

- Node.js 22
- pnpm 10.12.4, preferably through Corepack
- Docker and Docker Compose for the local PostgreSQL container
- PostgreSQL connection string in `DATABASE_URL`
- Optional Python 3.10+ only for local TTS service integrations
- Optional Google Cloud credentials for Vertex AI hybrid misstep judging

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/unimib-whattadata/LLMPatients-App.git
cd LLMPatients-App

corepack enable
corepack prepare pnpm@10.12.4 --activate
pnpm install
```

### 2. Start PostgreSQL

The included `docker-compose.yml` starts PostgreSQL 18 on host port `5432`.

```bash
docker compose up -d pg_bitbrand
```

Local connection string when the Next.js app runs on your host machine:

```txt
postgresql://postgres:postgres@127.0.0.1:5432/postgres
```

If the app runs in another container on the same Compose network, use the service name instead:

```txt
postgresql://postgres:postgres@pg_bitbrand:5432/postgres
```

### 3. Create `.env`

Create `.env` in the repository root:

```bash
touch .env
```

Minimum local configuration:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"

AUTH_SECRET="replace-with-openssl-rand-base64-32"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:8080"

API="local"
TTS_PROVIDER="none"
MISSTEP_ANALYSIS_MODE="heuristic"
GOOGLE_GENAI_USE_VERTEXAI="false"
```

Generate secrets with:

```bash
openssl rand -base64 32
```

### 4. Prepare the database

For a fresh local database, apply migrations and seed demo data:

```bash
pnpm db:migrate
pnpm db:seed
```

The seed script creates local demo users:

```txt
admin@example.com / Qwerty123!
user@example.com  / Qwerty123!
```

These credentials are for local development only.

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:8080](http://localhost:8080).

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL. Must start with `postgres://` or `postgresql://`. |
| `AUTH_SECRET` | Production | NextAuth secret. Use a strong random value. |
| `NEXTAUTH_SECRET` | Recommended | Explicit NextAuth secret. Use a strong random value. |
| `NEXTAUTH_URL` | Recommended | Public base URL of the app. In local dev use `http://localhost:8080`. |
| `JWT_SECRET` | Optional | Legacy/internal JWT secret when needed by auth flows. |
| `API` | Optional | Patient response mode: `local` or `remote`. Defaults to `local`. |
| `EXTERNAL_AI_API_KEY` | Remote only | Bearer token for the external patient/orchestrator API. |
| `API_BASE_URL` | Remote only | Base URL for the external patient/orchestrator API. |
| `API_INITIALIZE_PATIENT_ENDPOINT` | Remote only | Remote endpoint for patient initialization. |
| `API_CHAT_RESPONSE_ENDPOINT` | Remote only | Remote endpoint for chat responses. |
| `API_TIMEOUT_INITIALIZE_PATIENT` | Optional | Initialization timeout in milliseconds. |
| `API_TIMEOUT_CHAT_RESPONSE` | Optional | Chat response timeout in milliseconds. |
| `TTS_PROVIDER` | Optional | `none`, `elevenlabs`, `vibevoice`, or `chatterbox`. Defaults to `none`. |
| `ELEVENLABS_API_KEY` | Provider only | Required when `TTS_PROVIDER=elevenlabs`. |
| `VIBEVOICE_URL` | Provider only | VibeVoice service URL. Defaults to `http://localhost:3001`. |
| `CHATTERBOX_URL` | Provider only | Chatterbox service URL. Defaults to `http://localhost:3002`. |
| `MISSTEP_ANALYSIS_MODE` | Optional | `heuristic` or `hybrid`. Defaults to `hybrid`. |
| `VERTEX_MODEL_ID` | Hybrid only | Vertex/Gemini model for structured judging. |
| `GOOGLE_CLOUD_PROJECT` | Hybrid only | Google Cloud project for Vertex AI. |
| `GOOGLE_CLOUD_LOCATION` | Hybrid only | Vertex AI location. Defaults to `global`. |
| `GOOGLE_GENAI_USE_VERTEXAI` | Hybrid only | Set to `true` to use Vertex AI through `@google/genai`. |

### Misstep Analysis Modes

- `heuristic`: local rule-based analysis only. Best for local development and CI.
- `hybrid`: run heuristic analysis first, then refine with Vertex AI when Google Cloud credentials are available.

If `hybrid` is configured but Vertex credentials are missing or the remote call fails, the app falls back to heuristic output.

## Database Workflow

The canonical Drizzle config is `drizzle.config.ts`.

```bash
pnpm db:generate   # generate a new migration from schema changes
pnpm db:migrate    # apply migrations from drizzle-postgres/
pnpm db:push       # push schema directly, useful for local prototyping only
pnpm db:studio     # open Drizzle Studio on localhost:4986
pnpm db:seed       # seed users, patients and initial data
```

Rules for this repository:

- Keep schema changes in `src/server/db/schema-postgres.ts`.
- Keep generated migrations in `drizzle-postgres/`.
- Do not add SQLite URLs, SQLite migrations, local `.db` files, or alternate Drizzle configs.
- Prefer `pnpm db:migrate` for environments that should mirror production.
- Use `pnpm db:push` only for short-lived local experiments.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start Next.js in development mode on port `8080`. |
| `pnpm dev:no-turbo` | Start development server without Turbopack. |
| `pnpm build` | Create a production build. |
| `pnpm start` | Start the production Next.js server on port `8080` by default. |
| `pnpm preview` | Build and start the app locally. |
| `pnpm typecheck` | Run TypeScript checks. |
| `pnpm lint` | Run Next/ESLint checks. |
| `pnpm format:check` | Check Prettier formatting. |
| `pnpm format:write` | Apply Prettier formatting. |
| `pnpm test` | Run the platform diagnostic script. |
| `pnpm test:backend` | Run the PostgreSQL backend scenario test. |
| `pnpm system:diagnose` | Alias for the platform diagnostic script. |
| `pnpm audit:performance` | Build, start and run Lighthouse against localhost. |

## Testing

Recommended local validation before pushing:

```bash
pnpm typecheck
pnpm build
```

Service and integration checks:

```bash
pnpm test
pnpm test:backend
```

`pnpm test:backend` expects a reachable PostgreSQL admin database. By default it tries:

```txt
postgresql://postgres:postgres@127.0.0.1:5432/postgres
```

Override it with:

```bash
TEST_POSTGRES_ADMIN_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres" pnpm test:backend
```

## Production

### Build and start without Docker

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
PORT=8080 pnpm start
```

Set production secrets and a production PostgreSQL `DATABASE_URL` before running migrations or starting the app.

### Docker image

The repository includes a multi-stage `Dockerfile` for the Next.js app:

```bash
docker build -t llmpatients-app .
```

Run it with an environment file:

```bash
docker run --rm \
  --env-file .env \
  -p 8080:8080 \
  llmpatients-app
```

When the app container must reach PostgreSQL running on the Docker host, use a reachable host name in `DATABASE_URL`, for example `host.docker.internal` on Docker Desktop:

```env
DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/postgres"
```

When the app and database run on the same Compose network, use:

```env
DATABASE_URL="postgresql://postgres:postgres@pg_bitbrand:5432/postgres"
```

### Docker Compose database

The current `docker-compose.yml` manages the database only:

```bash
docker compose up -d pg_bitbrand
docker compose logs -f pg_bitbrand
docker compose down
```

Database data is stored in `./pg__data`.

### Deployment notes

- Run `pnpm db:migrate` before deploying a version that depends on new schema changes.
- Keep `NEXTAUTH_URL` aligned with the public HTTPS URL.
- Keep secrets out of Dockerfiles, logs and committed files.
- Do not use `0.0.0.0` as an outbound API base URL; it is only valid for binding a server.
- If using Coolify, configure the app with Node 22, pnpm 10.12.4 and a PostgreSQL `DATABASE_URL`.

Legacy deployment examples are available in:

- `deployment/launchd/it.whattadata.llmpatients.plist.example`
- `deployment/nginx/llmpatient.conf.example`
- `deployment/systemd/llmpatients.service.example`

## Project Structure

```txt
src/app/                  Next.js routes, layouts and API handlers
src/components/           Shared UI, layout and feature components
src/hooks/                Client-side React hooks
src/lib/                  Shared utilities, constants, TTS helpers and domain rules
src/server/api/           tRPC routers and server API setup
src/server/auth/          Auth configuration and session helpers
src/server/db/            PostgreSQL schema and database client
src/server/services/      Domain services for chat, patients and misstep analysis
drizzle-postgres/         PostgreSQL migrations and Drizzle snapshots
patients/                 Seed patient source data
scripts/                  Seed, diagnostics and backend scenario scripts
deployment/               Example process manager and reverse proxy configs
```

## Troubleshooting

### `DATABASE_URL must be a valid PostgreSQL URL`

The app accepts only PostgreSQL URLs:

```txt
postgresql://user:password@host:5432/database
postgres://user:password@host:5432/database
```

SQLite URLs such as `file:./dev.db` are no longer supported.

### `pnpm db:migrate` cannot connect

Check that PostgreSQL is running and reachable:

```bash
docker compose ps
docker compose logs pg_bitbrand
```

Then verify the same host, port, user, password and database are present in `DATABASE_URL`.

### Build fails because env vars are missing

For local builds, make sure `.env` exists and includes at least `DATABASE_URL`. Production builds should also include strong auth secrets.

### App starts but login fails

Run the seed script:

```bash
pnpm db:seed
```

Then use the local demo credentials listed in [Quick Start](#quick-start).

## Security

- Never commit `.env`, production secrets, API keys, database dumps or generated audio.
- Rotate any secret that has appeared in logs, screenshots or shared chat messages.
- Use strong random values for `AUTH_SECRET`, `NEXTAUTH_SECRET` and `JWT_SECRET`.
- Replace seed credentials before using the app outside local development.

## Citation

If you use LLMPatients for research, cite the reference paper or project record used by your group:

```bibtex
@article{llmpatient2025,
  title={LLMPatient: un sistema esperto ibrido per la simulazione multi-sessione di pazienti virtuali nella formazione psicoterapeutica},
  author={UNIMIB Team},
  journal={TBD},
  year={2025},
  url={https://github.com/unimib-whattadata/LLMPatients-App}
}
```
