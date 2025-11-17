# Implementation Plan: Pomodoro Task Planning Application

**Branch**: `001-pomodoro-task-planner` | **Date**: 2025-11-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-pomodoro-task-planner/spec.md`

## Summary

Build a comprehensive Pomodoro-based task planning web application with three development phases:
- **Phase 1 (MVP)**: Core task management, Pomodoro timer, interruption handling, and basic analytics for single users
- **Phase 2 (Collaboration)**: Group management, OAuth authentication, and data export capabilities
- **Phase 3 (Advanced)**: Predictive analytics, efficiency heatmaps, recurring tasks, and public API

**Technical Approach**: Full-stack JavaScript/TypeScript web application with Vue 3 frontend, Node.js backend, MongoDB database, containerized deployment using Docker Compose.

## Technical Context

**Language/Version**: JavaScript/TypeScript (Node.js 18 LTS for backend, ES2022 for frontend)
**Primary Dependencies**:
- Backend: Express.js, Mongoose ODM, Passport.js (authentication), Socket.io (real-time notifications)
- Frontend: Vue 3 (Composition API), Pinia (state management), Tailwind CSS, Chart.js, Vite
**Storage**: MongoDB 6.0+ (document database for flexible schema evolution across phases)
**Testing**:
- Backend: Jest + Supertest (API tests), MongoDB Memory Server (integration tests)
- Frontend: Vitest + Vue Test Utils (component tests), Playwright (E2E tests)
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+), responsive design for mobile/tablet
**Project Type**: Web application (frontend + backend)
**Performance Goals**:
- API response time: <200ms p95 for CRUD operations
- Timer accuracy: ±1 second for Pomodoro countdown
- Analytics data loading: <2 seconds for 6-month time range
- Frontend initial load: <3 seconds on 3G connection
**Constraints**:
- Background notifications must work when browser tab inactive
- Offline support for active Pomodoro session (service worker caching)
- GDPR/CCPA compliant data storage and export
- Scalable to 10,000 concurrent users (Phase 3)
**Scale/Scope**:
- Phase 1: 100-1,000 users, ~15-20 screens/components
- Phase 2: 1,000-5,000 users, group collaboration features
- Phase 3: 5,000-10,000 users, advanced analytics and API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify adherence to project constitution principles (see `.specify/memory/constitution.md`):

- [x] **TDD Workflow**: Test-first approach planned and documented in tasks
- [x] **Code Readability**: Clear folder structure and naming conventions defined
- [x] **Simplicity First**: Solution uses simplest approach; complexity justified if needed
- [x] **Functional Programming**: Immutability and pure functions prioritized where practical
- [x] **SOLID/DRY/KISS**: Design adheres to standard software quality principles
- [x] **Testing Strategy**: Unit, integration, and contract tests planned
- [x] **Code Quality Tools**: ESLint, Prettier, TypeScript (where applicable) configured

**Complexity Justification** (if any principle violated):

| Principle Violation | Why Needed | Simpler Alternative Rejected Because |
|-------------------|------------|-------------------------------------|
| Mutable timer state (Vuex/Pinia) | Pomodoro timer requires centralized, reactive state updates across components | Immutable state with interval updates would cause excessive re-renders and memory usage |
| Socket.io for notifications | Real-time push notifications when timer ends, even if tab inactive | Polling would drain battery, miss notifications, and increase server load |
| MongoDB over SQL | Flexible schema needed for evolving features across 3 phases; group features require nested documents | SQL migrations would slow down iterative development; NoSQL better for this use case |

## Project Structure

### Documentation (this feature)

```text
specs/001-pomodoro-task-planner/
├── plan.md              # This file
├── research.md          # Phase 0 output (tech decisions, best practices)
├── data-model.md        # Phase 1 output (MongoDB schemas, relationships)
├── quickstart.md        # Phase 1 output (local development guide)
├── contracts/           # Phase 1 output (API contracts)
│   ├── auth.openapi.yaml
│   ├── tasks.openapi.yaml
│   ├── pomodoro.openapi.yaml
│   ├── analytics.openapi.yaml
│   └── groups.openapi.yaml (Phase 2)
└── tasks.md             # Phase 2 output (via /speckit.tasks - NOT created yet)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/           # Mongoose schemas
│   │   ├── User.ts
│   │   ├── Task.ts
│   │   ├── PomodoroSession.ts
│   │   ├── Interruption.ts
│   │   ├── Configuration.ts
│   │   └── Group.ts (Phase 2)
│   ├── services/         # Business logic (pure functions where possible)
│   │   ├── auth/
│   │   │   ├── authService.ts
│   │   │   ├── jwtService.ts
│   │   │   └── oauthService.ts (Phase 2)
│   │   ├── tasks/
│   │   │   ├── taskService.ts
│   │   │   └── taskRecommendation.ts
│   │   ├── pomodoro/
│   │   │   ├── pomodoroService.ts
│   │   │   ├── timerService.ts
│   │   │   └── interruptionService.ts
│   │   ├── analytics/
│   │   │   ├── analyticsService.ts
│   │   │   ├── metricsCalculator.ts
│   │   │   └── trendAnalysis.ts (Phase 3)
│   │   ├── groups/       (Phase 2)
│   │   │   ├── groupService.ts
│   │   │   └── invitationService.ts
│   │   └── export/       (Phase 2)
│   │       ├── csvExport.ts
│   │       └── googleSheetsExport.ts
│   ├── api/              # Express routes and controllers
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── tasks.ts
│   │   │   ├── pomodoro.ts
│   │   │   ├── analytics.ts
│   │   │   └── groups.ts (Phase 2)
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize.ts
│   │   │   ├── validate.ts
│   │   │   └── errorHandler.ts
│   │   └── validators/
│   │       ├── taskValidators.ts
│   │       ├── userValidators.ts
│   │       └── pomodoroValidators.ts
│   ├── sockets/          # Socket.io event handlers
│   │   ├── pomodoroEvents.ts
│   │   └── notificationEvents.ts
│   ├── utils/            # Helper functions (pure where possible)
│   │   ├── dateUtils.ts
│   │   ├── validationUtils.ts
│   │   └── logger.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── passport.ts
│   │   └── environment.ts
│   └── server.ts         # Express app initialization
├── tests/
│   ├── unit/             # Pure function tests
│   │   ├── services/
│   │   └── utils/
│   ├── integration/      # API + DB tests
│   │   ├── auth.test.ts
│   │   ├── tasks.test.ts
│   │   ├── pomodoro.test.ts
│   │   └── analytics.test.ts
│   └── contract/         # API contract validation
│       └── openapi.test.ts
├── package.json
├── tsconfig.json
└── Dockerfile

