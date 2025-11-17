# Data Model

**Feature**: Pomodoro Task Planning Application
**Date**: 2025-11-16
**Database**: MongoDB 6.0+ with Mongoose ODM

This document defines the data entities, relationships, validation rules, and indexes for the Pomodoro Task Planner application.

---

## Entity-Relationship Overview

```
User (1) ────┬──── (many) Task
             │
             ├──── (many) PomodoroSession
             │
             ├──── (1) Configuration
             │
             └──── (many-to-many) Group (Phase 2)

Task (1) ──── (many) PomodoroSession

PomodoroSession (1) ──── (many) Interruption (embedded)

Group (many) ──── (many) User (Phase 2)
```

---

## Phase 1 Entities

### 1. User

**Purpose**: Represents an individual user of the application

**Collection Name**: `users`

**Schema**:
```typescript
interface IUser {
  _id: ObjectId;
  email: string;                    // Unique, indexed
  passwordHash: string;              // bcrypt hash (12 rounds)
  name: string;                      // Display name
  timezone: string;                  // IANA timezone (e.g., "America/New_York")
  oauthProvider?: 'google';          // Phase 2: OAuth provider
  oauthId?: string;                  // Phase 2: Provider-specific user ID
  createdAt: Date;                   // Auto-generated
  updatedAt: Date;                   // Auto-updated
}
```

**Validation Rules**:
- `email`: Required, unique, valid email format (RFC 5322), max 255 chars
- `passwordHash`: Required (unless OAuth user), min 60 chars (bcrypt output)
- `name`: Required, min 2 chars, max 100 chars, trim whitespace
- `timezone`: Required, must be valid IANA timezone string
- `oauthProvider`: Optional (Phase 2), enum: `['google']`
- `oauthId`: Optional (Phase 2), required if oauthProvider set

**Indexes**:
```javascript
{ email: 1 }  // Unique index for fast login lookup
{ oauthProvider: 1, oauthId: 1 }  // Phase 2: Unique composite for OAuth
{ createdAt: -1 }  // For admin queries (user registration trends)
```

**Relationships**:
- One-to-many with `Task` (user can have multiple tasks)
- One-to-many with `PomodoroSession` (user can have multiple sessions)
- One-to-one with `Configuration` (user has one config)
- Many-to-many with `Group` (Phase 2: user can belong to multiple groups)

**Mongoose Model** (`backend/src/models/User.ts`):
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  timezone: string;
  oauthProvider?: 'google';
  oauthId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,  // Basic email validation
    },
    passwordHash: {
      type: String,
      required: function() {
        return !this.oauthProvider;  // Required if not OAuth user
      },
      minlength: 60,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
    },
    oauthProvider: {
      type: String,
      enum: ['google'],  // Phase 2
      sparse: true,
    },
    oauthId: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,  // Auto-creates createdAt, updatedAt
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ oauthProvider: 1, oauthId: 1 }, { unique: true, sparse: true });
UserSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', UserSchema);
```

---

### 2. Task

**Purpose**: Represents a unit of work to be completed by a user

**Collection Name**: `tasks`

**Schema**:
```typescript
interface ITask {
  _id: ObjectId;
  userId: ObjectId;                  // Reference to User
  name: string;                      // Task name
  description?: string;              // Phase 1.3: Detailed description
  estimatedPomodoros: number;        // How many Pomodoros user expects
  actualPomodoros: number;           // Calculated from completed PomodoroSessions
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: Date;                    // Phase 1.3: Optional deadline
  grouping?: string;                 // Phase 1.3: Category/project name
  groupId?: ObjectId;                // Phase 2: Reference to Group
  assignedBy?: ObjectId;             // Phase 2: User who assigned task
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `userId`: Required, must be valid ObjectId, must reference existing User
- `name`: Required, min 3 chars, max 200 chars, trim whitespace
- `description`: Optional (Phase 1.3), max 2000 chars
- `estimatedPomodoros`: Required, integer, min 1, max 100
- `actualPomodoros`: Auto-calculated, integer, min 0, default 0
- `status`: Required, enum: `['pending', 'in-progress', 'completed']`, default 'pending'
- `dueDate`: Optional (Phase 1.3), must be future date or null
- `grouping`: Optional (Phase 1.3), max 50 chars, trim whitespace
- `groupId`: Optional (Phase 2), must reference existing Group

**Indexes**:
```javascript
{ userId: 1, status: 1 }  // Fast filtering by user and status
{ userId: 1, dueDate: 1 }  // Phase 1.3: Tasks sorted by deadline
{ userId: 1, grouping: 1 }  // Phase 1.3: Tasks grouped by category
{ groupId: 1, status: 1 }  // Phase 2: Group task filtering
```

**Relationships**:
- Many-to-one with `User` (task belongs to one user)
- One-to-many with `PomodoroSession` (task can have multiple sessions)
- Many-to-one with `Group` (Phase 2: task belongs to one group)

**Derived Fields** (calculated on query):
- `actualPomodoros`: Count of completed PomodoroSessions for this task
- `pomodoroAccuracy`: `(actualPomodoros - estimatedPomodoros) / estimatedPomodoros * 100`

**Mongoose Model** (`backend/src/models/Task.ts`):
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  estimatedPomodoros: number;
  actualPomodoros: number;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: Date;
  grouping?: string;
  groupId?: mongoose.Types.ObjectId;  // Phase 2
  assignedBy?: mongoose.Types.ObjectId;  // Phase 2
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
      trim: true,
    },
    estimatedPomodoros: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    actualPomodoros: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
      index: true,
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function(value: Date) {
          return !value || value > new Date();  // Must be future date
        },
        message: 'Due date must be in the future',
      },
    },
    grouping: {
      type: String,
      maxlength: 50,
      trim: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',  // Phase 2
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',  // Phase 2
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, grouping: 1 });
TaskSchema.index({ groupId: 1, status: 1 });  // Phase 2

