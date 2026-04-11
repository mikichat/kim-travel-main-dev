# ===========================================
# TourWorld Backend Dockerfile
# Multi-stage build for development and production
# ===========================================

# --- Base Stage ---
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# --- Dependencies Stage ---
FROM base AS deps

# Copy package files
COPY package*.json ./
COPY ../shared/package*.json ./shared/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# --- Development Stage ---
FROM base AS development
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Copy shared types
COPY ../shared ./shared

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Development command
CMD ["npm", "run", "dev"]

# --- Builder Stage ---
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Copy shared types
COPY ../shared ./shared

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# --- Production Stage ---
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for scripts
COPY package*.json ./

# Set ownership
RUN chown -R expressjs:nodejs /app

# Switch to non-root user
USER expressjs

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Production command
CMD ["node", "dist/index.js"]