frontend/
├── src/
│   ├── components/       # Vue 3 components (Composition API)
│   │   ├── common/
│   │   │   ├── AppButton.vue
│   │   │   ├── AppInput.vue
│   │   │   └── AppModal.vue
│   │   ├── auth/
│   │   │   ├── LoginForm.vue
│   │   │   └── RegisterForm.vue
│   │   ├── tasks/
│   │   │   ├── TaskList.vue
│   │   │   ├── TaskItem.vue
│   │   │   ├── TaskForm.vue
│   │   │   └── TaskFilters.vue
│   │   ├── pomodoro/
│   │   │   ├── PomodoroTimer.vue
│   │   │   ├── TimerControls.vue
│   │   │   ├── InterruptionModal.vue
│   │   │   └── BreakNotification.vue
│   │   ├── analytics/
│   │   │   ├── AnalyticsDashboard.vue
│   │   │   ├── CompletionRateChart.vue
│   │   │   ├── PomodoroAccuracyChart.vue
│   │   │   ├── TimeDistribution.vue
│   │   │   └── TaskTrends.vue
│   │   └── groups/       (Phase 2)
│   │       ├── GroupList.vue
│   │       ├── GroupSettings.vue
│   │       └── MemberManagement.vue
│   ├── pages/            # Route components
│   │   ├── HomePage.vue
│   │   ├── LoginPage.vue
│   │   ├── RegisterPage.vue
│   │   ├── TasksPage.vue
│   │   ├── ApplyModePage.vue
│   │   ├── AnalyticsPage.vue
│   │   └── SettingsPage.vue
│   ├── stores/           # Pinia stores (state management)
│   │   ├── authStore.ts
│   │   ├── taskStore.ts
│   │   ├── pomodoroStore.ts
│   │   ├── analyticsStore.ts
│   │   └── groupStore.ts (Phase 2)
│   ├── services/         # API client (pure functions)
│   │   ├── api.ts        # Axios instance
│   │   ├── authApi.ts
│   │   ├── taskApi.ts
│   │   ├── pomodoroApi.ts
│   │   ├── analyticsApi.ts
│   │   └── socket.ts     # Socket.io client
│   ├── composables/      # Reusable composition functions
│   │   ├── useAuth.ts
│   │   ├── useTasks.ts
│   │   ├── usePomodoro.ts
│   │   └── useNotifications.ts
│   ├── utils/
│   │   ├── dateFormatter.ts
│   │   ├── validation.ts
│   │   └── storage.ts    # LocalStorage helpers
│   ├── router/
│   │   └── index.ts      # Vue Router config
│   ├── assets/
│   │   └── styles/
│   │       └── main.css  # Tailwind imports
│   ├── App.vue
│   └── main.ts
├── tests/
│   ├── unit/             # Component tests
│   │   └── components/
│   ├── integration/      # Multi-component tests
│   │   └── pages/
│   └── e2e/              # Playwright E2E tests
│       ├── auth.spec.ts
│       ├── tasks.spec.ts
│       └── pomodoro.spec.ts
├── public/
│   ├── service-worker.js # Background notifications
│   └── manifest.json     # PWA manifest
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── Dockerfile

