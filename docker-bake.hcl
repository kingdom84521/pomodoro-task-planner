# ============================================
# Docker Buildx Bake Configuration
# ============================================
# Usage:
#   docker buildx bake                    # Build all images
#   docker buildx bake frontend           # Build frontend only
#   docker buildx bake backend            # Build backend only
#   docker buildx bake --push             # Build and push to registry
# ============================================

# Variables (can be overridden via environment or --set flag)
variable "REGISTRY" {
  default = ""
}

variable "TAG" {
  default = "latest"
}

# Frontend build arguments
variable "VITE_API_BASE_URL" {
  default = ""
}

variable "VITE_MOCK_AUTH" {
  default = "false"
}

variable "VITE_ZITADEL_DOMAIN" {
  default = ""
}

variable "VITE_ZITADEL_CLIENT_ID" {
  default = ""
}

variable "VITE_ZITADEL_REDIRECT_URI" {
  default = ""
}

variable "VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI" {
  default = ""
}

# ============================================
# Groups
# ============================================

group "default" {
  targets = ["frontend", "backend"]
}

# ============================================
# Targets
# ============================================

target "frontend" {
  context    = "."
  dockerfile = "packages/frontend/Dockerfile"
  tags       = [
    "${REGISTRY}pomodoro-frontend:${TAG}",
    "${REGISTRY}pomodoro-frontend:latest"
  ]
  args = {
    VITE_API_BASE_URL                     = VITE_API_BASE_URL
    VITE_MOCK_AUTH                        = VITE_MOCK_AUTH
    VITE_ZITADEL_DOMAIN                   = VITE_ZITADEL_DOMAIN
    VITE_ZITADEL_CLIENT_ID                = VITE_ZITADEL_CLIENT_ID
    VITE_ZITADEL_REDIRECT_URI             = VITE_ZITADEL_REDIRECT_URI
    VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI = VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI
  }
}

target "backend" {
  context    = "."
  dockerfile = "packages/backend/Dockerfile"
  tags       = [
    "${REGISTRY}pomodoro-backend:${TAG}",
    "${REGISTRY}pomodoro-backend:latest"
  ]
}
