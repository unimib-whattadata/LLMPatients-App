# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml .npmrc ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm install --frozen-lockfile

FROM base AS builder

ENV SKIP_ENV_VALIDATION=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY package.json pnpm-lock.yaml .npmrc ./

RUN --mount=type=cache,id=pnpm-prod-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store && \
  pnpm install --prod --frozen-lockfile && \
  pnpm store prune

COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./next.config.js
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/patients ./patients
COPY --from=builder --chown=nextjs:nodejs /app/templates ./templates

USER nextjs

EXPOSE 8080

CMD ["pnpm", "run", "start"]
