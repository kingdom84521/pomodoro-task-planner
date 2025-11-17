# Tasks: Pomodoro Task Planning Application

**Input**: Design documents from `/specs/001-pomodoro-task-planner/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included following TDD workflow as specified in the constitution. Tests MUST be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths shown below follow web application structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create root project structure (backend/, frontend/, docker-compose.yml, .env.example)
- [x] T002 [P] Initialize backend Node.js project with package.json and tsconfig.json
- [x] T003 [P] Initialize frontend Vue 3 project with Vite, package.json, and tsconfig.json
- [x] T004 [P] Configure ESLint for backend in backend/.eslintrc.js
- [x] T005 [P] Configure ESLint and Prettier for frontend in frontend/.eslintrc.js and frontend/.prettierrc
- [x] T006 [P] Create Docker Compose configuration in docker-compose.yml (backend, frontend, MongoDB services)
- [x] T007 [P] Create backend Dockerfile in backend/Dockerfile (multi-stage build)
- [x] T008 [P] Create frontend Dockerfile in frontend/Dockerfile (multi-stage build with Nginx)
- [x] T009 [P] Configure Tailwind CSS in frontend/tailwind.config.js and frontend/src/assets/styles/main.css
- [x] T010 [P] Set up Git hooks with Husky and lint-staged in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Create MongoDB connection config in backend/src/config/database.ts
- [x] T012 Create environment configuration loader in backend/src/config/environment.ts
- [x] T013 Set up Express app initialization in backend/src/server.ts (middleware, routes, error handling)
- [x] T014 Create centralized error handler middleware in backend/src/api/middleware/errorHandler.ts
- [x] T015 Create authentication middleware in backend/src/api/middleware/authenticate.ts (JWT validation)
- [x] T016 Create Winston logger configuration in backend/src/utils/logger.ts
- [x] T017 [P] Create date utility functions in backend/src/utils/dateUtils.ts (timezone handling, formatting)
- [x] T018 [P] Create validation utility functions in backend/src/utils/validationUtils.ts
- [x] T019 [P] Set up Vue Router configuration in frontend/src/router/index.ts (routes, guards)
- [x] T020 [P] Create Axios API client instance in frontend/src/services/api.ts (interceptors, base URL)
- [x] T021 [P] Create common Vue components in frontend/src/components/common/ (AppButton.vue, AppInput.vue, AppModal.vue)
- [x] T022 Configure Jest for backend in backend/jest.config.js
- [x] T023 Configure Vitest for frontend in frontend/vite.config.ts and frontend/vitest.config.ts
- [x] T024 Set up MongoDB Memory Server for integration tests in backend/tests/setup.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Task Management and Time Tracking (Priority: P1) 🎯 MVP

**Goal**: Enable users to register, create tasks, run Pomodoro sessions, and track time

**Independent Test**: Register → Create task → Start Pomodoro → Timer ends → View task with actual Pomodoros

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T025 [P] [US1] Contract test for /auth/register endpoint in backend/tests/contract/auth.contract.test.ts
- [x] T026 [P] [US1] Contract test for /auth/login endpoint in backend/tests/contract/auth.contract.test.ts
- [x] T027 [P] [US1] Contract test for POST /tasks endpoint in backend/tests/contract/tasks.contract.test.ts
- [x] T028 [P] [US1] Contract test for GET /tasks endpoint in backend/tests/contract/tasks.contract.test.ts
- [x] T029 [P] [US1] Contract test for POST /pomodoro/start endpoint in backend/tests/contract/pomodoro.contract.test.ts
- [x] T030 [P] [US1] Integration test for user registration flow in backend/tests/integration/auth.test.ts
- [x] T031 [P] [US1] Integration test for task CRUD operations in backend/tests/integration/tasks.test.ts
- [x] T032 [P] [US1] Integration test for Pomodoro session lifecycle in backend/tests/integration/pomodoro.test.ts
- [x] T033 [P] [US1] E2E test for complete user journey (register → create task → run Pomodoro) in frontend/tests/e2e/pomodoro-flow.spec.ts

### Implementation for User Story 1

**Backend Models**:

- [x] T034 [P] [US1] Create User model in backend/src/models/User.ts (email, passwordHash, name, timezone)
- [x] T035 [P] [US1] Create Task model in backend/src/models/Task.ts (userId, name, estimatedPomodoros, actualPomodoros, status, description, dueDate)
- [x] T036 [P] [US1] Create PomodoroSession model in backend/src/models/PomodoroSession.ts (userId, taskId, startTime, endTime, duration, completed)
- [x] T037 [P] [US1] Create Configuration model in backend/src/models/Configuration.ts (userId, pomodoroDuration, shortBreak, longBreak, longBreakInterval)

**Backend Services**:

- [x] T038 [US1] Create JWT service in backend/src/services/auth/jwtService.ts (sign, verify, refresh tokens)
- [x] T039 [US1] Create authentication service in backend/src/services/auth/authService.ts (register, login, hash password, validate credentials)
- [x] T040 [P] [US1] Create task service in backend/src/services/tasks/taskService.ts (createTask, updateTask, deleteTask, getUserTasks)
- [x] T041 [P] [US1] Create Pomodoro service in backend/src/services/pomodoro/pomodoroService.ts (startSession, completeSession, updateTaskActualPomodoros)
- [x] T042 [P] [US1] Create timer service in backend/src/services/pomodoro/timerService.ts (timer logic, countdown calculations)

**Backend API**:

- [x] T043 [US1] Create auth validators in backend/src/api/validators/userValidators.ts (register, login validation schemas)
- [x] T044 [US1] Create auth routes in backend/src/api/routes/auth.ts (POST /register, POST /login, POST /logout, GET /me)
- [x] T045 [US1] Create task validators in backend/src/api/validators/taskValidators.ts (create, update validation schemas)
- [x] T046 [US1] Create task routes in backend/src/api/routes/tasks.ts (GET, POST, PUT, DELETE /tasks)
- [x] T047 [US1] Create Pomodoro validators in backend/src/api/validators/pomodoroValidators.ts (start, complete validation schemas)
- [x] T048 [US1] Create Pomodoro routes in backend/src/api/routes/pomodoro.ts (POST /start, POST /complete)

**Backend Real-time**:

- [x] T049 [US1] Set up Socket.io server integration in backend/src/server.ts
- [x] T050 [US1] Create Pomodoro Socket.io events in backend/src/sockets/pomodoroEvents.ts (pomodoro:tick, pomodoro:end, pomodoro:pause, pomodoro:resume)
- [x] T051 [US1] Create notification Socket.io events in backend/src/sockets/notificationEvents.ts (notification:send, notification:acknowledge)

**Frontend State Management**:

- [x] T052 [P] [US1] Create auth store in frontend/src/stores/authStore.ts (login, logout, user state, token management)
- [x] T053 [P] [US1] Create task store in frontend/src/stores/taskStore.ts (tasks array, createTask, updateTask, deleteTask, fetchTasks)
- [x] T054 [P] [US1] Create Pomodoro store in frontend/src/stores/pomodoroStore.ts (activeSession, timerState, startPomodoro, completePomodoro, timerTick)

**Frontend API Clients**:

- [x] T055 [P] [US1] Create auth API client in frontend/src/services/authApi.ts (register, login, logout, getMe)
- [x] T056 [P] [US1] Create task API client in frontend/src/services/taskApi.ts (fetchTasks, createTask, updateTask, deleteTask)
- [x] T057 [P] [US1] Create Pomodoro API client in frontend/src/services/pomodoroApi.ts (startPomodoro, completePomodoro, pausePomodoro)
- [x] T058 [US1] Create Socket.io client in frontend/src/services/socket.ts (connect, disconnect, event listeners)

**Frontend Composables**:

- [x] T059 [P] [US1] Create useAuth composable in frontend/src/composables/useAuth.ts (login, logout, isAuthenticated, currentUser)
- [x] T060 [P] [US1] Create useTasks composable in frontend/src/composables/useTasks.ts (tasks, createTask, updateTask, deleteTask)
- [x] T061 [P] [US1] Create usePomodoro composable in frontend/src/composables/usePomodoro.ts (activeSession, startPomodoro, timerState, handleTimerTick)
- [x] T062 [P] [US1] Create useNotifications composable in frontend/src/composables/useNotifications.ts (showNotification, requestPermission, displayBrowserNotification)

**Frontend Components**:

- [x] T063 [P] [US1] Create LoginForm component in frontend/src/components/auth/LoginForm.vue
- [x] T064 [P] [US1] Create RegisterForm component in frontend/src/components/auth/RegisterForm.vue
- [x] T065 [P] [US1] Create TaskList component in frontend/src/components/tasks/TaskList.vue
- [x] T066 [P] [US1] Create TaskItem component in frontend/src/components/tasks/TaskItem.vue
- [x] T067 [P] [US1] Create TaskForm component in frontend/src/components/tasks/TaskForm.vue (create/edit)
- [x] T068 [P] [US1] Create PomodoroTimer component in frontend/src/components/pomodoro/PomodoroTimer.vue (countdown display)
- [x] T069 [P] [US1] Create TimerControls component in frontend/src/components/pomodoro/TimerControls.vue (start, pause, stop buttons)
- [x] T070 [P] [US1] Create BreakNotification component in frontend/src/components/pomodoro/BreakNotification.vue (timer end notification UI)

**Frontend Pages**:

- [x] T071 [P] [US1] Create HomePage in frontend/src/pages/HomePage.vue (landing/dashboard)
- [x] T072 [P] [US1] Create LoginPage in frontend/src/pages/LoginPage.vue
- [x] T073 [P] [US1] Create RegisterPage in frontend/src/pages/RegisterPage.vue
- [x] T074 [US1] Create TasksPage in frontend/src/pages/TasksPage.vue (task list + task form)
- [x] T075 [US1] Create ApplyModePage in frontend/src/pages/ApplyModePage.vue (select task + Pomodoro timer)

**Integration & Final**:

- [x] T076 [US1] Integrate Socket.io client with Pomodoro store (real-time timer updates)
- [x] T077 [US1] Implement browser notification permission request on first Pomodoro start
- [x] T078 [US1] Add authentication guard to Vue Router (redirect to login if not authenticated)
- [x] T079 [US1] Implement Pinia persistence plugin for auth tokens in localStorage
- [x] T080 [US1] Create Service Worker for background notifications in frontend/public/service-worker.js
- [x] T081 [US1] Add error handling and loading states to all components
- [x] T082 [US1] Run E2E tests and verify all US1 acceptance scenarios pass

---

## Phase 4: User Story 2 - Interruption Handling and Break Management (Priority: P2)

**Goal**: Enable users to pause Pomodoros, log interruptions, and manage breaks

**Independent Test**: Start Pomodoro → Pause → Log interruption → Resume → Complete → Verify interruption recorded

### Tests for User Story 2 ⚠️

- [ ] T083 [P] [US2] Contract test for POST /pomodoro/pause endpoint in backend/tests/contract/pomodoro.contract.test.ts
- [ ] T084 [P] [US2] Contract test for POST /pomodoro/interrupt endpoint in backend/tests/contract/pomodoro.contract.test.ts
- [ ] T085 [P] [US2] Integration test for interruption logging in backend/tests/integration/pomodoro.test.ts
- [ ] T086 [US2] E2E test for pause/resume workflow in frontend/tests/e2e/interruption-flow.spec.ts

### Implementation for User Story 2

**Backend Models**:

- [x] T087 [US2] Add interruptions field (embedded array) to PomodoroSession model in backend/src/models/PomodoroSession.ts

**Backend Services**:

- [x] T088 [US2] Create interruption service in backend/src/services/pomodoro/interruptionService.ts (logInterruption, calculateInterruptionStats)
- [x] T089 [US2] Extend Pomodoro service with pause/resume logic in backend/src/services/pomodoro/pomodoroService.ts (pauseSession, resumeSession, logInterruption)
- [x] T090 [US2] Add break time calculation logic to Configuration model methods (calculateNextBreakType based on completed Pomodoros)

**Backend API**:

- [ ] T091 [US2] Add pause/resume routes to Pomodoro API in backend/src/api/routes/pomodoro.ts (POST /pause, POST /resume, POST /interrupt)

**Backend Real-time**:

- [ ] T092 [US2] Extend Pomodoro Socket.io events for interruptions in backend/src/sockets/pomodoroEvents.ts (pomodoro:paused, pomodoro:resumed, interruption:logged)

**Frontend State Management**:

- [ ] T093 [US2] Extend Pomodoro store with interruption state in frontend/src/stores/pomodoroStore.ts (pausePomodoro, resumePomodoro, logInterruption, interruptions array)

**Frontend API Clients**:

- [ ] T094 [US2] Extend Pomodoro API client with interruption methods in frontend/src/services/pomodoroApi.ts (pausePomodoro, resumePomodoro, logInterruption)

**Frontend Composables**:

- [ ] T095 [US2] Extend usePomodoro composable with interruption handling in frontend/src/composables/usePomodoro.ts (pausePomodoro, resumePomodoro, logInterruption)

**Frontend Components**:

- [ ] T096 [P] [US2] Create InterruptionModal component in frontend/src/components/pomodoro/InterruptionModal.vue (select type, add notes, log duration)
- [ ] T097 [P] [US2] Extend TimerControls component to show pause/resume buttons in frontend/src/components/pomodoro/TimerControls.vue
- [ ] T098 [US2] Create break suggestion UI in BreakNotification component in frontend/src/components/pomodoro/BreakNotification.vue (short break vs long break)

**Frontend Pages**:

- [ ] T099 [US2] Add Configuration form to SettingsPage for break times in frontend/src/pages/SettingsPage.vue (shortBreak, longBreak, longBreakInterval)
- [ ] T100 [US2] Implement daily usage time window logic (overflow handling) in Pomodoro service
- [ ] T101 [US2] Run E2E tests and verify all US2 acceptance scenarios pass

---

## Phase 5: User Story 3 - Task Analytics and Performance Insights (Priority: P2)

**Goal**: Provide users with analytics dashboards showing completion rates, Pomodoro accuracy, and task recommendations

**Independent Test**: Complete several tasks → View analytics page → Check metrics → Verify task recommendations

### Tests for User Story 3 ⚠️

- [ ] T102 [P] [US3] Contract test for GET /analytics/completion-rate endpoint in backend/tests/contract/analytics.contract.test.ts
- [ ] T103 [P] [US3] Contract test for GET /analytics/pomodoro-accuracy endpoint in backend/tests/contract/analytics.contract.test.ts
- [ ] T104 [P] [US3] Integration test for analytics calculations in backend/tests/integration/analytics.test.ts
- [ ] T105 [US3] E2E test for analytics page display in frontend/tests/e2e/analytics-flow.spec.ts

### Implementation for User Story 3

**Backend Services**:

- [ ] T106 [P] [US3] Create metrics calculator service in backend/src/services/analytics/metricsCalculator.ts (completionRate, pomodoroAccuracy, timeDistribution)
- [ ] T107 [P] [US3] Create analytics service in backend/src/services/analytics/analyticsService.ts (getAnalyticsForTimeRange, aggregateMetrics)
- [ ] T108 [US3] Create task recommendation service in backend/src/services/tasks/taskRecommendation.ts (recommendTasks based on available time and estimated effort)

**Backend API**:

- [ ] T109 [US3] Create analytics routes in backend/src/api/routes/analytics.ts (GET /completion-rate, GET /pomodoro-accuracy, GET /time-distribution, GET /task-trends)
- [ ] T110 [US3] Add task recommendation endpoint to task routes in backend/src/api/routes/tasks.ts (GET /tasks/recommendations)

**Frontend State Management**:

- [ ] T111 [US3] Create analytics store in frontend/src/stores/analyticsStore.ts (metrics, timeRange, fetchAnalytics, setTimeRange)

**Frontend API Clients**:

- [ ] T112 [US3] Create analytics API client in frontend/src/services/analyticsApi.ts (fetchCompletionRate, fetchPomodoroAccuracy, fetchTimeDistribution)

**Frontend Components**:

- [ ] T113 [P] [US3] Create AnalyticsDashboard component in frontend/src/components/analytics/AnalyticsDashboard.vue (layout with time range selector)
- [ ] T114 [P] [US3] Create CompletionRateChart component in frontend/src/components/analytics/CompletionRateChart.vue (Chart.js pie chart)
- [ ] T115 [P] [US3] Create PomodoroAccuracyChart component in frontend/src/components/analytics/PomodoroAccuracyChart.vue (Chart.js bar chart)
- [ ] T116 [P] [US3] Create TimeDistribution component in frontend/src/components/analytics/TimeDistribution.vue (Chart.js donut chart)
- [ ] T117 [P] [US3] Create TaskTrends component in frontend/src/components/analytics/TaskTrends.vue (Chart.js line chart)

**Frontend Pages**:

- [ ] T118 [US3] Create AnalyticsPage in frontend/src/pages/AnalyticsPage.vue (analytics dashboard layout)
- [ ] T119 [US3] Extend ApplyModePage with task recommendations section in frontend/src/pages/ApplyModePage.vue (show 3-5 recommended tasks)

**Optimization**:

- [ ] T120 [US3] Optimize analytics queries with MongoDB aggregation pipeline
- [ ] T121 [US3] Run E2E tests and verify all US3 acceptance scenarios pass

---

## Phase 6: User Story 4 - Advanced Task Organization (Priority: P3)

**Goal**: Enable users to organize tasks with descriptions, due dates, and custom grouping using custom fields

**Independent Test**: Create tasks with description, due date, and Status Label custom field → View in kanban/grouped view → Filter and sort → Verify display

### Tests for User Story 4 ⚠️

- [ ] T122 [P] [US4] Contract test for task filtering endpoints in backend/tests/contract/tasks.contract.test.ts
- [ ] T123 [US4] Integration test for task filtering and sorting in backend/tests/integration/tasks.test.ts

### Implementation for User Story 4

**Backend Services**:

- [ ] T124 [US4] Extend task service with filtering and sorting logic in backend/src/services/tasks/taskService.ts (getTasksFiltered, sortByDueDate, filterByCustomFields)

**Backend API**:

- [ ] T125 [US4] Add query parameters to GET /tasks for filtering/sorting in backend/src/api/routes/tasks.ts (customFields, dueDate, status filters)

**Frontend Components**:

- [ ] T126 [P] [US4] Create TaskFilters component in frontend/src/components/tasks/TaskFilters.vue (filter by custom fields, due date, status)
- [ ] T127 [US4] Extend TaskList component with sorting controls in frontend/src/components/tasks/TaskList.vue

**Optimization**:

- [ ] T128 [US4] Add indexes to Task model for performance in backend/src/models/Task.ts (userId + dueDate, userId + customFields)
- [ ] T129 [US4] Implement client-side caching for task list in frontend (reduce API calls)
- [ ] T130 [US4] Run E2E tests and verify all US4 acceptance scenarios pass

---

## Phase 7: User Story 8 - Custom Task Fields (Priority: P3)

**Goal**: Enable users (personal and group) to define custom fields with different data types, use them in tasks, view kanban/grouped views, and integrate with analytics

**Independent Test**: Create custom field definition → Add value to task → Filter by custom field → View kanban by Status Label → Check Time Distribution grouped by custom field → Verify all features work

### Tests for User Story 8 ⚠️

- [ ] T131 [P] [US8] Contract test for POST /custom-fields endpoint in backend/tests/contract/customFields.contract.test.ts
- [ ] T132 [P] [US8] Contract test for GET /custom-fields endpoint in backend/tests/contract/customFields.contract.test.ts
- [ ] T133 [P] [US8] Contract test for predefined custom fields enablement in backend/tests/contract/customFields.contract.test.ts
- [ ] T134 [P] [US8] Integration test for custom field CRUD operations in backend/tests/integration/customFields.test.ts
- [ ] T135 [P] [US8] Integration test for task creation with custom field values in backend/tests/integration/tasks.test.ts
- [ ] T136 [US8] E2E test for complete custom fields journey (create field → add to task → filter → kanban view → analytics grouping) in frontend/tests/e2e/custom-fields-flow.spec.ts

### Implementation for User Story 8

**Backend Models**:

- [ ] T137 [P] [US8] Create CustomFieldDefinition model in backend/src/models/CustomFieldDefinition.ts (fieldName, dataType, validationRules, scope, owner)
- [ ] T138 [US8] Add customFieldValues field (Map/Object) to Task model in backend/src/models/Task.ts (dynamic key-value pairs)
- [ ] T139 [US8] Create predefined custom field seed data in backend/src/models/CustomFieldDefinition.ts (Priority, Tags, Client, Budget, Status Label, Due Time, Notes)

**Backend Services**:

- [ ] T140 [P] [US8] Create custom field service in backend/src/services/customFields/customFieldService.ts (createCustomField, getCustomFields, updateCustomField, deleteCustomField)
- [ ] T141 [P] [US8] Create custom field validation service in backend/src/services/customFields/validationService.ts (validateFieldValue, enforceRequiredFlag, validateDataType)
- [ ] T142 [P] [US8] Create predefined fields service in backend/src/services/customFields/predefinedFieldsService.ts (getPredefinedFields, enablePredefinedField, disablePredefinedField)
- [ ] T143 [US8] Extend task service to handle custom field values in backend/src/services/tasks/taskService.ts (saveCustomFieldValues, validateCustomFieldValues, filterByCustomField)
- [ ] T144 [US8] Extend analytics service to support grouping by custom fields in backend/src/services/analytics/analyticsService.ts (groupTimeDistributionByCustomField)

**Backend API**:

- [ ] T145 [US8] Create custom field validators in backend/src/api/validators/customFieldValidators.ts (create, update validation schemas)
- [ ] T146 [US8] Create custom field routes in backend/src/api/routes/customFields.ts (GET, POST, PUT, DELETE /custom-fields, GET /custom-fields/predefined)
- [ ] T147 [US8] Extend task routes to accept customFieldValues in backend/src/api/routes/tasks.ts (POST, PUT /tasks with customFieldValues)
- [ ] T148 [US8] Add custom field grouping parameter to analytics routes in backend/src/api/routes/analytics.ts (GET /time-distribution?groupBy=customFieldId)

**Frontend State Management**:

- [ ] T149 [US8] Create custom fields store in frontend/src/stores/customFieldsStore.ts (fields array, createField, updateField, deleteField, fetchFields, predefinedFields, enablePredefined)

**Frontend API Clients**:

- [ ] T150 [P] [US8] Create custom fields API client in frontend/src/services/customFieldsApi.ts (fetchCustomFields, createCustomField, updateCustomField, deleteCustomField, fetchPredefinedFields)

**Frontend Composables**:

- [ ] T151 [US8] Create useCustomFields composable in frontend/src/composables/useCustomFields.ts (customFields, createField, getFieldsByScope, enablePredefinedField)

**Frontend Components - Custom Field Management**:

- [ ] T152 [P] [US8] Create CustomFieldList component in frontend/src/components/customFields/CustomFieldList.vue (display all user custom fields)
- [ ] T153 [P] [US8] Create CustomFieldForm component in frontend/src/components/customFields/CustomFieldForm.vue (create/edit custom field with data type selector)
- [ ] T154 [P] [US8] Create CustomFieldDefinitionCard component in frontend/src/components/customFields/CustomFieldDefinitionCard.vue (show field details, edit, delete)
- [ ] T155 [P] [US8] Create PredefinedFieldsPanel component in frontend/src/components/customFields/PredefinedFieldsPanel.vue (show 7 predefined fields with enable/disable toggles)

**Frontend Components - Custom Field Inputs**:

- [ ] T156 [P] [US8] Create CustomFieldInput component in frontend/src/components/customFields/CustomFieldInput.vue (dynamic input based on data type: text, number, selection, boolean, date)
- [ ] T157 [US8] Extend TaskForm component to render custom field inputs in frontend/src/components/tasks/TaskForm.vue (display all enabled custom fields dynamically)

**Frontend Components - Kanban/Grouped View**:

- [ ] T158 [P] [US8] Create KanbanBoard component in frontend/src/components/tasks/KanbanBoard.vue (display tasks grouped by selection-type custom field)
- [ ] T159 [P] [US8] Create KanbanColumn component in frontend/src/components/tasks/KanbanColumn.vue (display tasks for one custom field option value)
- [ ] T160 [US8] Add view toggle to TasksPage in frontend/src/pages/TasksPage.vue (switch between list view and kanban view)
- [ ] T161 [US8] Add custom field selector to KanbanBoard in frontend/src/components/tasks/KanbanBoard.vue (dropdown to select which selection-type field to group by)

**Frontend Components - Analytics Integration**:

- [ ] T162 [US8] Extend TimeDistribution component to support grouping by custom selection/boolean fields in frontend/src/components/analytics/TimeDistribution.vue (add "Group by" selector)
- [ ] T163 [US8] Extend AnalyticsDashboard to show custom field grouping options in frontend/src/components/analytics/AnalyticsDashboard.vue

**Frontend Pages**:

- [ ] T164 [US8] Create CustomFieldsPage in frontend/src/pages/CustomFieldsPage.vue (manage custom fields, view predefined fields)

**Integration & Final**:

- [ ] T165 [US8] Implement cascade delete logic for custom fields (when field deleted, remove values from all tasks) in backend/src/services/customFields/customFieldService.ts
- [ ] T166 [US8] Add unique name validation per user/group in backend/src/services/customFields/customFieldService.ts (prevent duplicate field names)
- [ ] T167 [US8] Implement NFR-007 limit enforcement (50 custom fields per user, 100 per group) in backend/src/services/customFields/customFieldService.ts
- [ ] T168 [US8] Add custom field values to data export (CSV/XLSX) in backend/src/services/export/exportService.ts (Phase 2 feature, stub for now)
- [ ] T169 [US8] Run E2E tests and verify all US8 acceptance scenarios pass

---

## Phase 8: User Story 5 - Team Collaboration and Group Management (Priority: P4) [Phase 2]

**Goal**: Enable group creation, member invitations, task assignment, and group analytics

**Independent Test**: Create group → Invite member → Assign task → View group analytics → Verify collaboration features

### Tests for User Story 5 ⚠️

- [ ] T170 [P] [US5] Contract test for group CRUD endpoints in backend/tests/contract/groups.contract.test.ts
- [ ] T171 [P] [US5] Integration test for group creation and member management in backend/tests/integration/groups.test.ts
- [ ] T172 [US5] E2E test for group collaboration workflow in frontend/tests/e2e/group-flow.spec.ts

### Implementation for User Story 5

**Backend Models**:

- [ ] T173 [US5] Create Group model in backend/src/models/Group.ts (name, adminIds, memberIds, settings, customFieldDefinitions)
- [ ] T174 [US5] Add oauthProvider and oauthId fields to User model in backend/src/models/User.ts

**Backend Services**:

- [ ] T175 [P] [US5] Create OAuth service for Google login in backend/src/services/auth/oauthService.ts (Google OAuth 2.0 flow)
- [ ] T176 [P] [US5] Create group service in backend/src/services/groups/groupService.ts (createGroup, addMember, removeMember, updateSettings)
- [ ] T177 [P] [US5] Create invitation service in backend/src/services/groups/invitationService.ts (sendInvitation, acceptInvitation)
- [ ] T178 [US5] Extend analytics service for group aggregation in backend/src/services/analytics/analyticsService.ts (getGroupAnalytics)
- [ ] T179 [US5] Extend custom field service to support group-level custom fields in backend/src/services/customFields/customFieldService.ts (createGroupCustomField, resolveFieldConflicts)

**Backend API**:

- [ ] T180 [US5] Create group routes in backend/src/api/routes/groups.ts (GET, POST, PUT, DELETE /groups, POST /groups/:id/members, GET /groups/:id/custom-fields)
- [ ] T181 [US5] Add OAuth routes to auth routes in backend/src/api/routes/auth.ts (GET /auth/google, GET /auth/google/callback)
- [ ] T182 [US5] Extend task routes with group assignment in backend/src/api/routes/tasks.ts (POST /tasks with groupId, assignedBy)

**Frontend State Management**:

- [ ] T183 [US5] Create group store in frontend/src/stores/groupStore.ts (groups, createGroup, addMember, fetchGroupAnalytics)

**Frontend Components**:

- [ ] T184 [P] [US5] Create GroupList component in frontend/src/components/groups/GroupList.vue
- [ ] T185 [P] [US5] Create GroupSettings component in frontend/src/components/groups/GroupSettings.vue
- [ ] T186 [P] [US5] Create MemberManagement component in frontend/src/components/groups/MemberManagement.vue (invite, remove members)
- [ ] T187 [US5] Extend AnalyticsDashboard to show group metrics in frontend/src/components/analytics/AnalyticsDashboard.vue

**Frontend Pages**:

- [ ] T188 [US5] Create GroupsPage in frontend/src/pages/GroupsPage.vue (group list + create group form)

**Integration & Final**:

- [ ] T189 [US5] Configure Passport.js with Google OAuth strategy in backend/src/config/passport.ts
- [ ] T190 [US5] Implement Google OAuth consent flow in frontend
- [ ] T191 [US5] Add authorization middleware for group admin actions in backend/src/api/middleware/authorize.ts
- [ ] T192 [US5] Implement group custom field conflict resolution (FR-052: group fields take precedence) in backend/src/services/customFields/customFieldService.ts
- [ ] T193 [US5] Run E2E tests and verify all US5 acceptance scenarios pass

---

## Phase 9: User Story 6 - Data Export and External Integration (Priority: P4) [Phase 2]

**Goal**: Enable users to export task data (including custom fields) to CSV/XLSX and Google Sheets

**Independent Test**: Complete tasks with custom field values → Export to CSV → Verify custom fields included → Export to Google Sheets → Verify data synced

### Tests for User Story 6 ⚠️

- [ ] T194 [P] [US6] Contract test for export endpoints in backend/tests/contract/export.contract.test.ts
- [ ] T195 [US6] Integration test for CSV/XLSX export in backend/tests/integration/export.test.ts

### Implementation for User Story 6

**Backend Services**:

- [ ] T196 [P] [US6] Create export service in backend/src/services/export/exportService.ts (generateCSV, generateXLSX, includeCustomFieldValues)
- [ ] T197 [US6] Create Google Sheets integration service in backend/src/services/export/googleSheetsService.ts (authenticateOAuth, syncToSheet)

**Backend API**:

- [ ] T198 [US6] Create export routes in backend/src/api/routes/export.ts (GET /export/csv, GET /export/xlsx, POST /export/google-sheets)

**Frontend Components**:

- [ ] T199 [P] [US6] Create ExportPanel component in frontend/src/components/export/ExportPanel.vue (export buttons, Google Sheets OAuth flow)

**Frontend Pages**:

- [ ] T200 [US6] Add export section to SettingsPage in frontend/src/pages/SettingsPage.vue (export configuration)

**Integration & Final**:

- [ ] T201 [US6] Run E2E tests and verify all US6 acceptance scenarios pass

---

## Phase 10: User Story 7 - Advanced Analytics and Recurring Tasks (Priority: P5) [Phase 3]

**Goal**: Provide predictive analytics, efficiency heatmaps, interruption pattern analysis, recurring tasks, and public API

**Independent Test**: View efficiency heatmap → Check predictive analytics → Create recurring task → Verify auto-generation → Test public API endpoint

### Tests for User Story 7 ⚠️

- [ ] T202 [P] [US7] Contract test for advanced analytics endpoints in backend/tests/contract/analytics.contract.test.ts
- [ ] T203 [P] [US7] Contract test for recurring tasks endpoints in backend/tests/contract/tasks.contract.test.ts
- [ ] T204 [P] [US7] Contract test for public API endpoints in backend/tests/contract/publicApi.contract.test.ts

### Implementation for User Story 7

**Backend Models**:

- [ ] T205 [US7] Add recurrence field to Task model in backend/src/models/Task.ts (frequency: daily/weekly/monthly, nextOccurrence)

**Backend Services**:

- [ ] T206 [P] [US7] Create predictive analytics service in backend/src/services/analytics/predictiveAnalytics.ts (estimateCompletionTime based on historical data)
- [ ] T207 [P] [US7] Create efficiency heatmap service in backend/src/services/analytics/efficiencyHeatmap.ts (calculateProductivityByTimeOfDay)
- [ ] T208 [P] [US7] Create interruption pattern analysis service in backend/src/services/analytics/interruptionPatterns.ts (analyzeInterruptionFrequency, identifyBottlenecks)
- [ ] T209 [US7] Create recurring task service in backend/src/services/tasks/recurringTaskService.ts (generateNextOccurrence, scheduleRecurringTasks)

**Backend API**:

- [ ] T210 [US7] Add advanced analytics routes in backend/src/api/routes/analytics.ts (GET /predictive, GET /efficiency-heatmap, GET /interruption-patterns)
- [ ] T211 [US7] Add recurring task routes in backend/src/api/routes/tasks.ts (POST /tasks/recurring, GET /tasks/recurring)
- [ ] T212 [US7] Create public API routes in backend/src/api/routes/publicApi.ts (versioned API v1 with rate limiting)

**Frontend Components**:

- [ ] T213 [P] [US7] Create EfficiencyHeatmap component in frontend/src/components/analytics/EfficiencyHeatmap.vue (Chart.js heatmap)
- [ ] T214 [P] [US7] Create PredictiveAnalytics component in frontend/src/components/analytics/PredictiveAnalytics.vue
- [ ] T215 [P] [US7] Create InterruptionPatterns component in frontend/src/components/analytics/InterruptionPatterns.vue
- [ ] T216 [US7] Create RecurringTaskForm component in frontend/src/components/tasks/RecurringTaskForm.vue (frequency selector)

**Integration & Final**:

- [ ] T217 [US7] Implement background job for recurring task generation (cron or scheduler)
- [ ] T218 [US7] Add API key generation and management for public API in backend/src/services/auth/apiKeyService.ts
- [ ] T219 [US7] Run E2E tests and verify all US7 acceptance scenarios pass

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T220 [P] Add comprehensive error messages and user feedback across all pages
- [ ] T221 [P] Implement loading spinners and skeleton screens for better UX
- [ ] T222 [P] Add form validation error messages to all forms
- [ ] T223 [P] Optimize bundle size with code splitting and lazy loading
- [ ] T224 [P] Add accessibility improvements (ARIA labels, keyboard navigation)
- [ ] T225 [P] Implement responsive design breakpoints for mobile/tablet
- [ ] T226 [P] Add dark mode support (Tailwind dark: variants)
- [ ] T227 [P] Create comprehensive README.md with setup instructions
- [ ] T228 [P] Add API documentation using Swagger/OpenAPI UI
- [ ] T229 [P] Set up CI/CD pipeline (GitHub Actions: lint, test, build)
- [ ] T230 [P] Add database seeding script for development data in backend/scripts/seed.ts
- [ ] T231 [P] Implement health check endpoint in backend/src/api/routes/health.ts
- [ ] T232 [P] Add rate limiting middleware to protect API endpoints in backend/src/api/middleware/rateLimiter.ts
- [ ] T233 [US1] Run quickstart.md validation (ensure all setup steps work)
- [ ] T234 Run full regression test suite across all user stories
- [ ] T235 Performance testing and optimization (load testing, database query optimization)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 models but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Uses US1 data but independently testable
- **User Story 4 (P3)**: Can start after Foundational (Phase 2) - Extends US1 task model
- **User Story 8 (P3)**: Can start after Foundational (Phase 2) - Extends US1 task model, integrates with US3 analytics
- **User Story 5 (P4)**: Can start after Foundational (Phase 2) - Adds collaboration, extends custom fields from US8
- **User Story 6 (P4)**: Depends on US8 completion (must include custom field values in exports)
- **User Story 7 (P5)**: Depends on US1, US2, US3 completion (requires historical data for predictive analytics)

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, US1, US2, US3, US4, US8 can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 8 (Custom Fields)

```bash
# Launch all tests for User Story 8 together:
Task: "Contract test for POST /custom-fields endpoint"
Task: "Contract test for GET /custom-fields endpoint"
Task: "Integration test for custom field CRUD operations"

