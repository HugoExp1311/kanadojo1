# KanaDojo Frontend Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile || npm install

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass build-time arguments
# NEXT_PUBLIC_API_URL is embedded into the JS bundle at build time — must be set here!
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# NEXT_PUBLIC_VERCEL_ENV controls welcome modal visibility (production = show only once)
ARG NEXT_PUBLIC_VERCEL_ENV=production
ENV NEXT_PUBLIC_VERCEL_ENV=$NEXT_PUBLIC_VERCEL_ENV

# Activate standalone output mode (required for Docker)
ENV DOCKER_BUILD=1

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Validate and generate i18n types
RUN npm run i18n:check

# Shard the WaniKani dictionaries into public/data/ before the build
# so Next.js copies them into the static output.
# The source files (data/kanji_dict.json, data/vocab_dict.json) are committed to git.
# The 8800+ output shards are NOT committed (gitignored) — they are generated here.
RUN node scripts/shard_dictionaries.js

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
# Note: Next.js standalone output automatically copies node_modules and public files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Kuromoji dict files (.dat.gz) are binary data — not bundled by Next.js standalone.
# Must be copied explicitly so /api/tokenize can read them at runtime.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/kuromoji/dict ./node_modules/kuromoji/dict

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
