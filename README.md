# LLMPatients

**LLMPatients** is an advanced educational platform designed to train psychotherapy students and clinical residents through realistic simulations with virtual patients powered by Large Language Models (LLM).

The platform provides a safe, controlled environment where learners can practice clinical interviewing, diagnostic assessment, and therapeutic techniques.

## ✨ Key Features

- **Realistic Patient Simulations**: Interact with virtual patients that have detailed clinical histories, personalities, and psychological profiles.
- **Therapeutic Journey**: Structured sessions that guide the student through different phases of therapy (e.g., intake, intervention, conclusion).
- **Real-time Chat Interface**: A responsive chat interface tailored for clinical dialogue.
- **Automated Assessment**: The system analyzes interactions to provide feedback on empathy, adherence to setting, and quality of interventions.
- **Text-to-Speech (TTS)**: Multi-provider support including privacy-first local generation (Chatterbox, VibeVoice) and high-quality cloud options (ElevenLabs).
- **Role-Based Access**: Specialized views for Students and Supervisors/Admins.
- **Progress Tracking**: Detailed reports and history of past sessions.

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/docs) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/docs/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/docs), [Radix UI](https://www.radix-ui.com/), [Lucide Icons](https://lucide.dev/)
- **Database**: 
  - **SQLite** (default) via [LibSQL](https://docs.shuttle.rs/resources/shuttle-shared-db) / [Turso](https://docs.turso.tech/).
  - **PostgreSQL** via [Docker](https://docs.docker.com/).
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- **Auth**: [Auth.js (NextAuth)](https://authjs.dev/)
- **API**: [tRPC](https://trpc.io/docs) & Server Actions
- **AI/ML**: Integration with external LLM APIs + Local Python Bridges for TTS

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **pnpm** (preferred package manager)
- **Python 3.10+** (if using local TTS features)
- **Git**

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-org/llmpatient.git
    cd llmpatient
    ```

2.  **Install Dependencies**
    ```bash
    pnpm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory.

    ### 🔧 Configuration Reference

    | Variable | Required | Default | Description |
    |----------|:--------:|:-------:|-------------|
    | **Core & Database** |
    | `DATABASE_URL` | ✅ | - | Connection string (`file:./dev.db` or `postgresql://...`). |
    | `NODE_ENV` | ❌ | `development` | `development`, `test`, or `production`. |
    | **Authentication** |
    | `AUTH_SECRET` | ✅ | - | Secret key for encryption (min 32 chars). |
    | `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | Canonical URL of the site. |
    | **AI & API** |
    | `API` | ❌ | `local` | `local` (mock) or `remote` (LLM API). |
    | `API_BASE_URL` | ❌ | - | Base URL for the external LLM backend. |
    | `EXTERNAL_AI_API_KEY` | ❌ | - | API Key for external AI services. |
    | **Text-to-Speech** |
    | `TTS_PROVIDER` | ❌ | `none` | `chatterbox`, `vibevoice`, `elevenlabs`, or `none`. |
    | `USE_CHATTERBOX` | ❌ | `false` | `true` to auto-install Chatterbox local service. |
    | `USE_VIBEVOICE` | ❌ | `false` | `true` to auto-install VibeVoice local service. |
    | `ELEVENLABS_API_KEY` | ❌ | - | Required only if `TTS_PROVIDER="elevenlabs"`. |
    | **Logging** |
    | `LOG_LEVEL` | ❌ | `debug` | Server log level (`debug`, `info`, `warn`, `error`). |

4.  **Database Setup**

    **Option A: SQLite (Default/Easiest)**
    ```bash
    pnpm db:push
    pnpm db:seed
    ```

    **Option B: PostgreSQL (Docker)**
    The project includes a `docker-compose.yml` for running a local Postgres instance.
    ```bash
    # Start Postgres container
    docker-compose up -d

    # Update .env
    # DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

    # Push schema specifically for Postgres
    pnpm db:push:postgres
    pnpm db:seed
    ```

5.  **Start Development Server**
    ```bash
    pnpm dev
    ```

## 🔉 Text-to-Speech (TTS) Integration

The project features a **Python Bridge** architecture to run local TTS models directly alongside the Next.js app.

| Provider | Type | Description | Documentation |
|----------|------|-------------|---------------|
| **Chatterbox** | Local | Simple, fast, offline synthesis. Good for general testing. | [GitHub](https://github.com/resemble-ai/chatterbox) |
| **VibeVoice** | Local | High-quality voice cloning. Requires more resources. | [GitHub](https://github.com/microsoft/VibeVoice) |
| **ElevenLabs** | Cloud | Premium quality, requires API key and internet connection. | [Official Docs](https://elevenlabs.io/docs) |

**Configuration**: Modify `TTS_PROVIDER` in your `.env` to switch between them.

## 🧪 Testing & Diagnostics

A comprehensive diagnostic tool is included to verify system health, database connectivity, and TTS integration.

```bash
# Run full system diagnostics
pnpm test
```

## 📦 Deployment & Optimization

### Production Build
To create an optimized production build:

```bash
pnpm build
pnpm start
```

### Bundle Analysis
To analyze the size of the build bundles:

```bash
pnpm build:analyze
```
This will open a visualizer showing which packages are taking up the most space.

## 🗄️ Database Management

We use **Drizzle Kit** for database migrations and management.

- **Push Schema**: `pnpm db:push`
- **View Data (Studio)**: `pnpm db:studio` (opens at `localhost:4985`)
- **Generate Migrations**: `pnpm db:generate`

## 📂 Project Structure

- `src/app` - Next.js App Router pages and layouts.
- `src/components` - React components (UI, Dashboard, Chat).
- `src/server` - Backend logic, Database schema, Auth configuration.
- `src/lib` - Utilities, Logger, TTS Providers.
- `scripts/` - Maintenance and testing scripts.

## 📜 License

This project is licensed under the MIT License.

---

**Developed for University of Milano-Bicocca (UNIMIB)**
*Innovative Teaching & Clinical Simulation Project*