# Launch all models for User Story 8 together:
Task: "Create CustomFieldDefinition model"
Task: "Add customFieldValues field to Task model"
Task: "Create predefined custom field seed data"

# Launch all independent components together:
Task: "Create CustomFieldList component"
Task: "Create CustomFieldForm component"
Task: "Create PredefinedFieldsPanel component"
Task: "Create KanbanBoard component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 8 (Custom Fields) → Test independently → Deploy/Demo
7. Add User Story 5 (Collaboration) → Test independently → Deploy/Demo
8. Add User Story 6 (Export) → Test independently → Deploy/Demo
9. Add User Story 7 (Advanced) → Test independently → Deploy/Demo
10. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1) - MVP core
   - Developer B: User Story 2 (P2) - Interruptions (starts tests, waits for US1 models)
   - Developer C: User Story 3 (P2) - Analytics (starts tests, waits for US1 data)
   - Developer D: User Story 8 (P3) - Custom Fields (starts tests, can proceed independently)
3. Stories complete and integrate independently

---

## Task Summary

**Total Tasks**: 235
**Tasks by Phase**:
- Phase 1 (Setup): 10 tasks
- Phase 2 (Foundational): 14 tasks (BLOCKING)
- Phase 3 (US1 - MVP): 58 tasks (T025-T082)
- Phase 4 (US2): 19 tasks (T083-T101)
- Phase 5 (US3): 20 tasks (T102-T121)
- Phase 6 (US4): 9 tasks (T122-T130)
- Phase 7 (US8 - Custom Fields): 39 tasks (T131-T169)
- Phase 8 (US5 - Collaboration): 24 tasks (T170-T193)
- Phase 9 (US6 - Export): 8 tasks (T194-T201)
- Phase 10 (US7 - Advanced): 18 tasks (T202-T219)
- Phase 11 (Polish): 16 tasks (T220-T235)

