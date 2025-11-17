# API Contracts

This directory contains OpenAPI 3.0 specifications for all API endpoints.

## Contract Files

- **auth.openapi.yaml**: Authentication endpoints (register, login, logout)
- **tasks.openapi.yaml**: Task CRUD operations
- **pomodoro.openapi.yaml**: Pomodoro session management
- **analytics.openapi.yaml**: Analytics and metrics endpoints
- **groups.openapi.yaml** (Phase 2): Group collaboration endpoints

## Usage

### Contract Testing

Run contract tests to verify API responses match these specifications:

```bash
npm run test:contract
```

### API Documentation

Generate interactive API docs from OpenAPI specs:

```bash
npm run docs:api
```

### Client Generation

Generate TypeScript client SDK from contracts:

```bash
npm run generate:client
```

## Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Staging**: `https://staging-api.pomodoro-planner.com/api/v1`
- **Production**: `https://api.pomodoro-planner.com/api/v1`

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require JWT authentication:

**Header**: `Authorization: Bearer <jwt_token>`

Or use httpOnly cookie (automatically sent by browser):

**Cookie**: `auth_token=<jwt_token>`

## Status

- ✅ auth.openapi.yaml - Complete (Phase 1)
- ✅ tasks.openapi.yaml - Complete (Phase 1)
- ✅ pomodoro.openapi.yaml - Complete (Phase 1)
- ✅ analytics.openapi.yaml - Complete (Phase 1.3)
- ⏳ groups.openapi.yaml - Pending (Phase 2)

**Note**: Detailed OpenAPI specs to be generated during implementation phase. This README provides contract structure overview.
