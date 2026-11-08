# syntax=docker/dockerfile:1

# ---- build stage: install deps (incl. native better-sqlite3) and build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Toolchain used if better-sqlite3 has no prebuilt binary and falls back to
# compiling from source.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime stage ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    LAROUTINE_DB_PATH=/data/laroutine.db

# Standalone output already contains the traced node_modules (including the
# compiled better-sqlite3 binary built in the stage above, same base image).
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Single volume holding the SQLite file, owned by the non-root user.
RUN mkdir -p /data && chown node:node /data
VOLUME /data

USER node
EXPOSE 3000
CMD ["node", "server.js"]
