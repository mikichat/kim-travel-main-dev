# ===========================================
# Travel Agency Backend Dockerfile
# Multi-stage build for production
# ===========================================

# --- Base Stage ---
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies needed for sqlite3 native module
RUN apk add --no-cache python3 make g++ libc6-compat

# --- Dependencies Stage ---
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# --- Production Stage ---
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY package*.json ./
COPY server.js ./
COPY database.js ./
COPY config.js ./
COPY logger.js ./
COPY swagger.js ./
COPY swagger-defs.js ./
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY services/ ./services/

# Create data directories with correct ownership
RUN mkdir -p data uploads backups logs && \
    chown -R expressjs:nodejs /app

# Switch to non-root user
USER expressjs

# Expose port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production
ENV PORT=5000
ENV DATABASE_PATH=./data/travel.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api-docs/ || exit 1

# Production command
CMD ["node", "server.js"]
