# LLMPatients-App verification — 2026-10-07

The app production build, TypeScript/ESLint checks, offline API contracts and isolated PostgreSQL backend checks passed. No live AI provider was called, no user database was written, and no `.tex` file was modified.

## Architecture

Next.js 15 App Router and React 19 provide the frontend. Next API handlers and tRPC implement application services. NextAuth v5 credentials use bcrypt and persisted roles/account status. Drizzle connects to PostgreSQL with six migrations. Patient response generation selects a local mock or external Agent API. Completed chat steps use a queued Vertex/Gemini judge with persisted reports. TTS is optional.

## Checks and fixes

- `pnpm check`: passed after final code edits. ESLint now runs through its CLI (`eslint src`) without importing runtime environment configuration.
- `pnpm build`: passed with synthetic configuration after public Inter font download. The frozen lockfile was installed first because the existing `node_modules` used obsolete Next/TypeScript versions. The lockfile was not changed.
- `pnpm test:offline`: passed; synthetic init/chat/finalize contracts, HTTP 503 propagation, emotion normalization, mock chat and session timeline cleanup. HTTP is stubbed in process and no `.env` is loaded.
- `pnpm test:backend:local`: passed against temporary PostgreSQL 18.4 on localhost port 16543. Registration, duplicate detection, admin-signup restriction, account roles/status, password authentication, remember-me/expiry, activity, concurrent therapy-session creation, mock chat and chat persistence were verified. The scenario stops before queued model evaluation.
- Production HTTP smoke passed: `/`, `/login`, `/register`, `/privacy`, `/api/auth/session` returned 200; `/api/tts/config`, `/api/trpc/dashboard.getUserProfile`, `/api/trpc/patients.getAdminPatients` returned 401 without authentication.
- Negative diagnostics: unreachable synthetic DB produces 8/10 checks and exit 1; unavailable backend DB now returns exit 1 after `skipped`. The old scripts reported misleading success.
- Diagnostics report environment keys as SET/EMPTY, use the current PostCSS config, apply a connection timeout and close failed PostgreSQL clients.
- Compose now forwards Vertex project/location/model and uses Vertex by default; the unused heuristic environment option was removed. YAML parsing/config checks passed.
- Prettier for the new offline test/package and `git diff --check` passed.

Runtime: bundled Node 24.19.0, pnpm 10.12.4, Next 15.5.18, TypeScript 6.0.3. The repository recommends Node 22, which was not available for this run.

## Repeat the PostgreSQL check

Use a dedicated test PostgreSQL server. The wrapper creates a unique `llmpatients_test_*` database, applies migrations, and drops that database after the scenario. It must have database creation rights. It never uses the application's `DATABASE_URL` as the admin endpoint.

For a temporary Docker instance when Docker is available:

```bash
docker run --rm --name llmpatients-review-postgres \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 127.0.0.1:16543:5432 -d postgres:18-alpine
# Wait until pg_isready succeeds before running the test.
docker exec llmpatients-review-postgres pg_isready -U postgres
TEST_POSTGRES_ADMIN_URL=postgresql://postgres@127.0.0.1:16543/postgres \
  pnpm test:backend:local
docker stop llmpatients-review-postgres
```

Docker's daemon did not respond during this audit. Instead the actual run used portable PostgreSQL 18.4 binaries from [`embedded-postgres`](https://github.com/leinelissen/embedded-postgres). The `@embedded-postgres/darwin-arm64@18.4.0-beta.17` archive was extracted into `/private/tmp/llmpatients-isolated-postgres` after verifying its npm SHA-512 integrity value (recorded in the JSON report). Its symlink hydration script was read and executed locally. The reproducible local setup was:

```bash
cd /private/tmp/llmpatients-isolated-postgres/package
node scripts/hydrate-symlinks.js
native/bin/initdb -D /private/tmp/llmpatients-isolated-postgres/data \
  -U postgres -A trust --encoding=UTF8 --no-locale
native/bin/pg_ctl -D /private/tmp/llmpatients-isolated-postgres/data \
  -l /private/tmp/llmpatients-app-postgres.log \
  -o '-h 127.0.0.1 -p 16543 -k /private/tmp/llmpatients-isolated-postgres' -w start
cd /Users/marco/Sites/LLMPatients-App
TEST_POSTGRES_ADMIN_URL=postgresql://postgres@127.0.0.1:16543/postgres \
  AUTH_SECRET=app-audit-placeholder-secret-000000000000 \
  NEXTAUTH_SECRET=app-audit-placeholder-secret-000000000000 \
  TTS_PROVIDER=none pnpm test:backend:local
/private/tmp/llmpatients-isolated-postgres/package/native/bin/pg_ctl \
  -D /private/tmp/llmpatients-isolated-postgres/data -m fast -w stop
```

The portable cluster and temporary production server were stopped after verification. No existing PostgreSQL or Docker instance was started or modified.

## Cleanup

Eight unreferenced `.tmp-*` slide editing/rendering directories (1087 files, 468336189 bytes) were moved out of the repository to recoverable archive `/private/tmp/llmpatients-app-slide-work-2026-10-07`. Its `cleanup-manifest.json` lists each directory. Assets and generated parrot images/prompts were preserved. `.next/cache` (10 regenerable files, 317981924 bytes) was removed after successful build/smoke; the compiled production output and installed dependencies remain usable. Experiment inputs/results, `.env` and database data were preserved.

## Limits

The existing user `.env` has a `DATABASE_URL` using the `file` scheme. Current application validation accepts only PostgreSQL URLs, so a plain launch with that file remains blocked until its database configuration is updated. The user environment was preserved; only synthetic connection settings were used for verification.

This audit validates application contracts and local persistence, not live model quality. The complete backend scenario's Vertex evaluation stage was not run. The Docker image and optional TTS generators were not executed. Source SHA-256 values, detailed smoke results, exact cleanup and local evidence log paths are in `llmpatients-app-audit.json`.
