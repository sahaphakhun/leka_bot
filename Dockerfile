# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files first for better caching
COPY package*.json ./
COPY dashboard-new/package*.json ./dashboard-new/

# Install dependencies (include dev for build)
RUN npm ci --include=dev
RUN cd dashboard-new && npm ci

# Copy source code (ensure .dockerignore allows src and scripts)
COPY . .

# Build application (backend + dashboard) using helper script
RUN chmod +x railway-build.sh \
 && ./railway-build.sh \
 && npm prune --omit=dev \
 && cd dashboard-new && npm prune --omit=dev && cd ..

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
