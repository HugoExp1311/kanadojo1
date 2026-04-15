# Backend Dockerfile for KanaDojo
FROM node:20-alpine AS deps

# Install required tools to compile bcrypt and other native C++ Node modules on Alpine
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install --frozen-lockfile || npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Copy data files like grammar.json — needed at BOTH paths:
# - src/data  (for dev/migration scripts that reference src/ directly)
# - dist/data (where the compiled JS resolves __dirname at runtime)
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/data ./dist/data
# Copy scripts folder for database initialization
COPY --from=builder /app/scripts ./scripts

# Ensure uploads directory exists and has right permissions
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

EXPOSE 4000
ENV PORT=4000

USER node
# Run the initialization script (migrates database & creates admin user) before starting
CMD ["sh", "-c", "npm run init-db && npm start"]
