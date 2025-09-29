# AI Code Generation Guidelines for the llmpatient Project

These guidelines describe how to extend the llmpatient codebase safely. They translate the existing architecture, coding conventions, and product expectations into concrete guardrails for AI-assisted development.

## 1. Project Snapshot
- **Product**: llmpatient – a medical simulation platform that trains clinicians with virtual patients.
- **Runtime**: Next.js 15 (App Router) with React 19 and TypeScript strict mode.
- **Data layer**: Drizzle ORM on libSQL/SQLite with tables prefixed `llmpatient_`.
- **APIs**: tRPC v11 + React Query, SuperJSON transformer, server-first rendering.
- **Auth & security**: NextAuth.js v5 (credentials + optional Discord provider), JWT strategy, admin impersonation, middleware-based route protection.
- **Design system**: Tailwind CSS v4 with `@theme` tokens, CSS custom properties, and a heavily customized shadcn/ui kit.
- **Tooling**: pnpm, ESLint (flat config), Prettier with Tailwind plugin, Turbopack dev server, Drizzle Kit migrations.

## 2. Workflow & Tooling Conventions
- **Package manager**: Use `pnpm`. All scripts in `package.json` assume pnpm (`pnpm install`, `pnpm run dev`, `pnpm run check`).
- **Primary scripts**:
  - `pnpm run dev` → Next dev with Turbopack (`--turbo`).
  - `pnpm run check` → `next lint` + `tsc --noEmit`.
  - `pnpm run format:write` / `format:check` → Prettier with Tailwind plugin.
  - `pnpm run db:generate | db:migrate | db:push` → Drizzle Kit workflows.
  - `pnpm run system:diagnose` → diagnostic script; keep it updated if tooling changes.
