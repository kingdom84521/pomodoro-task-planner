import db from '../database/index.js'
import { incrementCompletedPomodoros } from './taskService.js'

/**
 * Start a new pomodoro session
 * @param {string} notionPageId - Notion page ID
 * @param {number} durationMinutes - Pomodoro duration in minutes
 * @returns {Promise<Object>} Active pomodoro data
 */
export async function startPomodoro(notionPageId, durationMinutes = 25) {
  // Check if there's already an active pomodoro for this task
  const existing = await db.query(
    'SELECT * FROM active_pomodoros WHERE notion_page_id = $1',
    [notionPageId]
  )

  if (existing.rows.length > 0) {
    throw new Error('Pomodoro already in progress for this task')
  }

  // Get task info
  const taskResult = await db.query(
    'SELECT * FROM tasks WHERE notion_page_id = $1',
    [notionPageId]
  )

  if (taskResult.rows.length === 0) {
    throw new Error(`Task not found: ${notionPageId}`)
  }

  const task = taskResult.rows[0]

  // Insert new active pomodoro
  const result = await db.query(
    `INSERT INTO active_pomodoros
     (task_id, notion_page_id, started_at, total_duration_minutes, status)
     VALUES ($1, $2, NOW(), $3, 'running')
     RETURNING *`,
    [task.id, notionPageId, durationMinutes]
  )

  return {
    ...result.rows[0],
    task: {
      id: task.id,
      title: task.title,
      category: task.category,
    },
  }
}

/**
 * Get current pomodoro status
 * @param {string} notionPageId - Notion page ID
 * @returns {Promise<Object|null>} Pomodoro status or null if not found
 */
export async function getPomodoroStatus(notionPageId) {
  const result = await db.query(
    `SELECT ap.*, t.title, t.category, t.completed_pomodoros, t.estimated_pomodoros
     FROM active_pomodoros ap
     JOIN tasks t ON ap.task_id = t.id
     WHERE ap.notion_page_id = $1`,
    [notionPageId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const pomodoro = result.rows[0]
  const now = new Date()
  const startedAt = new Date(pomodoro.started_at)

  // Calculate elapsed time
  let elapsedSeconds = pomodoro.elapsed_seconds

  if (pomodoro.status === 'running') {
    const runtimeMs = now - startedAt
    elapsedSeconds += Math.floor(runtimeMs / 1000)
  }

  const totalSeconds = pomodoro.total_duration_minutes * 60
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds)

  return {
    pomodoro_id: pomodoro.id,
    status: pomodoro.status,
    started_at: pomodoro.started_at,
    elapsed_seconds: elapsedSeconds,
    remaining_seconds: remainingSeconds,
    total_duration_minutes: pomodoro.total_duration_minutes,
    task: {
      id: pomodoro.task_id,
      title: pomodoro.title,
      category: pomodoro.category,
      completed_pomodoros: pomodoro.completed_pomodoros,
      estimated_pomodoros: pomodoro.estimated_pomodoros,
    },
  }
}

/**
 * Pause an active pomodoro
 * @param {string} notionPageId - Notion page ID
 * @param {number} elapsedSeconds - Current elapsed seconds
 * @returns {Promise<Object>} Updated pomodoro status
 */
export async function pausePomodoro(notionPageId, elapsedSeconds) {
  const result = await db.query(
    `UPDATE active_pomodoros
     SET status = 'paused', paused_at = NOW(), elapsed_seconds = $1, updated_at = NOW()
     WHERE notion_page_id = $2
     RETURNING *`,
    [elapsedSeconds, notionPageId]
  )

  if (result.rows.length === 0) {
    throw new Error('Active pomodoro not found')
  }

  return {
    status: 'paused',
    elapsed_seconds: result.rows[0].elapsed_seconds,
  }
}

/**
 * Resume a paused pomodoro
 * @param {string} notionPageId - Notion page ID
 * @returns {Promise<Object>} Updated pomodoro status
 */
export async function resumePomodoro(notionPageId) {
  const result = await db.query(
    `UPDATE active_pomodoros
     SET status = 'running', started_at = NOW(), updated_at = NOW()
     WHERE notion_page_id = $1
     RETURNING *`,
    [notionPageId]
  )

  if (result.rows.length === 0) {
    throw new Error('Active pomodoro not found')
  }

  return {
    status: 'running',
    elapsed_seconds: result.rows[0].elapsed_seconds,
  }
}

/**
 * Complete a pomodoro session
 * @param {string} notionPageId - Notion page ID
 * @param {number} actualDurationMinutes - Actual duration in minutes
 * @returns {Promise<Object>} Completion result
 */
export async function completePomodoro(notionPageId, actualDurationMinutes = 25) {
  // Get active pomodoro
  const active = await db.query(
    'SELECT * FROM active_pomodoros WHERE notion_page_id = $1',
    [notionPageId]
  )

  if (active.rows.length === 0) {
    throw new Error('Active pomodoro not found')
  }

  const pomodoro = active.rows[0]

  // Get task info
  const taskResult = await db.query(
    'SELECT * FROM tasks WHERE id = $1',
    [pomodoro.task_id]
  )

  const task = taskResult.rows[0]

  // Insert completed session record
  await db.query(
    `INSERT INTO pomodoro_sessions
     (task_id, notion_page_id, category, duration_minutes, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [pomodoro.task_id, notionPageId, task.category, actualDurationMinutes, pomodoro.started_at]
  )

  // Delete active pomodoro
  await db.query(
    'DELETE FROM active_pomodoros WHERE id = $1',
    [pomodoro.id]
  )

  // Increment completed pomodoros count
  const updatedTask = await incrementCompletedPomodoros(notionPageId)

  return {
    completed: true,
    task: {
      completed_pomodoros: updatedTask.completed_pomodoros,
      estimated_pomodoros: updatedTask.estimated_pomodoros,
      auto_completed: updatedTask.status === 'completed',
    },
  }
}

/**
 * Cancel an active pomodoro
 * @param {string} notionPageId - Notion page ID
 * @returns {Promise<Object>} Cancellation result
 */
export async function cancelPomodoro(notionPageId) {
  const result = await db.query(
    'DELETE FROM active_pomodoros WHERE notion_page_id = $1 RETURNING *',
    [notionPageId]
  )

  if (result.rows.length === 0) {
    throw new Error('Active pomodoro not found')
  }

  return {
    cancelled: true,
  }
}

export default {
  startPomodoro,
  getPomodoroStatus,
  pausePomodoro,
  resumePomodoro,
  completePomodoro,
  cancelPomodoro,
}
