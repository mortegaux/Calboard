# Calboard Docker Image
# Multi-stage build for smaller final image

FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:22-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S calboard && \
    adduser -S calboard -u 1001

# Set working directory
WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY --chown=calboard:calboard server.js ./
COPY --chown=calboard:calboard public ./public
COPY --chown=calboard:calboard config.example.json ./

# Create config directory with proper permissions
RUN mkdir -p /app/data && \
    chown -R calboard:calboard /app/data

# Switch to non-root user
USER calboard

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/config', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
