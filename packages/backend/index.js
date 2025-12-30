import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { initDatabase } from './database/index.js'
import { errorHandler } from './middleware/errorHandler.js'
import { jwtCheck, extractUserInfo } from './middleware/auth.js'
import authRouter from './routes/auth.js'
import tasksRouter from './routes/tasks.js'
import pomodoroRouter from './routes/pomodoro.js'
import simpleTasksRouter from './routes/simpleTasks.js'
import resourceGroupsRouter from './routes/resourceGroups.js'
import workRecordsRouter from './routes/workRecords.js'
import configRouter from './routes/config.js'
import userSettingsRouter from './routes/userSettings.js'
import routineTasksRouter from './routes/routineTasks.js'
import meetingsRouter from './routes/meetings.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}))
app.use(express.json())

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Pomodoro Task Planner API is running' })
})

// Authentication routes (public - handles its own JWT verification)
app.use('/api/auth', authRouter)

// Config routes (public - no auth required)
app.use('/api/config', configRouter)

// Protected API Routes - Apply JWT middleware
app.use('/api/tasks', jwtCheck, extractUserInfo, tasksRouter)
app.use('/api/pomodoro', jwtCheck, extractUserInfo, pomodoroRouter)
app.use('/api/simple-tasks', jwtCheck, extractUserInfo, simpleTasksRouter)
app.use('/api/resource-groups', jwtCheck, extractUserInfo, resourceGroupsRouter)
app.use('/api/work-records', jwtCheck, extractUserInfo, workRecordsRouter)
app.use('/api/user-settings', jwtCheck, extractUserInfo, userSettingsRouter)
app.use('/api/routine-tasks', jwtCheck, extractUserInfo, routineTasksRouter)
app.use('/api/meetings', jwtCheck, extractUserInfo, meetingsRouter)

// Error handling middleware (must be last)
app.use(errorHandler)

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase()

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n✓ Backend server is running on http://localhost:${PORT}`)
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`✓ CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`)
      console.log(`✓ Auth Mode: ${process.env.MOCK_AUTH === 'true' ? 'MOCK (5 test users)' : `Zitadel (${process.env.ZITADEL_DOMAIN})`}\n`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
