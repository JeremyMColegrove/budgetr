# ============================================================================
# Budget Blueprint Backend Server - Production Dockerfile
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# ----------------------------------------------------------------------------
# Stage 2: Build
# ----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 3: Production
# ----------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["node", "dist/index.js"]
