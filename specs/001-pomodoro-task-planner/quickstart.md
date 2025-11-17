# Quickstart Guide: Pomodoro Task Planner

**Feature**: Pomodoro Task Planning Application
**Last Updated**: 2025-11-16

This guide helps you set up the development environment and start contributing to the Pomodoro Task Planner project.

---

## Prerequisites

Ensure you have the following installed:

- **Node.js**: 18 LTS or higher ([download](https://nodejs.org/))
- **Docker**: 24.0+ ([download](https://www.docker.com/products/docker-desktop/))
- **Docker Compose**: 2.20+ (included with Docker Desktop)
- **Git**: Latest version ([download](https://git-scm.com/downloads))

Optional but recommended:
- **VS Code**: With extensions: ESLint, Prettier, Volar (Vue), MongoDB for VS Code
- **Postman** or **Insomnia**: For API testing

---

## Quick Start (5 Minutes)

### 1. Clone Repository

```bash
git clone https://github.com/your-org/pomodoro-task-planner.git
cd pomodoro-task-planner
```

### 2. Environment Setup

Copy environment template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings (defaults work for local development):

```env
# Backend
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/pomodoro_planner
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Frontend
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000

# Database
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=admin123
```

### 3. Start Development Environment

```bash
docker-compose up
```

This starts:
- **Backend** (Node.js/Express) at http://localhost:3000
- **Frontend** (Vue 3/Vite) at http://localhost:5173
- **MongoDB** at mongodb://localhost:27017

**First run takes ~5 minutes** (downloads images, installs dependencies).

### 4. Verify Setup

Open browser to http://localhost:5173

You should see the Pomodoro Task Planner login page.

---

## Development Workflow

### Local Development (Without Docker)

For faster iteration, run frontend and backend separately:

**Terminal 1 (Backend)**:
```bash
cd backend
npm install
npm run dev  # Starts on port 3000 with hot reload
```

**Terminal 2 (Frontend)**:
```bash
cd frontend
npm install
npm run dev  # Starts on port 5173 with HMR
```

**Terminal 3 (MongoDB)**:
```bash
docker run -d -p 27017:27017 --name mongo mongo:6.0
```

### Project Structure Navigation

```
backend/src/
├── models/       # Mongoose schemas (User, Task, PomodoroSession, etc.)
├── services/     # Business logic (pure functions where possible)
├── api/          # Express routes, middleware, validators
├── sockets/      # Socket.io event handlers
├── utils/        # Helper functions
└── config/       # Database, Passport, environment config

frontend/src/
├── components/   # Vue 3 components (Composition API)
├── pages/        # Route components
├── stores/       # Pinia state management
├── services/     # API client (Axios)
├── composables/  # Reusable composition functions
└── router/       # Vue Router config
```

---

## TDD Workflow (Constitution-Mandated)

**RED → GREEN → REFACTOR**

### 1. Write Test First

```bash
# Backend unit test
cd backend
npm run test:watch
```

Create test file: `backend/tests/unit/services/taskService.test.ts`

```typescript
import { createTask } from '@/services/tasks/taskService';

describe('createTask', () => {
  it('should create a task with valid input', async () => {
    const input = {
      userId: 'user123',
      name: 'Write documentation',
      estimatedPomodoros: 3,
    };

    const result = await createTask(input);

    expect(result).toHaveProperty('_id');
    expect(result.name).toBe('Write documentation');
    expect(result.estimatedPomodoros).toBe(3);
    expect(result.status).toBe('pending');
  });
});
```

**Verify test FAILS** (RED state) ✗

### 2. Implement Feature

Create implementation: `backend/src/services/tasks/taskService.ts`

```typescript
import { Task } from '@/models/Task';

export async function createTask(input: {
  userId: string;
  name: string;
  estimatedPomodoros: number;
}) {
  const task = new Task({
    userId: input.userId,
    name: input.name,
    estimatedPomodoros: input.estimatedPomodoros,
    status: 'pending',
  });

  return await task.save();
}
```

**Verify test PASSES** (GREEN state) ✓

### 3. Refactor

Improve code quality while keeping tests green:

```typescript
import { Task, ITask } from '@/models/Task';

interface CreateTaskInput {
  userId: string;
  name: string;
  estimatedPomodoros: number;
}

export const createTask = async (input: CreateTaskInput): Promise<ITask> => {
  const task = new Task({
    ...input,
    status: 'pending',
  });

  return await task.save();
};
```

**Verify tests still PASS** ✓

### 4. Commit

```bash
git add backend/src/services/tasks/taskService.ts backend/tests/unit/services/taskService.test.ts
git commit -m "feat(tasks): implement createTask service

- Add createTask function with input validation
- Write unit tests for task creation
- Follows TDD workflow: test-first approach

Refs: #001-pomodoro-task-planner"
```

---

## Running Tests

### Backend Tests

```bash
cd backend

# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires MongoDB)
npm run test:integration

# Contract tests (OpenAPI validation)
npm run test:contract

# Watch mode (re-runs on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Frontend Tests

```bash
cd frontend

# Unit tests (components, composables)
npm run test:unit

# E2E tests (Playwright)
npm run test:e2e

# E2E with UI (interactive debugging)
npm run test:e2e:ui

# Coverage
npm run test:coverage
```

---

## Code Quality Tools

### Linting

```bash
# Backend
cd backend
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues

# Frontend
cd frontend
npm run lint
npm run lint:fix
```

### Formatting

```bash
# Both backend and frontend
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting without changes
```

### TypeScript Type Checking

```bash
# Backend
cd backend
npm run type-check

# Frontend
cd frontend
npm run type-check
```

### Pre-Commit Hooks

Husky + lint-staged run automatically before each commit:

1. ESLint on changed files
2. Prettier formatting
3. TypeScript type checking
4. Unit tests for changed modules

---

## Database Management

### Access MongoDB Shell

```bash
docker exec -it pomodoro_planner_mongodb mongosh

# Inside mongosh:
use pomodoro_planner
db.users.find().pretty()
db.tasks.find().pretty()
```

### Reset Database (Development Only)

```bash
docker-compose down -v  # Deletes volumes
docker-compose up       # Fresh start
```

### Seed Development Data

```bash
cd backend
npm run seed:dev  # Creates sample users, tasks, sessions
```

---

## API Testing

### Using Postman

1. Import OpenAPI specs from `specs/001-pomodoro-task-planner/contracts/`
2. Set base URL: `http://localhost:3000/api/v1`
3. Authenticate: POST `/auth/login` → Copy JWT token
4. Set Authorization header: `Bearer <token>`

### Using cURL

**Register user**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}'
```

**Login**:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  -c cookies.txt  # Save cookie
```

**Create task** (authenticated):
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Write tests", "estimatedPomodoros": 2}'
```

---

## Common Tasks

### Add New Dependency

```bash
# Backend
cd backend
npm install <package>
npm install -D <package>  # Dev dependency

# Frontend
cd frontend
npm install <package>
```

### Generate New Component (Frontend)

```bash
cd frontend
npm run generate:component TaskTimer  # Creates boilerplate
```

### Generate New Model (Backend)

```bash
cd backend
npm run generate:model Notification  # Creates Mongoose schema
```

### View Logs

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# MongoDB only
docker-compose logs -f mongodb
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### MongoDB Connection Failed

```bash
# Restart MongoDB container
docker-compose restart mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

### Frontend Not Hot Reloading

```bash
# Restart frontend container
docker-compose restart frontend

# Or run locally (faster HMR)
cd frontend && npm run dev
```

### Tests Failing After Git Pull

```bash
# Reinstall dependencies
cd backend && npm ci
cd frontend && npm ci

# Rebuild Docker images
docker-compose build --no-cache
```

---

## Next Steps

1. ✅ Development environment set up
2. ✅ Tests running successfully
3. 📖 Read [data-model.md](data-model.md) to understand database schema
4. 📖 Review [plan.md](plan.md) for implementation approach
5. 🚀 Pick a task from [tasks.md](tasks.md) (to be generated)
6. 💻 Start coding following TDD workflow!

---

## Resources

- **Project Documentation**: [specs/001-pomodoro-task-planner/](.)
- **Constitution**: [.specify/memory/constitution.md](../../.specify/memory/constitution.md)
- **API Contracts**: [contracts/](contracts/)
- **Vue 3 Docs**: https://vuejs.org/guide/introduction.html
- **Pinia Docs**: https://pinia.vuejs.org/
- **Mongoose Docs**: https://mongoosejs.com/docs/guide.html
- **Socket.io Docs**: https://socket.io/docs/v4/

---

**Happy coding! 🍅🚀**
