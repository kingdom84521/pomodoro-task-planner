// Mock database for testing without PostgreSQL

// In-memory data stores
const mockData = {
  users: new Map(), // Map<id, user>
  resourceGroups: new Map(), // Map<id, resourceGroup>
  tasks: new Map(), // Map<id, task>
  workRecords: new Map(), // Map<id, workRecord>
  routineTasks: new Map(), // Map<id, routineTask>
  routineTaskInstances: new Map(), // Map<id, routineTaskInstance>
  meetings: new Map(), // Map<id, meeting>
  meetingInstances: new Map(), // Map<id, meetingInstance>
}

// Auto-increment IDs
let userIdCounter = 1
let resourceGroupIdCounter = 1
let taskIdCounter = 1
let workRecordIdCounter = 1
let routineTaskIdCounter = 1
let routineTaskInstanceIdCounter = 1
let meetingIdCounter = 1
let meetingInstanceIdCounter = 1

// Mock query function that simulates PostgreSQL queries
export async function query(text, params = []) {
  // Simulate async database operation
  await new Promise(resolve => setTimeout(resolve, 10))

  const normalizedQuery = text.trim().toUpperCase()

  // ========== USER QUERIES ==========

  // SELECT FROM users WHERE zitadel_sub (must come before generic SELECT)
  if (normalizedQuery.includes('SELECT * FROM USERS WHERE ZITADEL_SUB')) {
    const zitadelSub = params[0]
    const user = Array.from(mockData.users.values()).find(u => u.zitadel_sub === zitadelSub)
    return { rows: user ? [user] : [] }
  }

  // SELECT FROM users WHERE ID
  if (normalizedQuery.includes('SELECT * FROM USERS WHERE ID')) {
    const id = params[0]
    const user = mockData.users.get(id)
    return { rows: user ? [user] : [] }
  }

  // UPDATE users SET email (for Zitadel sync)
  if (normalizedQuery.includes('UPDATE USERS') && normalizedQuery.includes('SET EMAIL')) {
    const [email, name, emailVerified, zitadelSub] = params
    const user = Array.from(mockData.users.values()).find(u => u.zitadel_sub === zitadelSub)
    if (user) {
      user.email = email
      user.name = name
      user.email_verified = emailVerified
      user.updated_at = new Date()
      return { rows: [user] }
    }
    return { rows: [] }
  }

  // UPDATE users SET settings_data
  if (normalizedQuery.includes('UPDATE USERS') && normalizedQuery.includes('SET SETTINGS_DATA')) {
    const [settingsData, userId] = params
    const user = mockData.users.get(userId)
    if (user) {
      user.settings_data = settingsData
      user.updated_at = new Date()
      return { rows: [user] }
    }
    return { rows: [] }
  }

  // SELECT settings_data FROM users
  if (normalizedQuery.includes('SELECT SETTINGS_DATA FROM USERS')) {
    const userId = params[0]
    const user = mockData.users.get(userId)
    return { rows: user ? [{ settings_data: user.settings_data || null }] : [] }
  }

  // INSERT INTO users (with zitadel_sub)
  if (normalizedQuery.includes('INSERT INTO USERS') && normalizedQuery.includes('ZITADEL_SUB')) {
    const [zitadelSub, email, name, emailVerified] = params
    const user = {
      id: userIdCounter++,
      zitadel_sub: zitadelSub,
      email,
      name,
      email_verified: emailVerified,
      created_at: new Date(),
      updated_at: new Date(),
    }
    mockData.users.set(user.id, user)
    return { rows: [user] }
  }

  // SELECT FROM users (all)
  if (normalizedQuery.includes('SELECT * FROM USERS')) {
    return { rows: Array.from(mockData.users.values()) }
  }

  // ========== RESOURCE GROUP QUERIES ==========

  // INSERT INTO resource_groups
  if (normalizedQuery.includes('INSERT INTO RESOURCE_GROUPS')) {
    const [userId, name, percentageLimit] = params
    const resourceGroup = {
      id: resourceGroupIdCounter++,
      user_id: userId,
      name,
      percentage_limit: percentageLimit,
      created_at: new Date(),
      updated_at: new Date(),
    }
    mockData.resourceGroups.set(resourceGroup.id, resourceGroup)
    return { rows: [resourceGroup] }
  }

  // SELECT FROM resource_groups
  if (normalizedQuery.includes('SELECT * FROM RESOURCE_GROUPS')) {
    if (normalizedQuery.includes('WHERE USER_ID')) {
      const userId = params[0]
      const groups = Array.from(mockData.resourceGroups.values()).filter(g => g.user_id === userId)
      return { rows: groups }
    }
    if (normalizedQuery.includes('WHERE ID')) {
      const id = params[0]
      const group = mockData.resourceGroups.get(id)
      return { rows: group ? [group] : [] }
    }
    return { rows: Array.from(mockData.resourceGroups.values()) }
  }

  // UPDATE resource_groups
  if (normalizedQuery.includes('UPDATE RESOURCE_GROUPS')) {
    const [name, percentageLimit, id] = params
    const group = mockData.resourceGroups.get(id)
    if (group) {
      group.name = name
      group.percentage_limit = percentageLimit
      group.updated_at = new Date()
      return { rows: [group] }
    }
    return { rows: [] }
  }

  // DELETE FROM resource_groups
  if (normalizedQuery.includes('DELETE FROM RESOURCE_GROUPS')) {
    const id = params[0]
    const group = mockData.resourceGroups.get(id)
    if (group) {
      mockData.resourceGroups.delete(id)
      // Set resource_group_id to null for all tasks that reference this group
      Array.from(mockData.tasks.values()).forEach(task => {
        if (task.resource_group_id === id) {
          task.resource_group_id = null
        }
      })
      return { rows: [group] }
    }
    return { rows: [] }
  }

  // ========== TASK QUERIES ==========

  // INSERT INTO tasks
  if (normalizedQuery.includes('INSERT INTO TASKS')) {
    const [userId, title, status, resourceGroupId] = params
    const task = {
      id: taskIdCounter++,
      user_id: userId,
      title,
      status: status || '待處理',
      resource_group_id: resourceGroupId || null,
      created_at: new Date(),
      updated_at: new Date(),
    }
    mockData.tasks.set(task.id, task)
    return { rows: [task] }
  }

  // SELECT FROM tasks
  if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM TASKS')) {
    // Tasks with status IN filter
    if (normalizedQuery.includes('WHERE USER_ID') && normalizedQuery.includes('STATUS IN')) {
      const userId = params[0]
      const statuses = params.slice(1)
      const tasks = Array.from(mockData.tasks.values())
        .filter(t => t.user_id === userId && statuses.includes(t.status))
        .sort((a, b) => a.id - b.id)
      return { rows: tasks }
    }
    if (normalizedQuery.includes('WHERE USER_ID')) {
      const userId = params[0]
      const tasks = Array.from(mockData.tasks.values()).filter(t => t.user_id === userId)
      return { rows: tasks }
    }
    if (normalizedQuery.includes('WHERE ID')) {
      const id = params[0]
      const task = mockData.tasks.get(id)
      return { rows: task ? [task] : [] }
    }
    return { rows: Array.from(mockData.tasks.values()) }
  }

  // UPDATE tasks
  if (normalizedQuery.includes('UPDATE TASKS')) {
    const [title, status, resourceGroupId, id] = params
    const task = mockData.tasks.get(id)
    if (task) {
      task.title = title
      task.status = status
      task.resource_group_id = resourceGroupId
      task.updated_at = new Date()
      return { rows: [task] }
    }
    return { rows: [] }
  }

  // DELETE FROM tasks
  if (normalizedQuery.includes('DELETE FROM TASKS')) {
    const id = params[0]
    const task = mockData.tasks.get(id)
    if (task) {
      mockData.tasks.delete(id)
      return { rows: [task] }
    }
    return { rows: [] }
  }

  // ========== WORK RECORD QUERIES ==========

  // SELECT COUNT FROM work_records
  if (normalizedQuery.includes('SELECT COUNT') && normalizedQuery.includes('FROM WORK_RECORDS')) {
    const userId = params[0]
    const count = Array.from(mockData.workRecords.values()).filter(r => r.user_id === userId).length
    return { rows: [{ count: count.toString() }] }
  }

  // SELECT SUM(duration) with date filter (total)
  if (normalizedQuery.includes('SELECT COALESCE(SUM(DURATION)') && normalizedQuery.includes('FROM WORK_RECORDS') && !normalizedQuery.includes('GROUP BY')) {
    const [userId, startDate] = params
    const records = Array.from(mockData.workRecords.values())
      .filter(r => r.user_id === userId && new Date(r.completed_at) >= new Date(startDate))
    const total = records.reduce((sum, r) => sum + r.duration, 0)
    return { rows: [{ total: total.toString() }] }
  }

  // SELECT SUM(duration) with date filter GROUP BY resource_group_id
  if (normalizedQuery.includes('SELECT RESOURCE_GROUP_ID') && normalizedQuery.includes('SUM(DURATION)') && normalizedQuery.includes('GROUP BY')) {
    const [userId, startDate] = params
    const records = Array.from(mockData.workRecords.values())
      .filter(r => r.user_id === userId && r.resource_group_id !== null && new Date(r.completed_at) >= new Date(startDate))

    const grouped = {}
    for (const r of records) {
      if (!grouped[r.resource_group_id]) {
        grouped[r.resource_group_id] = 0
      }
      grouped[r.resource_group_id] += r.duration
    }

    const rows = Object.entries(grouped).map(([id, total]) => ({
      resource_group_id: parseInt(id, 10),
      total: total.toString(),
    }))
    return { rows }
  }

  // SELECT FROM work_records
  if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM WORK_RECORDS')) {
    if (normalizedQuery.includes('WHERE ID') && normalizedQuery.includes('AND USER_ID')) {
      const [recordId, userId] = params
      const record = mockData.workRecords.get(recordId)
      if (record && record.user_id === userId) {
        return { rows: [record] }
      }
      return { rows: [] }
    }
    if (normalizedQuery.includes('WHERE USER_ID')) {
      const userId = params[0]
      const limit = params[1] || 50
      const offset = params[2] || 0
      const records = Array.from(mockData.workRecords.values())
        .filter(r => r.user_id === userId)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .slice(offset, offset + limit)
      return { rows: records }
    }
    return { rows: Array.from(mockData.workRecords.values()) }
  }

  // INSERT INTO work_records
  if (normalizedQuery.includes('INSERT INTO WORK_RECORDS')) {
    const [userId, taskId, taskName, duration, resourceGroupId, completedAt] = params
    const record = {
      id: workRecordIdCounter++,
      user_id: userId,
      task_id: taskId,
      task_name: taskName,
      duration,
      resource_group_id: resourceGroupId || null,
      completed_at: completedAt || new Date(),
      created_at: new Date(),
    }
    mockData.workRecords.set(record.id, record)
    return { rows: [record] }
  }

  // UPDATE work_records
  if (normalizedQuery.includes('UPDATE WORK_RECORDS')) {
    const [taskName, duration, completedAt, recordId, userId] = params
    const record = mockData.workRecords.get(recordId)
    if (record && record.user_id === userId) {
      record.task_name = taskName
      record.duration = duration
      record.completed_at = completedAt
      return { rows: [record] }
    }
    return { rows: [] }
  }

  // DELETE FROM work_records
  if (normalizedQuery.includes('DELETE FROM WORK_RECORDS')) {
    const [recordId, userId] = params
    const record = mockData.workRecords.get(recordId)
    if (record && record.user_id === userId) {
      mockData.workRecords.delete(recordId)
      return { rows: [record] }
    }
    return { rows: [] }
  }

  // ========== ROUTINE TASK QUERIES ==========

  // INSERT INTO routine_tasks
  if (normalizedQuery.includes('INSERT INTO ROUTINE_TASKS')) {
    const [userId, title, resourceGroupId, recurrenceRule, isActive] = params
    const routineTask = {
      id: routineTaskIdCounter++,
      user_id: userId,
      title,
      resource_group_id: resourceGroupId || null,
      recurrence_rule: typeof recurrenceRule === 'string' ? JSON.parse(recurrenceRule) : recurrenceRule,
      is_active: isActive !== undefined ? isActive : true,
      created_at: new Date(),
      updated_at: new Date(),
    }
    mockData.routineTasks.set(routineTask.id, routineTask)
    return { rows: [routineTask] }
  }

  // SELECT FROM routine_tasks
  if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM ROUTINE_TASKS')) {
    if (normalizedQuery.includes('WHERE ID') && normalizedQuery.includes('AND USER_ID')) {
      const [id, userId] = params
      const task = mockData.routineTasks.get(id)
      if (task && task.user_id === userId) {
        return { rows: [task] }
      }
      return { rows: [] }
    }
    if (normalizedQuery.includes('WHERE USER_ID') && normalizedQuery.includes('IS_ACTIVE = TRUE')) {
      const userId = params[0]
      const tasks = Array.from(mockData.routineTasks.values())
        .filter(t => t.user_id === userId && t.is_active === true)
        .sort((a, b) => a.id - b.id)
      return { rows: tasks }
    }
    if (normalizedQuery.includes('WHERE USER_ID')) {
      const userId = params[0]
      const tasks = Array.from(mockData.routineTasks.values())
        .filter(t => t.user_id === userId)
        .sort((a, b) => a.id - b.id)
      return { rows: tasks }
    }
    if (normalizedQuery.includes('WHERE ID')) {
      const id = params[0]
      const task = mockData.routineTasks.get(id)
      return { rows: task ? [task] : [] }
    }
    return { rows: Array.from(mockData.routineTasks.values()) }
  }

  // UPDATE routine_tasks
  if (normalizedQuery.includes('UPDATE ROUTINE_TASKS')) {
    const [title, resourceGroupId, recurrenceRule, isActive, id, userId] = params
    const task = mockData.routineTasks.get(id)
    if (task && task.user_id === userId) {
      task.title = title
      task.resource_group_id = resourceGroupId
      task.recurrence_rule = typeof recurrenceRule === 'string' ? JSON.parse(recurrenceRule) : recurrenceRule
      task.is_active = isActive
      task.updated_at = new Date()
      return { rows: [task] }
    }
    return { rows: [] }
  }

  // DELETE FROM routine_tasks
  if (normalizedQuery.includes('DELETE FROM ROUTINE_TASKS')) {
    const [id, userId] = params
    const task = mockData.routineTasks.get(id)
    if (task && task.user_id === userId) {
      mockData.routineTasks.delete(id)
      // Also delete all instances
      Array.from(mockData.routineTaskInstances.values())
        .filter(inst => inst.routine_task_id === id)
        .forEach(inst => mockData.routineTaskInstances.delete(inst.id))
      return { rows: [task] }
    }
    return { rows: [] }
  }

  // ========== ROUTINE TASK INSTANCE QUERIES ==========

  // INSERT INTO routine_task_instances
  if (normalizedQuery.includes('INSERT INTO ROUTINE_TASK_INSTANCES')) {
    const [routineTaskId, userId, scheduledDate, status] = params
    const instance = {
      id: routineTaskInstanceIdCounter++,
      routine_task_id: routineTaskId,
      user_id: userId,
      scheduled_date: scheduledDate,
      status: status || 'pending',
      completed_at: null,
      created_at: new Date(),
    }
    mockData.routineTaskInstances.set(instance.id, instance)
    return { rows: [instance] }
  }

  // SELECT FROM routine_task_instances
  if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM ROUTINE_TASK_INSTANCES')) {
    if (normalizedQuery.includes('WHERE ROUTINE_TASK_ID') && normalizedQuery.includes('AND SCHEDULED_DATE')) {
      const [routineTaskId, scheduledDate] = params
      const instance = Array.from(mockData.routineTaskInstances.values())
        .find(i => i.routine_task_id === routineTaskId && i.scheduled_date === scheduledDate)
      return { rows: instance ? [instance] : [] }
    }
    if (normalizedQuery.includes('WHERE USER_ID') && normalizedQuery.includes('AND SCHEDULED_DATE')) {
      const [userId, scheduledDate] = params
      const instances = Array.from(mockData.routineTaskInstances.values())
        .filter(i => i.user_id === userId && i.scheduled_date === scheduledDate)
      return { rows: instances }
    }
    if (normalizedQuery.includes('WHERE ID')) {
      const id = params[0]
      const instance = mockData.routineTaskInstances.get(id)
      return { rows: instance ? [instance] : [] }
    }
    return { rows: Array.from(mockData.routineTaskInstances.values()) }
  }

  // UPDATE routine_task_instances (for completing/skipping)
  if (normalizedQuery.includes('UPDATE ROUTINE_TASK_INSTANCES')) {
    const [status, completedAt, id, userId] = params
    const instance = mockData.routineTaskInstances.get(id)
    if (instance && instance.user_id === userId) {
      instance.status = status
      instance.completed_at = completedAt
      return { rows: [instance] }
    }
    return { rows: [] }
  }

  // ========== MEETING QUERIES ==========

  // SELECT meetings with duration stats (LEFT JOIN query from getMeetings)
  if (normalizedQuery.includes('SELECT M.*') && normalizedQuery.includes('FROM MEETINGS M') && normalizedQuery.includes('LEFT JOIN')) {
    const userId = params[0]
    const meetings = Array.from(mockData.meetings.values())
      .filter(m => m.user_id === userId)
      .sort((a, b) => a.id - b.id)

    console.log('[DEBUG] getMeetings LEFT JOIN - all meetingInstances:', Array.from(mockData.meetingInstances.values()))

    // Calculate stats for each meeting from meeting_instances
    const meetingsWithStats = meetings.map(meeting => {
      const instances = Array.from(mockData.meetingInstances.values())
        .filter(inst => inst.meeting_id === meeting.id && inst.status === 'completed' && inst.actual_duration !== null)

      console.log('[DEBUG] getMeetings LEFT JOIN - meeting:', meeting.id, meeting.title, 'completed instances:', instances)

      const completedCount = instances.length
      const totalDuration = instances.reduce((sum, inst) => sum + (inst.actual_duration || 0), 0)
      const avgDuration = completedCount > 0 ? totalDuration / completedCount : 0

      return {
        ...meeting,
        total_duration: totalDuration,
        avg_duration: avgDuration,
        completed_count: completedCount,
      }
    })

    return { rows: meetingsWithStats }
  }

  // INSERT INTO meetings
  if (normalizedQuery.includes('INSERT INTO MEETINGS')) {
    const [userId, title, meetingType, recurrenceRule, scheduledTime, scheduledDate, isActive] = params
    const meeting = {
      id: meetingIdCounter++,
      user_id: userId,
      title,
      meeting_type: meetingType,
      recurrence_rule: recurrenceRule ? (typeof recurrenceRule === 'string' ? JSON.parse(recurrenceRule) : recurrenceRule) : null,
      scheduled_time: scheduledTime,
      scheduled_date: scheduledDate || null,
      is_active: isActive !== undefined ? isActive : true,
      created_at: new Date(),
      updated_at: new Date(),
    }
    mockData.meetings.set(meeting.id, meeting)
    return { rows: [meeting] }
  }

  // SELECT FROM meetings
  if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM MEETINGS')) {
    if (normalizedQuery.includes('WHERE ID') && normalizedQuery.includes('AND USER_ID')) {
      const [id, userId] = params
      const meeting = mockData.meetings.get(id)
      if (meeting && meeting.user_id === userId) {
        return { rows: [meeting] }
      }
      return { rows: [] }
    }
    if (normalizedQuery.includes('WHERE USER_ID')) {
      const userId = params[0]
      const meetings = Array.from(mockData.meetings.values())
        .filter(m => m.user_id === userId)
        .sort((a, b) => a.id - b.id)
      return { rows: meetings }
    }
    if (normalizedQuery.includes('WHERE ID')) {
      const id = params[0]
      const meeting = mockData.meetings.get(id)
      return { rows: meeting ? [meeting] : [] }
    }
    return { rows: Array.from(mockData.meetings.values()) }
  }

  // UPDATE meetings
  if (normalizedQuery.includes('UPDATE MEETINGS')) {
    const [title, meetingType, recurrenceRule, scheduledTime, scheduledDate, isActive, id, userId] = params
    const meeting = mockData.meetings.get(id)
    if (meeting && meeting.user_id === userId) {
      meeting.title = title
      meeting.meeting_type = meetingType
      meeting.recurrence_rule = recurrenceRule ? (typeof recurrenceRule === 'string' ? JSON.parse(recurrenceRule) : recurrenceRule) : null
      meeting.scheduled_time = scheduledTime
      meeting.scheduled_date = scheduledDate
      meeting.is_active = isActive
      meeting.updated_at = new Date()
      return { rows: [meeting] }
    }
    return { rows: [] }
  }

  // DELETE FROM meetings
  if (normalizedQuery.includes('DELETE FROM MEETINGS')) {
    const [id, userId] = params
    const meeting = mockData.meetings.get(id)
    if (meeting && meeting.user_id === userId) {
      mockData.meetings.delete(id)
      // Also delete all instances
      Array.from(mockData.meetingInstances.values())
        .filter(inst => inst.meeting_id === id)
        .forEach(inst => mockData.meetingInstances.delete(inst.id))
      return { rows: [meeting] }
    }
    return { rows: [] }
  }

  // ========== MEETING INSTANCE QUERIES ==========

  // INSERT INTO meeting_instances
  if (normalizedQuery.includes('INSERT INTO MEETING_INSTANCES')) {
    const [meetingId, userId, scheduledDate, scheduledTime, status] = params
    const instance = {
      id: meetingInstanceIdCounter++,
      meeting_id: meetingId,
      user_id: userId,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      status: status || 'pending',
      started_at: null,
      ended_at: null,
      actual_duration: null,
      created_at: new Date(),
    }
    mockData.meetingInstances.set(instance.id, instance)
    return { rows: [instance] }
  }

  // SELECT FROM meeting_instances
  if (normalizedQuery.includes('SELECT') && normalizedQuery.includes('FROM MEETING_INSTANCES')) {
    if (normalizedQuery.includes('WHERE MEETING_ID') && normalizedQuery.includes('AND SCHEDULED_DATE')) {
      const [meetingId, scheduledDate] = params
      const instance = Array.from(mockData.meetingInstances.values())
        .find(i => i.meeting_id === meetingId && i.scheduled_date === scheduledDate)
      return { rows: instance ? [instance] : [] }
    }
    if (normalizedQuery.includes('WHERE USER_ID') && normalizedQuery.includes('AND SCHEDULED_DATE')) {
      const [userId, scheduledDate] = params
      const instances = Array.from(mockData.meetingInstances.values())
        .filter(i => i.user_id === userId && i.scheduled_date === scheduledDate)
        .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))
      return { rows: instances }
    }
    if (normalizedQuery.includes('WHERE ID')) {
      const id = params[0]
      const instance = mockData.meetingInstances.get(id)
      return { rows: instance ? [instance] : [] }
    }
    return { rows: Array.from(mockData.meetingInstances.values()) }
  }

  // UPDATE meeting_instances (for starting/ending meetings)
  if (normalizedQuery.includes('UPDATE MEETING_INSTANCES')) {
    console.log('[DEBUG] UPDATE MEETING_INSTANCES - query:', text.substring(0, 100))
    console.log('[DEBUG] UPDATE MEETING_INSTANCES - params:', params)
    if (normalizedQuery.includes('STARTED_AT') && normalizedQuery.includes('ENDED_AT')) {
      // Full update (end meeting)
      const [status, startedAt, endedAt, actualDuration, id, userId] = params
      console.log('[DEBUG] UPDATE (end meeting) - id:', id, 'userId:', userId, 'actualDuration:', actualDuration)
      const instance = mockData.meetingInstances.get(id)
      console.log('[DEBUG] UPDATE (end meeting) - found instance:', instance)
      if (instance && instance.user_id === userId) {
        instance.status = status
        instance.started_at = startedAt
        instance.ended_at = endedAt
        instance.actual_duration = actualDuration
        console.log('[DEBUG] UPDATE (end meeting) - updated instance:', instance)
        return { rows: [instance] }
      }
    } else if (normalizedQuery.includes('STARTED_AT')) {
      // Start meeting
      const [status, startedAt, id, userId] = params
      const instance = mockData.meetingInstances.get(id)
      if (instance && instance.user_id === userId) {
        instance.status = status
        instance.started_at = startedAt
        return { rows: [instance] }
      }
    } else {
      // Status only update (skip)
      const [status, id, userId] = params
      const instance = mockData.meetingInstances.get(id)
      if (instance && instance.user_id === userId) {
        instance.status = status
        return { rows: [instance] }
      }
    }
    return { rows: [] }
  }

  console.log('Unhandled query:', text.substring(0, 100))
  return { rows: [] }
}

