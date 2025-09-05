# syntax=docker/dockerfile:1

# --- Base build stage ---
FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Install OS deps for building packages where needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    openssl \
    python3 \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY package.json package-lock.json* ./

# Install deps (include dev for build)
RUN npm ci --include=dev

# Copy source
COPY . .

# Build: Tailwind + TypeScript and copy dashboard assets
RUN npm run build

# Prune devDependencies for runtime
RUN npm prune --omit=dev

# --- Runtime stage ---
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN useradd -m nodeuser

# Copy only runtime app from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/register-paths.js ./
COPY --from=base /app/dashboard ./dashboard
COPY --from=base /app/scripts ./scripts
COPY --from=base /app/package.json ./

# Expose port
EXPOSE 3000

USER nodeuser

# Healthcheck hits /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3000)+'/health',res=>{if(res.statusCode!==200)process.exit(1)}).on('error',()=>process.exit(1))"

CMD ["npm","start"]
