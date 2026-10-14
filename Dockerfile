FROM node:22-slim

ENV NODE_ENV=production \
    NODE_OPTIONS="--no-network-family-autoselection --dns-result-order=ipv4first"

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so this layer is cached between code changes
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev

# App code
COPY --chown=node:node . .

# Writable folder for the SQLite database
RUN mkdir -p /app/database && chown node:node /app/database

USER node
EXPOSE 5000

HEALTHCHECK --interval=60s --timeout=10s --start-period=20s \
  CMD curl -fs "http://localhost:5000/" >/dev/null || exit 1

CMD ["node", "index.js"]