export async function initDatabase() {
  console.log('✓ Using mock database (no PostgreSQL required)')

  // Create 5 mock users
  const mockUsers = [
    { username: 'Mock User 1', email: 'mock1@example.com', zitadel_sub: 'mock_sub_1' },
    { username: 'Mock User 2', email: 'mock2@example.com', zitadel_sub: 'mock_sub_2' },
    { username: 'Mock User 3', email: 'mock3@example.com', zitadel_sub: 'mock_sub_3' },
    { username: 'Mock User 4', email: 'mock4@example.com', zitadel_sub: 'mock_sub_4' },
    { username: 'Mock User 5', email: 'mock5@example.com', zitadel_sub: 'mock_sub_5' },
  ]

  // Default resource groups
  const defaultResourceGroups = [
    { name: '工作', percentage_limit: 40 },
    { name: '學習', percentage_limit: 30 },
    { name: '運動', percentage_limit: 15 },
    { name: '生活', percentage_limit: 10 },
    { name: '娛樂', percentage_limit: 5 },
  ]

  // Create users and their resource groups
  mockUsers.forEach(({ username, email, zitadel_sub }) => {
    const userId = userIdCounter++
    mockData.users.set(userId, {
      id: userId,
      zitadel_sub,
      username,
      email,
      email_verified: true,
      settings_data: null,
      created_at: new Date(),
      updated_at: new Date(),
    })

    // Create resource groups for each user
    defaultResourceGroups.forEach(rg => {
      const groupId = resourceGroupIdCounter++
      mockData.resourceGroups.set(groupId, {
        id: groupId,
        user_id: userId,
        name: rg.name,
        percentage_limit: rg.percentage_limit,
        created_at: new Date(),
        updated_at: new Date(),
      })
    })
  })

  console.log('✓ Created 5 mock users')
  console.log('✓ Created default resource groups for each user')

  // Add some sample tasks for user 1
  const user1Id = 1
  const user1Groups = Array.from(mockData.resourceGroups.values()).filter(g => g.user_id === user1Id)

  const workGroup = user1Groups.find(g => g.name === '工作')
  const studyGroup = user1Groups.find(g => g.name === '學習')
  const sportGroup = user1Groups.find(g => g.name === '運動')

  mockData.tasks.set(taskIdCounter, {
    id: taskIdCounter++,
    user_id: user1Id,
    title: '完成專案企劃書',
    status: '進行中',
    resource_group_id: workGroup?.id || null,
    created_at: new Date(),
    updated_at: new Date(),
  })

  mockData.tasks.set(taskIdCounter, {
    id: taskIdCounter++,
    user_id: user1Id,
    title: '學習 Vue3 組合式 API',
    status: '待處理',
    resource_group_id: studyGroup?.id || null,
    created_at: new Date(),
    updated_at: new Date(),
  })

  mockData.tasks.set(taskIdCounter, {
    id: taskIdCounter++,
    user_id: user1Id,
    title: '健身房訓練',
    status: '擱置中',
    resource_group_id: sportGroup?.id || null,
    created_at: new Date(),
    updated_at: new Date(),
  })

  mockData.tasks.set(taskIdCounter, {
    id: taskIdCounter++,
    user_id: user1Id,
    title: '閱讀技術書籍',
    status: '已交接',
    resource_group_id: studyGroup?.id || null,
    created_at: new Date(),
    updated_at: new Date(),
  })

  console.log('✓ Sample tasks created for Mock User 1')

  // Add some sample work records for user 1
  const sampleWorkRecords = [
    { task_name: '完成專案企劃書', duration: 1500, daysAgo: 0, resource_group_id: workGroup?.id },
    { task_name: '學習 Vue3 組合式 API', duration: 1200, daysAgo: 1, resource_group_id: studyGroup?.id },
    { task_name: '健身房訓練', duration: 900, daysAgo: 1, resource_group_id: sportGroup?.id },
    { task_name: '閱讀技術書籍', duration: 1800, daysAgo: 2, resource_group_id: studyGroup?.id },
    { task_name: '完成專案企劃書', duration: 1500, daysAgo: 3, resource_group_id: workGroup?.id },
  ]

  sampleWorkRecords.forEach(({ task_name, duration, daysAgo, resource_group_id }) => {
    const completedAt = new Date()
    completedAt.setDate(completedAt.getDate() - daysAgo)
    completedAt.setHours(10 + Math.floor(Math.random() * 8))

    mockData.workRecords.set(workRecordIdCounter, {
      id: workRecordIdCounter++,
      user_id: user1Id,
      task_id: null,
      task_name,
      duration,
      resource_group_id: resource_group_id || null,
      completed_at: completedAt,
      created_at: completedAt,
    })
  })

  console.log('✓ Sample work records created for Mock User 1')

  // Add sample routine tasks for user 1
  const lifeGroup = user1Groups.find(g => g.name === '生活')

  const sampleRoutineTasks = [
    {
      title: '晨間整理',
      resource_group_id: lifeGroup?.id,
      recurrence_rule: { frequency: 'daily' },
    },
    {
      title: '寫日報',
      resource_group_id: workGroup?.id,
      recurrence_rule: { frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5] },
    },
    {
      title: '健身',
      resource_group_id: sportGroup?.id,
      recurrence_rule: { frequency: 'weekly', daysOfWeek: [1, 3, 5] },
    },
    {
      title: '偶數週週三下午會議準備',
      resource_group_id: workGroup?.id,
      recurrence_rule: {
        frequency: 'weekly',
        daysOfWeek: [3],
        weekFilter: { type: 'even' },
        timeRange: { start: '14:00', end: '17:00' },
      },
    },
  ]

  sampleRoutineTasks.forEach(({ title, resource_group_id, recurrence_rule }) => {
    mockData.routineTasks.set(routineTaskIdCounter, {
      id: routineTaskIdCounter++,
      user_id: user1Id,
      title,
      resource_group_id: resource_group_id || null,
      recurrence_rule,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  console.log('✓ Sample routine tasks created for Mock User 1')

  // Add sample meetings for user 1
  const sampleMeetings = [
    {
      title: '每日晨會',
      meeting_type: 'recurring',
      recurrence_rule: { frequency: 'daily' },
      scheduled_time: '10:00',
      scheduled_date: null,
    },
    {
      title: '週一週會',
      meeting_type: 'recurring',
      recurrence_rule: { frequency: 'weekly', daysOfWeek: [1] },
      scheduled_time: '14:00',
      scheduled_date: null,
    },
    {
      title: '客戶訪談',
      meeting_type: 'one-time',
      recurrence_rule: null,
      scheduled_time: '15:00',
      scheduled_date: new Date().toISOString().split('T')[0], // Today
    },
  ]

  sampleMeetings.forEach(({ title, meeting_type, recurrence_rule, scheduled_time, scheduled_date }) => {
    mockData.meetings.set(meetingIdCounter, {
      id: meetingIdCounter++,
      user_id: user1Id,
      title,
      meeting_type,
      recurrence_rule,
      scheduled_time,
      scheduled_date,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    })
  })

  console.log('✓ Sample meetings created for Mock User 1')
}

export async function getClient() {
  return {
    query,
    release: () => {},
  }
}

export async function closePool() {
  console.log('✓ Mock database closed')
}

export default {
  query,
  initDatabase,
  getClient,
  closePool,
}