- **TypeScript config** (`tsconfig.json`): strict mode, `moduleResolution: "Bundler"`, `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, and path aliases (`~/*`, `@/components/*`, etc.). Match these settings in any generated tsconfig snippets.
- **ESLint**: Flat config uses `typescript-eslint` and `eslint-plugin-drizzle`. Always satisfy:
  - Inline `type` imports (`import { type Foo } …`).
  - No async-without-await warnings (`@typescript-eslint/no-misused-promises`).
  - Drizzle safeguards (`enforce-update-with-where`, `enforce-delete-with-where`).
- **Prettier**: Only Tailwind plugin is enabled; rely on default formatting.
- **Comments & copy**: Code comments must stay in English. User-facing copy is primarily Italian—keep new strings localized accordingly.
- **Environment validation**: `src/env.js` uses `@t3-oss/env-nextjs`. When adding env vars, extend the Zod schema and runtime destructuring.
- **Global db client**: `src/server/db/index.ts` caches the libSQL client in dev. Reuse `db` from this module; never re-create clients ad hoc.

## 3. Repository Layout
```
src/
├── app/                         # App Router routes & layouts
│   ├── (auth)/                  # Login/register route group
│   ├── dashboard/               # Role-scoped dashboard routes
│   ├── admin/                   # Admin-only area
│   ├── explore-patients/        # Patient exploration flow
│   ├── api/                     # Route handlers
│   ├── layout.tsx               # Root layout (providers + metadata)
│   └── page.tsx                 # Marketing homepage (Italian)
├── components/
│   ├── ui/                      # shadcn-derived primitives (re-exported via index)
│   ├── features/                # Feature modules (dashboard, therapy journey, etc.)
│   ├── layout/                  # Layout wrappers (e.g. `SharedLayout`)
│   ├── navigation/              # Nav bars, sidebar, breadcrumbs
│   └── common/                  # Cross-cutting utilities (e.g. `ToastProvider`)
├── server/
│   ├── api/                     # tRPC routers, context, middleware
│   ├── auth/                    # NextAuth config, helpers, validation
│   └── db/                      # Drizzle schema, patient seed data, exports
├── trpc/                        # React Query + RSC hydration helpers
├── hooks/                       # Custom hooks
├── lib/                         # Utility helpers (`cn`, constants, etc.)
├── shared/                      # Reusable domain constants/helpers
├── styles/                      # Tailwind 4 token setup, component CSS
└── types/                       # Domain types
```
Keep new files within the existing structures; prefer extending feature directories instead of creating parallel patterns.

## 4. React & Next.js Patterns
- **Server-first mindset**: Components are server by default. Only add `'use client'` when hooks, browser-only APIs, or state are required (e.g. `src/components/ui/radio-group.tsx`).
- **Providers**: `src/app/layout.tsx` wraps the tree with `SessionProvider`, `TRPCReactProvider`, `ToastProvider`, and `SessionDebugWrapper` (dev only). Any new global provider must be inserted here with care for bundle impact.
- **Authentication guard**: Use `auth()` in server components/routes to redirect authenticated users or enforce access (`src/app/page.tsx` shows redirect-on-login pattern).
- **App Router data fetching**:
  - For RSC → use `HydrateClient` from `src/trpc/server.ts` when reusing tRPC queries client-side.
  - For client components → consume queries via `api.*.useQuery()` after wrapping with `TRPCReactProvider`.
- **Routing & navigation**: Use `next/navigation` helpers (`redirect`, `useRouter`). Avoid legacy `next/router`.
- **Metadata**: `layout.tsx` defines detailed metadata (Open Graph, Twitter, canonical). Extend metadata in leaf routes via `generateMetadata` when needed.
- **Edge compatibility**: Schema uses `crypto.randomUUID()` from the Web Crypto API. Stay Edge-safe when writing code intended for middleware/RSC.

## 5. Styling & Design System
- **Tailwind v4**: `tailwind.config.ts` keeps configuration minimal; heavy lifting happens in `src/styles/globals.css`, `colors.css`, and `components.css` using `@theme`, `@custom-variant`, and CSS variables.
- **Design tokens**: Reuse the semantic tokens (e.g. `--color-primary-green`, `--radius-lg`, `--duration-fast`). Never hardcode color hexes unless introducing new tokens.
- **Utility helpers**: Use `cn` from `~/lib/utils` to merge class names. Prefer descriptive utility stacks:
  ```tsx
  <RadioGroupPrimitive.Item
    className={cn(
      "aspect-square size-4 rounded-full border-2",
      "border-[var(--color-border-secondary)] bg-[var(--color-input-background)]",
      "focus-visible:ring-2 focus-visible:ring-offset-2",
      className,
    )}
  />
  ```
- **Component CSS**: Many marketing and feature layouts rely on classes defined in `components.css`. When tweaking these views, update the CSS file rather than embedding large style blocks in TSX.
- **Responsive rules**: Tailwind 4 supports container queries (`@md` syntax). Follow existing patterns when enhancing layouts.

## 6. UI Component Library
- **Exports**: `src/components/ui/index.ts` re-exports every primitive. Import from there to keep tree shaking consistent (`import { Button, Input } from "~/components/ui"`).
- **Customization**: Components deviate from vanilla shadcn styles to align with the design tokens. Copy existing structure when introducing new slots or states.
- **Stateful patterns**: Many feature components (e.g. `CreatePatientContent`) pair UI primitives with form libraries. Prefer composition plus helper utilities over duplicating primitives.
- **Skeletons & empty states**: Use the dedicated helpers (`PatientCardSkeleton`, `EmptyState`) instead of re-implementing placeholders.

## 7. Forms, Validation & Feedback
- **Validation**: Zod is the single source of truth. Co-locate schemas with consuming components (`CreatePatientContent` uses `zodResolver(createPatientSchema)`). When parsing JSON payloads, wrap in `try/catch` and surface Italian validation messages.
- **Forms**: Leverage `react-hook-form` and the re-exported `<Form />` components. Preserve accessibility props generated by `FormField`, `FormLabel`, etc.
- **Notifications**: Use the custom `ToastProvider` (`showSuccess`, `showError`, …) or `sonner` wrappers already in the codebase. Avoid introducing alternate toast libraries.

## 8. tRPC & React Query
- **Context & middleware**: `src/server/api/trpc.ts` sets up `createTRPCRouter`, `publicProcedure`, `protectedProcedure`, and `adminProcedure`, with a `timingMiddleware` that logs execution time in dev.
- **Router organization**: Each domain router lives under `src/server/api/routers` (dashboard, patients, therapy sessions, chat, impersonation, user management). Register new routers in `appRouter` (`src/server/api/root.ts`).
- **Input validation**: Every procedure validates input with Zod. Follow the patterns of optional filters, pagination defaults, and `.refine` when needed.
- **RBAC**: Use `protectedProcedure` for authenticated access and `adminProcedure` for admin-only mutations. Don’t duplicate role checks in each resolver—encapsulate them here.
- **Data fetching on the client**: `src/trpc/react.tsx` creates a singleton `QueryClient` in the browser, enables logging in development, and batches HTTP calls via `httpBatchStreamLink`. Respect this setup when adding links (e.g. always append headers inside the factory).
- **Hydration**: For server components, obtain queries via `api.<namespace>.<procedure>.prefetch(...)` coupled with `HydrateClient`.

## 9. Database & Drizzle ORM
- **Table factory**: `createTable` prefixes tables with `llmpatient_`. Maintain this prefix to avoid collisions.
- **Schema**: Key tables include `users`, `accounts`, `sessions`, `userActivities`, `impersonationSessions`, `impersonationAuditLog`, `patients`, `therapySessions`, and `chat`. Study `src/server/db/schema.ts` before altering relationships.
- **Defaults & triggers**: Many columns use `sql` defaults (for example `unixepoch()`), boolean integers, and `$onUpdate` hooks. Preserve these semantics when adding columns.
- **Relations**: Use `relations(...)` to link tables. Keep naming consistent with existing relation names (`adminImpersonationSessions`, `targetImpersonationSessions`).
- **Queries**: Always scope updates/deletes with `.where(...)`. Prefer `ctx.db.query.<table>.findMany` for read paths to benefit from type-safe selections.
- **Data shaping**: Convert JSON fields explicitly (see `CreatePatientContent` for parsing). Provide fallbacks when JSON parsing fails to avoid runtime crashes.
- **Migrations**: Use Drizzle Kit migrations under `drizzle/`. Avoid editing SQL files manually unless absolutely required; prefer generating through `pnpm db:generate`.

## 10. Authentication, Sessions & Security
- **NextAuth v5**: `src/server/auth/config.ts` configures credentials login with robust validation (`validateUserByEmail`, `comprehensiveUserValidation`) plus Discord provider scaffolding. JWT strategy includes dynamic `rememberMe` session lengths.
- **Exports**: `src/server/auth/index.ts` re-exports `auth`, `handlers`, `signIn`, and `signOut`. Import from here across the app.
- **Impersonation**: Sessions may contain an `impersonation` object. Middleware and components must respect this context when enforcing admin-only logic.
- **Middleware**: `middleware.ts` wraps `auth()` to protect `/dashboard` and `/admin`, handle impersonation redirects, allow marketing routes, and support a development-only bypass via `specialKey`. Extend route protection here when adding new secure areas.
- **Session debugging**: `SessionDebugWrapper` renders session info in development. Keep it behind the existing `isDev` flag to avoid leaking data in production.
- **Security headers**: `next.config.js` sets baseline security headers and removes console logs in production (`compiler.removeConsole`). When adding APIs, ensure they don’t undo these safeguards.

## 11. Accessibility & Localization
- **Language**: UI copy, aria labels, and marketing content are in Italian. Maintain the tone and vocabulary when adding new text.
- **Semantics**: Marketing pages use structured data attributes (`itemScope`, `itemType`). Preserve or extend them when updating the homepage or landing sections.
- **Keyboard support**: UI primitives include focus styles and keyboard handlers. When composing new interactive elements, forward refs and apply `focus-visible` styles consistent with existing components.
- **ARIA**: Continue providing descriptive `aria-label`s, especially in complex components like `TherapySessionTimeline` and `ChatContent`.

## 12. Performance & Observability
- **Logging**: Development mode includes detailed console logging across auth, middleware, and tRPC. Keep logs guarded by `process.env.NODE_ENV === "development"`.
- **React Query defaults**: `createQueryClient` adjusts `staleTime` and hydration serialization. When introducing long-lived queries, override options per-query instead of changing global defaults.
- **Next config optimizations**: Custom webpack settings improve hot reloading and bundle splitting. Avoid adding conflicting loaders or disabling the conservative splitChunks strategy without a strong reason.
- **Batching**: tRPC uses `httpBatchStreamLink`. Ensure new client calls remain batch-friendly (avoid custom fetch wrappers that bypass it).

## 13. Testing & Diagnostics
- **Current status**: No automated tests exist yet, but the structure anticipates adding Testing Library/react, Vitest (not installed), or Playwright. If you add tests, place utilities under `src/test` or collocated `__tests__` folders and configure `pnpm run check` to include them.
- **tRPC testing**: Use `createCaller` from `src/server/api/root.ts` to exercise procedures with mocked context.
- **Diagnostics**: `scripts/system-diagnostics.ts` gathers environment info. Update it whenever new required tooling is introduced.

## 14. Deployment & Environment Management
- **Environment variables**:
  - Server: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV`.
  - Client: `NEXT_PUBLIC_NODE_ENV` (mirrors node env for logging toggles).
  - Extend `createEnv` if more exposure is needed; never read `process.env` directly outside this module.
- **Database**: Development defaults to `dev.db` via libsql file path. For cloud deployment, configure `DATABASE_URL` accordingly.
- **Cache headers**: `next.config.js` assigns cache-control headers for static assets and images. Reuse `assetCacheControl` for new asset routes.
- **Scripts**: `pnpm preview` builds then starts the production server. Ensure migrations run before starting the app in any deployment pipeline.

## 15. Contribution Checklist
Before finalizing changes, confirm:
- [ ] TypeScript checks (`pnpm run check`) succeed.
- [ ] ESLint passes with no new warnings.
- [ ] Prettier formatting matches repo style.
- [ ] Imports use configured aliases (`~/`, `@/…`).
- [ ] New UI strings are Italian; comments/documentation remain English.
- [ ] Accessibility attributes exist on interactive elements.
- [ ] Database mutations include `where` clauses and respect existing relations.
- [ ] tRPC procedures include Zod validation and the correct procedure wrapper (`public`, `protected`, `admin`).
- [ ] Auth-sensitive code considers impersonation context.
- [ ] Styling relies on existing design tokens and utilities.
- [ ] Added environment variables are declared and validated in `src/env.js`.
- [ ] Consider adding or updating migrations when schema changes.

## 16. Ongoing Maintenance
Keep this document current as the project evolves:
- Update the tech snapshot when upgrading major dependencies (Next.js, React, Tailwind, tRPC, Drizzle, NextAuth).
- Capture new patterns (e.g., analytics integrations, logging services) as they appear.
- Reflect design-system changes (new tokens, updated spacing scale) promptly.
- Align guidelines with security updates, especially around authentication and impersonation workflows.

Following these principles ensures generated code aligns with the existing architecture, preserves security constraints, and keeps the llmpatient experience consistent.
