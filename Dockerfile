# ============================================================================
# Budget Blueprint Frontend - Production Dockerfile
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
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

# Build argument for API URL
ARG VITE_API_URL=http://host.docker.internal:3001

# Set environment variable for Vite build
ENV VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# ----------------------------------------------------------------------------
# Stage 3: Production - Serve with nginx
# ----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 5173

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
