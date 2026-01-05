# ============================================
# Stage 1: Build the Vue.js application
# ============================================
FROM node:20-alpine AS builder

# Install necessary packages for Yarn 4
RUN corepack enable && corepack prepare yarn@4.12.0 --activate

WORKDIR /app

# Copy workspace configuration
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

# Copy package manifests for dependency installation
COPY packages/frontend/package.json packages/frontend/

# Install dependencies
RUN yarn install --immutable

# Copy frontend source code
COPY packages/frontend packages/frontend

# Build-time arguments for Vite environment variables
ARG VITE_API_BASE_URL
ARG VITE_MOCK_AUTH=false
ARG VITE_ZITADEL_DOMAIN
ARG VITE_ZITADEL_CLIENT_ID
ARG VITE_ZITADEL_REDIRECT_URI
ARG VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI

# Set environment variables for build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_MOCK_AUTH=${VITE_MOCK_AUTH}
ENV VITE_ZITADEL_DOMAIN=${VITE_ZITADEL_DOMAIN}
ENV VITE_ZITADEL_CLIENT_ID=${VITE_ZITADEL_CLIENT_ID}
ENV VITE_ZITADEL_REDIRECT_URI=${VITE_ZITADEL_REDIRECT_URI}
ENV VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI=${VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI}

# Build the application
RUN yarn build:frontend

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