# Root level
docker-compose.yml        # Orchestrates backend + frontend + MongoDB
.env.example
.eslintrc.js
.prettierrc
README.md
```

**Structure Decision**: Web application structure (Option 2) selected based on:
- Separate backend (Node.js/Express) and frontend (Vue 3) for clear separation of concerns
- Allows independent deployment and scaling
- Backend follows service-oriented architecture (models → services → API routes)
- Frontend uses feature-based organization (auth, tasks, pomodoro, analytics)
- Functional programming principles applied: services contain pure functions, Pinia stores isolated mutable state
- Docker Compose orchestrates all services for development and deployment

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Mutable Pinia store state | Vue 3 reactivity system requires mutable state for component updates; Pomodoro timer ticks every second | Immutable Redux-style approach would require creating new state objects every second, causing performance issues and memory churn |
| Socket.io bidirectional communication | Real-time timer sync across tabs, push notifications when timer ends, collaborative features (Phase 2) | Server-Sent Events (SSE) are unidirectional; WebSocket raw API lacks reconnection logic and event namespacing |
| Three-tier architecture (client, API, DB) | Clear separation enables independent testing, scaling, and deployment; aligns with RESTful best practices | Single-tier monolith would violate SOLID principles, make testing difficult, and prevent horizontal scaling |

---

## Phase 0: Research & Technology Decisions

**Status**: ✅ Complete (based on tech-stack.md)

### Research Topics Resolved

1. **Authentication Strategy**
   - **Decision**: JWT tokens with httpOnly cookies for Phase 1, add OAuth 2.0 (Google) in Phase 2
   - **Rationale**: JWT provides stateless authentication suitable for API-first architecture; httpOnly cookies prevent XSS attacks
   - **Alternatives Considered**: Session-based auth (requires Redis/sticky sessions, adds complexity), OAuth-only (too complex for MVP)

2. **Real-Time Notification Strategy**
   - **Decision**: Socket.io for WebSocket communication + Service Workers for background notifications
   - **Rationale**: Socket.io provides automatic reconnection, event namespacing, and fallback to long-polling; Service Workers enable notifications when tab inactive
   - **Alternatives Considered**: Server-Sent Events (unidirectional only), native WebSocket (lacks reconnection), Push API only (requires backend push service)

3. **State Management**
   - **Decision**: Pinia (official Vue 3 state management)
   - **Rationale**: Lightweight, TypeScript-first, Composition API support, DevTools integration
   - **Alternatives Considered**: Vuex (legacy, verbose), plain reactive() (no DevTools, no structure), Redux (overkill for Vue)

4. **Database Schema Design**
   - **Decision**: MongoDB with Mongoose ODM
   - **Rationale**: Flexible schema evolution across phases, nested documents for groups/interruptions, horizontal scaling capability
   - **Alternatives Considered**: PostgreSQL (rigid migrations, poor fit for nested data), DynamoDB (vendor lock-in, complex queries)

5. **Testing Strategy**
   - **Decision**: Jest (backend unit), Supertest (API integration), Vitest (frontend unit), Playwright (E2E)
   - **Rationale**: Jest/Vitest share similar APIs (easy context switching), Playwright provides cross-browser E2E coverage
   - **Alternatives Considered**: Mocha/Chai (more verbose), Cypress (slower, more flaky), Selenium (outdated)

6. **Deployment Strategy**
   - **Decision**: Docker Compose for development, Docker Swarm or Kubernetes for production (Phase 3)
   - **Rationale**: Compose provides simple local dev environment, easy migration to orchestration platforms
   - **Alternatives Considered**: Native installs (environment inconsistency), Kubernetes-only (overkill for MVP), Heroku (vendor lock-in)

### Best Practices Identified

- **Backend**:
  - Use Express.js middleware pattern for cross-cutting concerns (auth, validation, logging)
  - Implement repository pattern for data access (isolate Mongoose from business logic)
  - Use dependency injection for services (easier testing)
  - Structured logging with Winston (JSON format for log aggregation)

- **Frontend**:
  - Composition API with `<script setup>` syntax (concise, better TypeScript inference)
  - Feature-based folder structure (co-locate related components)
  - Composables for reusable logic (useAuth, usePomodoro, etc.)
  - Chart.js with custom color palette for accessibility (WCAG AA contrast)

- **Testing**:
  - TDD workflow: Write contract tests → integration tests → unit tests → implementation
  - Use MongoDB Memory Server for integration tests (fast, isolated)
  - Mock Socket.io in frontend tests (avoid flaky WebSocket connections)
  - E2E tests for critical user journeys only (auth, create task, run Pomodoro)

- **DevOps**:
  - Environment variables for all config (12-factor app)
  - Health check endpoints (`/health`) for container orchestration
  - Graceful shutdown handling (finish active requests before killing)
  - Centralized error handling with standardized error responses

**Output**: [research.md](research.md) (detailed research findings - to be generated)

---

## Phase 1: Design & Data Modeling

**Prerequisites**: Research complete

### Data Model

**Output**: [data-model.md](data-model.md)

Key entities and relationships:

1. **User** (Phase 1)
   - Fields: email, passwordHash, name, timezone, createdAt
   - Relationships: One-to-many with Task, PomodoroSession, Configuration
   - Indexes: email (unique), createdAt

2. **Task** (Phase 1)
   - Fields: userId, name, description, estimatedPomodoros, actualPomodoros, status, dueDate, grouping, createdAt, updatedAt
   - Relationships: One-to-many with PomodoroSession
   - Indexes: userId + status, userId + dueDate, userId + grouping

3. **PomodoroSession** (Phase 1)
   - Fields: userId, taskId, startTime, endTime, duration, completed, interruptions[] (embedded)
   - Relationships: Many-to-one with Task, embeds Interruption documents
   - Indexes: userId + startTime, taskId + startTime

4. **Interruption** (Phase 1, embedded in PomodoroSession)
   - Fields: type (urgent|break), duration, timestamp, notes
   - No standalone collection (embedded document)

5. **Configuration** (Phase 1)
   - Fields: userId, pomodoroDuration, shortBreak, longBreak, longBreakInterval, dailyUsageStart, dailyUsageEnd
   - Relationships: One-to-one with User
   - Indexes: userId (unique)

6. **Group** (Phase 2)
   - Fields: name, adminIds[], memberIds[], settings (embedded config), createdAt
   - Relationships: Many-to-many with User
   - Indexes: adminIds, memberIds

7. **AnalyticsCache** (Phase 3, optimization)
   - Fields: userId, timeRange, metrics (JSON), generatedAt, expiresAt
   - TTL index on expiresAt (auto-delete expired cache)

### API Contracts

**Output**: [contracts/](contracts/) directory with OpenAPI 3.0 specs

1. **auth.openapi.yaml**: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me
2. **tasks.openapi.yaml**: GET /tasks, POST /tasks, GET /tasks/:id, PUT /tasks/:id, DELETE /tasks/:id
3. **pomodoro.openapi.yaml**: POST /pomodoro/start, POST /pomodoro/pause, POST /pomodoro/complete, POST /pomodoro/interrupt
4. **analytics.openapi.yaml**: GET /analytics/completion-rate, GET /analytics/pomodoro-accuracy, GET /analytics/time-distribution
5. **groups.openapi.yaml** (Phase 2): Full CRUD for groups + member management

### Quickstart Guide

**Output**: [quickstart.md](quickstart.md)

Local development setup:
1. Prerequisites: Node.js 18+, Docker, Docker Compose
2. Clone repo and install dependencies
3. Copy `.env.example` to `.env` and configure
4. Run `docker-compose up` (starts backend, frontend, MongoDB)
5. Access frontend at `http://localhost:5173`, backend at `http://localhost:3000`
6. Run tests: `npm test` (backend), `npm run test:unit` (frontend)
7. TDD workflow example: Write failing test → implement → verify green

