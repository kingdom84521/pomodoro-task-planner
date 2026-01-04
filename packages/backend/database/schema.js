import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// ========== USERS ==========
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  zitadelSub: text('zitadel_sub').unique(),
  email: text('email'),
  name: text('name'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  settingsData: text('settings_data', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const usersRelations = relations(users, ({ many }) => ({
  resourceGroups: many(resourceGroups),
  tasks: many(tasks),
  workRecords: many(workRecords),
  routineTasks: many(routineTasks),
  routineTaskInstances: many(routineTaskInstances),
  meetings: many(meetings),
  meetingInstances: many(meetingInstances),
}))

// ========== RESOURCE GROUPS ==========
export const resourceGroups = sqliteTable('resource_groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  percentageLimit: integer('percentage_limit'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const resourceGroupsRelations = relations(resourceGroups, ({ one, many }) => ({
  user: one(users, {
    fields: [resourceGroups.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  workRecords: many(workRecords),
  routineTasks: many(routineTasks),
}))

// ========== TASKS ==========
export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  status: text('status').notNull().default('待處理'),
  resourceGroupId: integer('resource_group_id').references(() => resourceGroups.id),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  resourceGroup: one(resourceGroups, {
    fields: [tasks.resourceGroupId],
    references: [resourceGroups.id],
  }),
  workRecords: many(workRecords),
}))

// ========== WORK RECORDS ==========
export const workRecords = sqliteTable('work_records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  taskId: integer('task_id').references(() => tasks.id),
  taskName: text('task_name').notNull(),
  duration: integer('duration').notNull(),
  resourceGroupId: integer('resource_group_id').references(() => resourceGroups.id),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const workRecordsRelations = relations(workRecords, ({ one }) => ({
  user: one(users, {
    fields: [workRecords.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [workRecords.taskId],
    references: [tasks.id],
  }),
  resourceGroup: one(resourceGroups, {
    fields: [workRecords.resourceGroupId],
    references: [resourceGroups.id],
  }),
}))

// ========== ROUTINE TASKS ==========
export const routineTasks = sqliteTable('routine_tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  resourceGroupId: integer('resource_group_id').references(() => resourceGroups.id),
  recurrenceRule: text('recurrence_rule', { mode: 'json' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  startsAt: integer('starts_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const routineTasksRelations = relations(routineTasks, ({ one, many }) => ({
  user: one(users, {
    fields: [routineTasks.userId],
    references: [users.id],
  }),
  resourceGroup: one(resourceGroups, {
    fields: [routineTasks.resourceGroupId],
    references: [resourceGroups.id],
  }),
  instances: many(routineTaskInstances),
}))

// ========== ROUTINE TASK INSTANCES ==========
export const routineTaskInstances = sqliteTable('routine_task_instances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  routineTaskId: integer('routine_task_id').notNull().references(() => routineTasks.id),
  userId: integer('user_id').notNull().references(() => users.id),
  scheduledDate: text('scheduled_date').notNull(), // YYYY-MM-DD format
  status: text('status').notNull().default('pending'),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const routineTaskInstancesRelations = relations(routineTaskInstances, ({ one }) => ({
  routineTask: one(routineTasks, {
    fields: [routineTaskInstances.routineTaskId],
    references: [routineTasks.id],
  }),
  user: one(users, {
    fields: [routineTaskInstances.userId],
    references: [users.id],
  }),
}))

// ========== MEETINGS ==========
export const meetings = sqliteTable('meetings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  meetingType: text('meeting_type').notNull(), // 'recurring' or 'one-time'
  recurrenceRule: text('recurrence_rule', { mode: 'json' }),
  scheduledTime: text('scheduled_time').notNull(), // HH:mm format
  scheduledDate: text('scheduled_date'), // YYYY-MM-DD format (for one-time meetings)
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
  }),
  instances: many(meetingInstances),
}))

// ========== MEETING INSTANCES ==========
export const meetingInstances = sqliteTable('meeting_instances', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  meetingId: integer('meeting_id').notNull().references(() => meetings.id),
  userId: integer('user_id').notNull().references(() => users.id),
  scheduledDate: text('scheduled_date').notNull(), // YYYY-MM-DD format
  scheduledTime: text('scheduled_time').notNull(), // HH:mm format
  status: text('status').notNull().default('pending'),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  actualDuration: integer('actual_duration'), // in seconds
  isAdHoc: integer('is_ad_hoc', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const meetingInstancesRelations = relations(meetingInstances, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingInstances.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingInstances.userId],
    references: [users.id],
  }),
}))

// ========== DAILY ANALYTICS ==========
export const dailyAnalytics = sqliteTable('daily_analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  date: text('date').notNull(), // YYYY-MM-DD format

  // Work duration by resource (JSON: { "resourceId": durationInSeconds })
  workDurationByResource: text('work_duration_by_resource', { mode: 'json' }),
  totalWorkDuration: integer('total_work_duration').notNull().default(0), // in seconds

  // Meeting statistics
  meetingCount: integer('meeting_count').notNull().default(0),
  totalMeetingDuration: integer('total_meeting_duration').notNull().default(0), // in seconds

  // Routine task statistics
  routineCompleted: integer('routine_completed').notNull().default(0),
  routineTotal: integer('routine_total').notNull().default(0),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const dailyAnalyticsRelations = relations(dailyAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [dailyAnalytics.userId],
    references: [users.id],
  }),
}))

// ========== CRON JOB LOG ==========
export const cronJobLog = sqliteTable('cron_job_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobName: text('job_name').notNull(),
  lastRunDate: text('last_run_date').notNull(), // YYYY-MM-DD format
  status: text('status').notNull(), // 'completed' | 'failed'
  errorMessage: text('error_message'), // Error details if failed
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

// Export all tables for schema reference
export const schema = {
  users,
  resourceGroups,
  tasks,
  workRecords,
  routineTasks,
  routineTaskInstances,
  meetings,
  meetingInstances,
  dailyAnalytics,
  cronJobLog,
}