**Parallel Opportunities**:
- Setup: 8/10 tasks can run in parallel
- Foundational: 12/14 tasks can run in parallel
- US1: 47/58 tasks can run in parallel (after tests written)
- US2: 12/19 tasks can run in parallel
- US3: 16/20 tasks can run in parallel
- US4: 2/9 tasks can run in parallel
- US8: 30/39 tasks can run in parallel
- US5: 15/24 tasks can run in parallel
- US6: 4/8 tasks can run in parallel
- US7: 10/18 tasks can run in parallel
- Polish: 14/16 tasks can run in parallel

**MVP Scope (Recommended)**: Phase 1-3 (T001-T082) = 82 tasks for fully functional Pomodoro app

**Enhanced Scope (with Custom Fields)**: Phase 1-7 (T001-T169) = 169 tasks for Pomodoro app with full custom field support

**Independent Test Criteria**:
- US1: Register → Create task → Run Pomodoro → Verify tracking
- US2: Pause → Log interruption → Resume → Verify recorded
- US3: View analytics charts → Check recommendations → Verify accuracy
- US4: Create tasks with all fields → Filter/sort → Verify display
- US8: Create custom field → Add to task → Filter by field → View kanban → Check analytics grouping → Verify all features
- US5: Create group → Invite member → Assign task → View group analytics
- US6: Export to CSV/XLSX → Verify custom fields included → Export to Google Sheets → Verify sync
- US7: View heatmap → Check predictions → Create recurring task → Test API

---

## Notes

- All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD workflow: Write tests → Verify FAIL → Implement → Verify PASS
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: Test-first, pure functions in services, mutable state isolated to Pinia stores
- **Custom Fields (US8)** is a major feature with 39 tasks covering:
  - CustomFieldDefinition model and CRUD
  - 7 predefined custom fields (Priority, Tags, Client, Budget, Status Label, Due Time, Notes)
  - Custom field inputs with 5 data types (text, number, selection, boolean, date)
  - Kanban/grouped view by selection-type custom fields (FR-054, FR-055)
  - Time Distribution analytics grouping by custom fields (FR-053)
  - Required/optional validation (FR-046)
  - Field name uniqueness and cascade deletion
  - Integration with task filtering, sorting, and export
