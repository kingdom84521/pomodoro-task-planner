# ============================================
# Backend Dockerfile
# ============================================
FROM node:20-alpine

# Install necessary packages for Yarn 4
RUN corepack enable && corepack prepare yarn@4.12.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Copy backend package manifest
COPY packages/backend/package.json packages/backend/

# Install production dependencies only
RUN yarn workspaces focus backend --production

# Copy backend source code
COPY packages/backend packages/backend

# Copy and set up entrypoint script
COPY packages/backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Use entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
