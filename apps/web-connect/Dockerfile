FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web-connect/package.json apps/web-connect/package.json

RUN pnpm install --frozen-lockfile --filter web-connect...

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web-connect/node_modules ./apps/web-connect/node_modules
COPY . .

RUN pnpm --filter web-connect build

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web-connect/.next/standalone ./
COPY --from=builder /app/apps/web-connect/.next/static ./apps/web-connect/.next/static
COPY --from=builder /app/apps/web-connect/public ./apps/web-connect/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web-connect/server.js"]
