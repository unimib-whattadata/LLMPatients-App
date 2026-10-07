# LLMPatients-App

A web application for psychotherapy training with simulated patients, multi-session conversations, progress dashboards and automatic misstep reports. It uses Next.js 15, React 19, tRPC and Drizzle with PostgreSQL.

The [canonical reproducibility package](https://github.com/cremarco/LLMPatient---APPLICATION/tree/main/reproducibility) contains standalone app/model copies, the eight reported experiment groups and a single result-checking command. Historical evidence remains in `evaluation/reviewer-comment-1/`; the duplicate reviewer export has been retired.

## Local setup

Use **Node.js 22**, **pnpm 10.12.4** and **PostgreSQL 18**. Docker is needed only for the included database container. Dependency versions are fixed in `pnpm-lock.yaml`.

```sh
corepack enable
corepack prepare pnpm@10.12.4 --activate
pnpm install --frozen-lockfile
docker compose up -d postgres
```

Edit the existing `.env`, preserving unrelated settings, or create one if absent. For the local database and mock patient responses, configure:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres"
AUTH_SECRET="REPLACE_WITH_A_RANDOM_VALUE_AT_LEAST_32_CHARACTERS"
NEXTAUTH_SECRET="REPLACE_WITH_A_RANDOM_VALUE_AT_LEAST_32_CHARACTERS"
NEXTAUTH_URL="http://localhost:8080"
API="local"
TTS_PROVIDER="none"
```

Generate a secret with `openssl rand -base64 32` and use it for both secret variables. The application accepts PostgreSQL URLs only; legacy `file:`/SQLite configuration must be replaced with the intended PostgreSQL connection.

On the fresh local database, apply migrations, import demo data and start the app:

```sh
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [localhost:8080](http://localhost:8080). Demo accounts are `admin@example.com` and `user@example.com`, both with password `Qwerty123!`. The seed writes users and patient profiles to the configured database.

## Patient generation and judging

`API=local` uses mock patient responses. To connect the Agent, set `API=remote`, `API_BASE_URL` to its reachable address and `API_INITIALIZE_PATIENT_ENDPOINT=/patients`. The model folder in the canonical package documents its setup.

Completed-step misstep reports use Vertex AI. They require your own Google Cloud project and credentials; configure `GOOGLE_CLOUD_PROJECT` and the appropriate location. Local mock chat and offline tests do not establish live model quality. TTS is disabled in the example configuration.

## Verification

```sh
pnpm check
pnpm test:offline
TEST_POSTGRES_ADMIN_URL="postgresql://postgres:postgres@127.0.0.1:5432/postgres" pnpm test:backend:local
pnpm build
pnpm start
```

`check` runs ESLint and TypeScript. The offline test uses synthetic inputs and mocked HTTP without a database or provider. Run the backend test on a dedicated PostgreSQL instance: it creates and removes a unique test database, checking migrations, authentication, concurrent sessions and saved chat before model judging. `pnpm test` runs platform diagnostics; the full `pnpm test:backend` additionally calls the configured AI judge.

The production build may download the public Inter font. `pnpm start` serves the build on port 8080; set `PORT` to change it.

## Source and citation

Routes and UI are in `src/app/` and `src/components/`; APIs, authentication and domain services are in `src/server/`. PostgreSQL migrations are in `drizzle-postgres/`, seed profiles in `patients/`, and checks in `scripts/`.

Developed at University of Milano-Bicocca. Source code is **AGPL-3.0-or-later**; see [LICENSE](LICENSE). Cite this repository and the accompanying LLMPatients manuscript when using the software or evaluation materials.