---

## Phase 2: Implementation Planning

**Note**: Detailed task breakdown generated by `/speckit.tasks` command.

### Implementation Phases Overview

**Phase 1.1: Core Task Management and Basic Authentication** (Priority: P1)
- User registration and login (JWT auth)
- Task CRUD operations
- Basic Pomodoro timer configuration
- Database schema setup

**Phase 1.2: Pomodoro Timer and Interruption Handling** (Priority: P2)
- Pomodoro timer with WebSocket updates
- Timer end notifications (browser + service worker)
- Pause/abort with interruption logging
- Break time suggestions (short break, long break intervals)

**Phase 1.3: Data Analytics and Advanced Task Management** (Priority: P2)
- Analytics calculations (completion rate, Pomodoro accuracy, time distribution)
- Task recommendation algorithm (3-5 suggestions based on available time)
- Chart.js visualizations
- Additional task fields (description, due date, grouping)

**Phase 2: Collaboration and External Integration** (Priority: P4)
- OAuth 2.0 authentication (Google)
- Group management (CRUD, roles, invitations)
- Group analytics dashboard
- CSV/XLSX export
- Google Sheets integration (OAuth-based)

**Phase 3: Advanced Features and Optimization** (Priority: P5)
- Predictive analytics (ML model for task duration estimation)
- Efficiency heatmap (time-of-day productivity visualization)
- Interruption pattern analysis
- Recurring tasks (cron-based scheduling)
- Public REST API with rate limiting
- Performance optimization (caching, query optimization, CDN)