export const Task = mongoose.model<ITask>('Task', TaskSchema);
```

---

### 3. PomodoroSession

**Purpose**: Represents a timed work session associated with a task

**Collection Name**: `pomodoro_sessions`

**Schema**:
```typescript
interface IPomodoroSession {
  _id: ObjectId;
  userId: ObjectId;                  // Reference to User
  taskId: ObjectId;                  // Reference to Task
  startTime: Date;                   // When session started
  endTime?: Date;                    // When session ended (null if in progress)
  duration: number;                  // Planned duration in milliseconds
  completed: boolean;                // True if finished full Pomodoro
  interruptions: IInterruption[];    // Embedded interruption documents
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `userId`: Required, must be valid ObjectId, must reference existing User
- `taskId`: Required, must be valid ObjectId, must reference existing Task
- `startTime`: Required, auto-set to current time on creation
- `endTime`: Optional, must be after startTime if set
- `duration`: Required, integer, min 60000 (1 minute), max 7200000 (2 hours), default 1800000 (30 minutes)
- `completed`: Required, boolean, default false
- `interruptions`: Optional, array of embedded Interruption documents

**Indexes**:
```javascript
{ userId: 1, startTime: -1 }  // User's sessions sorted by recency
{ taskId: 1, startTime: -1 }  // Task's sessions sorted by recency
{ userId: 1, completed: 1 }  // Fast filtering by completion status
```

**Relationships**:
- Many-to-one with `User` (session belongs to one user)
- Many-to-one with `Task` (session belongs to one task)
- One-to-many (embedded) with `Interruption`

**Business Rules**:
- User can only have one active (endTime = null) session at a time
- When session completes, increment Task.actualPomodoros
- When session aborted (completed = false), do NOT increment Task.actualPomodoros

**Mongoose Model** (`backend/src/models/PomodoroSession.ts`):
```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface IInterruption {
  type: 'urgent' | 'break';
  duration: number;  // milliseconds
  timestamp: Date;
  notes?: string;
}

export interface IPomodoroSession extends Document {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration: number;
  completed: boolean;
  interruptions: IInterruption[];
  createdAt: Date;
  updatedAt: Date;
}

const InterruptionSchema = new Schema<IInterruption>({
  type: {
    type: String,
    enum: ['urgent', 'break'],
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 0,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, { _id: false });  // Embedded document, no separate _id

const PomodoroSessionSchema = new Schema<IPomodoroSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      validate: {
        validator: function(value: Date) {
          return !value || value > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    duration: {
      type: Number,
      required: true,
      min: 60000,  // 1 minute
      max: 7200000,  // 2 hours
      default: 1800000,  // 30 minutes
    },
    completed: {
      type: Boolean,
      default: false,
    },
    interruptions: {
      type: [InterruptionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PomodoroSessionSchema.index({ userId: 1, startTime: -1 });
PomodoroSessionSchema.index({ taskId: 1, startTime: -1 });
PomodoroSessionSchema.index({ userId: 1, completed: 1 });

export const PomodoroSession = mongoose.model<IPomodoroSession>(
  'PomodoroSession',
  PomodoroSessionSchema
);
```

---

### 4. Configuration

**Purpose**: User-specific settings for Pomodoro timer and daily usage

**Collection Name**: `configurations`

**Schema**:
```typescript
interface IConfiguration {
  _id: ObjectId;
  userId: ObjectId;                  // Reference to User (unique)
  pomodoroDuration: number;          // milliseconds, default 30 minutes
  shortBreak: number;                // milliseconds, default 5 minutes
  longBreak: number;                 // milliseconds, default 15 minutes
  longBreakInterval: number;         // After how many Pomodoros, default 4
  dailyUsageStart?: string;          // Phase 1.2: "HH:MM" format (e.g., "09:00")
  dailyUsageEnd?: string;            // Phase 1.2: "HH:MM" format (e.g., "17:00")
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `userId`: Required, must be valid ObjectId, unique, must reference existing User
- `pomodoroDuration`: Required, integer, min 300000 (5 min), max 7200000 (2 hours), default 1800000 (30 min)
- `shortBreak`: Required, integer, min 60000 (1 min), max 1800000 (30 min), default 300000 (5 min)
- `longBreak`: Required, integer, min 300000 (5 min), max 3600000 (1 hour), default 900000 (15 min)
- `longBreakInterval`: Required, integer, min 2, max 10, default 4
- `dailyUsageStart`: Optional (Phase 1.2), must match "HH:MM" format (24-hour)
- `dailyUsageEnd`: Optional (Phase 1.2), must match "HH:MM" format, must be after dailyUsageStart

**Indexes**:
```javascript
{ userId: 1 }  // Unique index for one config per user
```

**Relationships**:
- One-to-one with `User` (user has one configuration)

**Mongoose Model** (`backend/src/models/Configuration.ts`):
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IConfiguration extends Document {
  userId: mongoose.Types.ObjectId;
  pomodoroDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  dailyUsageStart?: string;
  dailyUsageEnd?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConfigurationSchema = new Schema<IConfiguration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    pomodoroDuration: {
      type: Number,
      required: true,
      min: 300000,  // 5 minutes
      max: 7200000,  // 2 hours
      default: 1800000,  // 30 minutes
    },
    shortBreak: {
      type: Number,
      required: true,
      min: 60000,  // 1 minute
      max: 1800000,  // 30 minutes
      default: 300000,  // 5 minutes
    },
    longBreak: {
      type: Number,
      required: true,
      min: 300000,  // 5 minutes
      max: 3600000,  // 1 hour
      default: 900000,  // 15 minutes
    },
    longBreakInterval: {
      type: Number,
      required: true,
      min: 2,
      max: 10,
      default: 4,
    },
    dailyUsageStart: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,  // HH:MM format
    },
    dailyUsageEnd: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      validate: {
        validator: function(value: string) {
          if (!this.dailyUsageStart || !value) return true;
          return value > this.dailyUsageStart;  // End must be after start
        },
        message: 'Daily usage end must be after start',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Unique index
ConfigurationSchema.index({ userId: 1 }, { unique: true });

export const Configuration = mongoose.model<IConfiguration>(
  'Configuration',
  ConfigurationSchema
);
```

---

## Phase 2 Entities

### 5. Group

**Purpose**: Represents a team or collaborative unit for task management

**Collection Name**: `groups`

**Schema**:
```typescript
interface IGroup {
  _id: ObjectId;
  name: string;                      // Group name
  adminIds: ObjectId[];              // User IDs with admin privileges
  memberIds: ObjectId[];             // All user IDs (including admins)
  settings: {                        // Group-level configuration overrides
    pomodoroDuration?: number;
    shortBreak?: number;
    longBreak?: number;
    longBreakInterval?: number;
    sharedGroupings?: string[];      // Shared task categories
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules**:
- `name`: Required, min 3 chars, max 100 chars, trim whitespace
- `adminIds`: Required, non-empty array, all must reference existing Users
- `memberIds`: Required, non-empty array, all must reference existing Users, must include all adminIds
- `settings`: Optional object with same validation rules as Configuration model

**Indexes**:
```javascript
{ adminIds: 1 }  // Fast admin lookup
{ memberIds: 1 }  // Fast member lookup
{ name: 1 }  // Group name search
```

**Relationships**:
- Many-to-many with `User` (group has many members, user can belong to many groups)
- One-to-many with `Task` (group can have many assigned tasks)

**Mongoose Model** (`backend/src/models/Group.ts`):
```typescript
import mongoose, { Schema, Document } from 'mongoose';

interface IGroupSettings {
  pomodoroDuration?: number;
  shortBreak?: number;
  longBreak?: number;
  longBreakInterval?: number;
  sharedGroupings?: string[];
}

export interface IGroup extends Document {
  name: string;
  adminIds: mongoose.Types.ObjectId[];
  memberIds: mongoose.Types.ObjectId[];
  settings: IGroupSettings;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    adminIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator: function(value: mongoose.Types.ObjectId[]) {
          return value.length > 0;
        },
        message: 'Group must have at least one admin',
      },
    },
    memberIds: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator: function(value: mongoose.Types.ObjectId[]) {
          const adminIds = this.adminIds.map(id => id.toString());
          const memberIds = value.map(id => id.toString());
          return adminIds.every(id => memberIds.includes(id));
        },
        message: 'All admins must be included in members',
      },
    },
    settings: {
      pomodoroDuration: Number,
      shortBreak: Number,
      longBreak: Number,
      longBreakInterval: Number,
      sharedGroupings: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
GroupSchema.index({ adminIds: 1 });
GroupSchema.index({ memberIds: 1 });
GroupSchema.index({ name: 1 });

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
```

---

## Phase 3 Entities (Optimization)

### 6. AnalyticsCache

**Purpose**: Cached analytics results for performance optimization

**Collection Name**: `analytics_cache`

**Schema**:
```typescript
interface IAnalyticsCache {
  _id: ObjectId;
  userId: ObjectId;                  // Reference to User
  timeRange: '1week' | '1month' | '3months' | '6months';
  metrics: {                         // Cached calculation results (JSON)
    completionRate: number;
    pomodoroAccuracy: number;
    timeDistribution: object;
    bufferConsumption: number;
    taskStatusTrend: object;
  };
  generatedAt: Date;                 // When cache was created
  expiresAt: Date;                   // When cache should be invalidated (TTL)
}
```

**Validation Rules**:
- `userId`: Required, must reference existing User
- `timeRange`: Required, enum: `['1week', '1month', '3months', '6months']`
- `metrics`: Required, object (flexible schema for future metric additions)
- `generatedAt`: Required, auto-set to current time on creation
- `expiresAt`: Required, auto-set to generatedAt + 1 hour

**Indexes**:
```javascript
{ userId: 1, timeRange: 1 }  // Unique compound index for cache lookups
{ expiresAt: 1 }  // TTL index (auto-delete expired documents)
```

**TTL Index** (auto-cleanup):
```javascript
db.analytics_cache.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**Mongoose Model** (`backend/src/models/AnalyticsCache.ts`):
```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsCache extends Document {
  userId: mongoose.Types.ObjectId;
  timeRange: '1week' | '1month' | '3months' | '6months';
  metrics: {
    completionRate: number;
    pomodoroAccuracy: number;
    timeDistribution: any;
    bufferConsumption: number;
    taskStatusTrend: any;
  };
  generatedAt: Date;
  expiresAt: Date;
}

const AnalyticsCacheSchema = new Schema<IAnalyticsCache>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  timeRange: {
    type: String,
    enum: ['1week', '1month', '3months', '6months'],
    required: true,
  },
  metrics: {
    type: Schema.Types.Mixed,
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 3600000),  // 1 hour from now
  },
});

// Compound unique index for cache lookups
AnalyticsCacheSchema.index({ userId: 1, timeRange: 1 }, { unique: true });

// TTL index for auto-cleanup
AnalyticsCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AnalyticsCache = mongoose.model<IAnalyticsCache>(
  'AnalyticsCache',
  AnalyticsCacheSchema
);
```

---

## Data Integrity Rules

### Cascade Operations

1. **User Deletion**:
   - Delete all associated Tasks
   - Delete all associated PomodoroSessions
   - Delete associated Configuration
   - Remove user from all Groups (memberIds, adminIds)
   - If user is the last admin of a Group, delete the Group

2. **Task Deletion**:
   - Delete all associated PomodoroSessions

3. **Group Deletion** (Phase 2):
   - Orphan all Tasks with this groupId (set groupId = null)
   - Remove group from all users' group lists

### Soft Deletes

For compliance and analytics purposes, implement soft deletes:
- Add `deletedAt: Date?` field to User, Task, PomodoroSession
- Filter queries by `deletedAt: null` by default
- Hard delete after 30 days (scheduled job)

---

## Migration Strategy

### Phase 1 → Phase 2

- Add `oauthProvider`, `oauthId` to User (optional fields)
- Add `description`, `dueDate`, `grouping` to Task (optional fields)
- Create Group collection
- Add `groupId`, `assignedBy` to Task (optional fields)

### Phase 2 → Phase 3

- Create AnalyticsCache collection with TTL index
- Add recurring task fields to Task (optional): `recurrence`, `nextOccurrence`

**No breaking changes**: All new fields are optional, existing data remains valid.

---

## Query Patterns

### Common Queries

1. **Get user's pending tasks**:
```javascript
Task.find({ userId, status: 'pending', deletedAt: null })
  .sort({ dueDate: 1 })
  .lean();
```

2. **Get user's Pomodoro sessions for analytics (1 week)**:
```javascript
PomodoroSession.find({
  userId,
  startTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  completed: true,
}).lean();
```

3. **Calculate task completion rate**:
```javascript
const pipeline = [
  { $match: { userId } },
  { $group: {
    _id: '$status',
    count: { $sum: 1 },
  }},
];
const result = await Task.aggregate(pipeline);
```

---

**Status**: ✅ Complete
**Next Step**: Generate API contracts (contracts/*.openapi.yaml)
