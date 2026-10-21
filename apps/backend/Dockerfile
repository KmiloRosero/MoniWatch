# syntax=docker/dockerfile:1

# ---- Build: install, generate the Prisma client, compile ----
FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ---- Runtime: only what the API needs ----
FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

USER node
EXPOSE 3000
# Migrations are idempotent: apply any pending ones, then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