### Testing Strategy

**Test Pyramid** (constitution-mandated TDD approach):

1. **Unit Tests** (70% coverage target)
   - Pure functions in services/ and utils/
   - Composables and helper functions
   - Run in milliseconds, no external dependencies

2. **Integration Tests** (20% coverage target)
   - API endpoints with MongoDB Memory Server
   - Multi-service interactions
   - Socket.io event flows

3. **Contract Tests** (OpenAPI validation)
   - Verify API responses match OpenAPI specs
   - Catch breaking changes before deployment

4. **E2E Tests** (10% coverage target, critical paths only)
   - User registration → create task → run Pomodoro → view analytics
   - Group creation → invite member → assign task → view group analytics

**TDD Workflow Enforcement**:
- Pre-commit hook: Verify tests exist for changed files
- CI/CD pipeline: Fail on test failures or coverage drops
- Code review checklist: Verify tests written before implementation

---

## Next Steps

1. **Generate Phase 0 artifacts**: Create `research.md` with detailed research findings
2. **Generate Phase 1 artifacts**: Create `data-model.md`, `contracts/`, `quickstart.md`
3. **Update agent context**: Run `.specify/scripts/bash/update-agent-context.sh claude`
4. **Generate tasks**: Run `/speckit.tasks` to create detailed task breakdown by user story
5. **Begin implementation**: Start with Phase 1.1 (Core Task Management) following TDD workflow

---

**Constitution Re-Check** (Post-Design):

- [x] **TDD Workflow**: Test pyramid defined, TDD workflow documented in quickstart.md
- [x] **Code Readability**: Feature-based folder structure, naming conventions established
- [x] **Simplicity First**: Minimal viable architecture (Express + Vue + MongoDB), no over-engineering
- [x] **Functional Programming**: Services use pure functions, mutable state isolated to Pinia stores
- [x] **SOLID/DRY/KISS**: Separation of concerns (models/services/API), middleware pattern, composables for reuse
- [x] **Testing Strategy**: Unit, integration, contract, E2E tests planned with TDD enforcement
- [x] **Code Quality Tools**: ESLint, Prettier, TypeScript configured in quickstart.md

**Status**: ✅ Ready for Phase 0 and Phase 1 artifact generation
