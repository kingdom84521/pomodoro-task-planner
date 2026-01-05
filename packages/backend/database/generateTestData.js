/**
 * Generate Test Data Script
 *
 * Generates test data for the analytics page based on quarter settings.
 *
 * Usage:
 *   node packages/backend/database/generateTestData.js [options]
 *
 * Options:
 *   --quarter-start-month <1-12>  Quarter start month (default: 1)
 *   --quarter-start-day <1-31>    Quarter start day (default: 1)
 *   --quarter-months <number>     Months per quarter (default: 3)
 *   --quarters <number>           Number of quarters to generate (default: 4)
 *   --user-id <number>            User ID to generate data for (default: 1)
 *   --clear-all                   Clear ALL existing data before generating
 *
 * Examples:
 *   node packages/backend/database/generateTestData.js
 *   node packages/backend/database/generateTestData.js --quarter-start-month 4 --quarter-start-day 1
 *   node packages/backend/database/generateTestData.js --quarters 2
 *   node packages/backend/database/generateTestData.js --clear-all
 */

import { eq, and, gte, lte } from 'drizzle-orm'
import { getDb } from './drizzle.js'
import {
  users,
  resourceGroups,
  workRecords,
  routineTasks,
  routineTaskInstances,
  meetings,
  meetingInstances,
  dailyAnalytics,
} from './schema.js'
import { backfillMissingDates } from '../services/dailyAnalyticsService.js'

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    quarterStartMonth: 1,
    quarterStartDay: 1,
    quarterMonths: 3,
    quarters: 4, // Default to 4 quarters (1 year) from quarter year start
    userId: 1,
    clearAll: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--quarter-start-month':
        options.quarterStartMonth = parseInt(args[++i]) || 1
        break
      case '--quarter-start-day':
        options.quarterStartDay = parseInt(args[++i]) || 1
        break
      case '--quarter-months':
        options.quarterMonths = parseInt(args[++i]) || 3
        break
      case '--quarters':
        options.quarters = parseInt(args[++i]) || 4
        break
      case '--user-id':
        options.userId = parseInt(args[++i]) || 1
        break
      case '--clear-all':
        options.clearAll = true
        break
      case '--help':
      case '-h':
        console.log(`
Generate Test Data Script

Usage:
  node packages/backend/database/generateTestData.js [options]

Options:
  --quarter-start-month <1-12>  Quarter start month (default: 1)
  --quarter-start-day <1-31>    Quarter start day (default: 1)
  --quarter-months <number>     Months per quarter (default: 3)
  --quarters <number>           Number of quarters to generate (default: 4)
  --user-id <number>            User ID to generate data for (default: 1)
  --clear-all                   Clear ALL existing data before generating

Examples:
  # Default: Generate 4 quarters (1 year) of past data plus current quarter up to today
  # e.g., if quarter starts 1/1 and today is 2026-01-04, generates 2025-01-01 ~ 2026-01-04
  node packages/backend/database/generateTestData.js

  # Generate data for quarters starting April 1
  node packages/backend/database/generateTestData.js --quarter-start-month 4

  # Generate 2 quarters of data
  node packages/backend/database/generateTestData.js --quarters 2

  # Clear all data and regenerate
  node packages/backend/database/generateTestData.js --clear-all
        `)
        process.exit(0)
    }
  }

  return options
}

// Task name templates by resource category
const TASK_TEMPLATES = {
  工作: [
    '完成專案報告',
    '程式碼審查',
    '撰寫技術文件',
    '系統架構設計',
    '修復 Bug',
    'API 開發',
    '資料庫優化',
    '部署準備',
    '會議準備',
    '週報撰寫',
  ],
  學習: [
    '閱讀技術書籍',
    '線上課程學習',
    '練習演算法',
    '學習新框架',
    '研究新技術',
    '寫技術筆記',
    '看技術影片',
    'Side Project',
  ],
  運動: [
    '健身房訓練',
    '跑步',
    '游泳',
    '瑜珈',
    '伸展運動',
    '騎腳踏車',
    '重量訓練',
  ],
  生活: [
    '整理房間',
    '採買日用品',
    '煮飯',
    '理財記帳',
    '繳費',
    '看醫生',
    '家庭時間',
  ],
  娛樂: [
    '看電影',
    '玩遊戲',
    '聽音樂',
    '逛街',
    '朋友聚會',
    '看劇',
  ],
}

// Pomodoro duration in seconds (25 minutes)
const POMODORO_DURATION = 25 * 60

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function subDays(date, days) {
  return addDays(date, -days)
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shouldOccur(probability) {
  return Math.random() < probability
}

/**
 * Calculate the start date of the current quarter year
 * @param {Date} today
 * @param {number} quarterStartMonth
 * @param {number} quarterStartDay
 * @returns {Date}
 */
function getQuarterYearStart(today, quarterStartMonth, quarterStartDay) {
  let quarterYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()

  // Check if we're before this year's quarter start
  if (
    currentMonth < quarterStartMonth ||
    (currentMonth === quarterStartMonth && currentDay < quarterStartDay)
  ) {
    quarterYear -= 1
  }

  return new Date(quarterYear, quarterStartMonth - 1, quarterStartDay)
}

/**
 * Calculate date range for generating test data
 * @param {Object} options
 * @returns {{ startDate: Date, endDate: Date }}
 */
function calculateDateRange(options) {
  const { quarterStartMonth, quarterStartDay, quarterMonths, quarters } = options

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the start of the current quarter year
  const quarterYearStart = getQuarterYearStart(today, quarterStartMonth, quarterStartDay)

  // Go back `quarters` quarters from quarter year start
  // e.g., quarters=4, quarterMonths=3 => go back 12 months
  const startDate = new Date(quarterYearStart)
  startDate.setMonth(startDate.getMonth() - quarters * quarterMonths)

  // End at today (includes current quarter data for "目前" period)
  const endDate = today

  return { startDate, endDate }
}

/**
 * Get all dates in a range
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string[]}
 */
function getAllDatesInRange(startDate, endDate) {
  const dates = []
  const current = new Date(startDate)

  while (current <= endDate) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Check if a routine task should occur on a given date
 */
function shouldRoutineOccur(rule, date) {
  if (!rule) return false

  const dayOfWeek = date.getDay() // 0 = Sunday

  if (rule.frequency === 'daily') {
    return true
  }

  if (rule.frequency === 'weekly') {
    if (rule.daysOfWeek && !rule.daysOfWeek.includes(dayOfWeek)) {
      return false
    }

    // Check week filter (even/odd weeks)
    if (rule.weekFilter) {
      const weekNumber = Math.ceil(
        (date - new Date(date.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000)
      )
      if (rule.weekFilter.type === 'even' && weekNumber % 2 !== 0) return false
      if (rule.weekFilter.type === 'odd' && weekNumber % 2 === 0) return false
    }

    return true
  }

  return false
}

/**
 * Check if a meeting should occur on a given date
 */
function shouldMeetingOccur(meeting, dateStr) {
  if (meeting.meetingType === 'one-time') {
    return meeting.scheduledDate === dateStr
  }

  if (meeting.meetingType === 'recurring' && meeting.recurrenceRule) {
    const date = new Date(dateStr)
    return shouldRoutineOccur(meeting.recurrenceRule, date)
  }

  return false
}

async function generateTestData() {
  const options = parseArgs()

  console.log('🚀 Starting test data generation...')
  console.log('')
  console.log('📋 Configuration:')
  console.log(`   Quarter start: ${options.quarterStartMonth}/${options.quarterStartDay}`)
  console.log(`   Months per quarter: ${options.quarterMonths}`)
  console.log(`   Quarters to generate: ${options.quarters}`)
  console.log(`   User ID: ${options.userId}`)
  console.log('')

  const { startDate, endDate } = calculateDateRange(options)
  const allDates = getAllDatesInRange(startDate, endDate)

  console.log(`📅 Date range: ${formatDate(startDate)} to ${formatDate(endDate)}`)
  console.log(`   Total days: ${allDates.length}`)
  console.log('')

  const db = await getDb()

  // Get user's resource groups
  const groups = await db
    .select()
    .from(resourceGroups)
    .where(eq(resourceGroups.userId, options.userId))

  if (groups.length === 0) {
    console.error('❌ No resource groups found for user. Run seed first.')
    process.exit(1)
  }

  const groupMap = {}
  for (const g of groups) {
    groupMap[g.name] = g.id
  }

  console.log('📦 Found resource groups:', Object.keys(groupMap).join(', '))

  // Get user's routine tasks
  const routines = await db
    .select()
    .from(routineTasks)
    .where(eq(routineTasks.userId, options.userId))

  console.log(`📋 Found ${routines.length} routine tasks`)

  // Get user's meetings
  const meetingsList = await db
    .select()
    .from(meetings)
    .where(eq(meetings.userId, options.userId))

  console.log(`📅 Found ${meetingsList.length} meetings`)

  if (options.clearAll) {
    console.log('\n🧹 Clearing ALL existing data...')

    // Clear all data for this user
    await db.delete(workRecords).where(eq(workRecords.userId, options.userId))
    await db.delete(routineTaskInstances).where(eq(routineTaskInstances.userId, options.userId))
    await db.delete(meetingInstances).where(eq(meetingInstances.userId, options.userId))
    await db.delete(dailyAnalytics).where(eq(dailyAnalytics.userId, options.userId))

    console.log('✅ All data cleared')
  } else {
    console.log('\n🧹 Clearing data in date range...')

    // Clear existing data in the date range only
    await db.delete(workRecords).where(
      and(
        eq(workRecords.userId, options.userId),
        gte(workRecords.completedAt, startDate),
        lte(workRecords.completedAt, endDate)
      )
    )

    await db.delete(routineTaskInstances).where(
      and(
        eq(routineTaskInstances.userId, options.userId),
        gte(routineTaskInstances.scheduledDate, formatDate(startDate)),
        lte(routineTaskInstances.scheduledDate, formatDate(endDate))
      )
    )

    await db.delete(meetingInstances).where(
      and(
        eq(meetingInstances.userId, options.userId),
        gte(meetingInstances.scheduledDate, formatDate(startDate)),
        lte(meetingInstances.scheduledDate, formatDate(endDate))
      )
    )

    await db.delete(dailyAnalytics).where(
      and(
        eq(dailyAnalytics.userId, options.userId),
        gte(dailyAnalytics.date, formatDate(startDate)),
        lte(dailyAnalytics.date, formatDate(endDate))
      )
    )

    console.log('✅ Data in range cleared')
  }

  // Generate data for each day
  let totalWorkRecords = 0
  let totalRoutineInstances = 0
  let totalMeetingInstances = 0

  for (let i = 0; i < allDates.length; i++) {
    const dateStr = allDates[i]
    const date = new Date(dateStr)

    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    // Generate work records (more on weekdays)
    // 6 hours = 360 minutes = ~14-15 pomodoros (25 min each)
    // Weekdays: 14-18 records (5.8-7.5 hours)
    // Weekends: 8-12 records (3.3-5 hours)
    const numRecords = isWeekend ? randomInt(8, 12) : randomInt(14, 18)

    for (let j = 0; j < numRecords; j++) {
      // Pick a random resource group with weighted probabilities
      const weights = isWeekend
        ? { 工作: 0.1, 學習: 0.3, 運動: 0.2, 生活: 0.2, 娛樂: 0.2 }
        : { 工作: 0.4, 學習: 0.25, 運動: 0.15, 生活: 0.1, 娛樂: 0.1 }

      let selectedGroup = null
      const rand = Math.random()
      let cumulative = 0

      for (const [group, weight] of Object.entries(weights)) {
        cumulative += weight
        if (rand < cumulative && groupMap[group]) {
          selectedGroup = group
          break
        }
      }

      if (!selectedGroup) selectedGroup = '工作'

      const taskNames = TASK_TEMPLATES[selectedGroup] || TASK_TEMPLATES['工作']
      const taskName = randomChoice(taskNames)

      // Random time during the day
      const completedAt = new Date(date)
      completedAt.setHours(randomInt(8, 22), randomInt(0, 59), 0, 0)

      await db.insert(workRecords).values({
        userId: options.userId,
        taskName,
        duration: POMODORO_DURATION,
        resourceGroupId: groupMap[selectedGroup],
        completedAt,
        createdAt: completedAt,
      })

      totalWorkRecords++
    }

    // Generate routine task instances
    for (const routine of routines) {
      if (shouldRoutineOccur(routine.recurrenceRule, date)) {
        // 70-90% completion rate depending on the day
        const completionRate = isWeekend ? 0.7 : 0.85
        const isCompleted = shouldOccur(completionRate)

        await db.insert(routineTaskInstances).values({
          routineTaskId: routine.id,
          userId: options.userId,
          scheduledDate: dateStr,
          status: isCompleted ? 'completed' : 'skipped',
          completedAt: isCompleted ? date : null,
          createdAt: date,
        })

        totalRoutineInstances++
      }
    }

    // Generate meeting instances
    for (const meeting of meetingsList) {
      if (shouldMeetingOccur(meeting, dateStr)) {
        // 80% of meetings are completed
        const isCompleted = shouldOccur(0.8)

        // Random duration 20-60 minutes
        const actualDuration = isCompleted ? randomInt(20, 60) * 60 : null

        await db.insert(meetingInstances).values({
          meetingId: meeting.id,
          userId: options.userId,
          scheduledDate: dateStr,
          scheduledTime: meeting.scheduledTime,
          status: isCompleted ? 'completed' : 'cancelled',
          actualDuration,
          isAdHoc: false,
          createdAt: date,
        })

        totalMeetingInstances++
      }
    }

    // Progress indicator every 30 days
    if ((i + 1) % 30 === 0 || i === allDates.length - 1) {
      console.log(`📊 Progress: ${i + 1}/${allDates.length} days processed`)
    }
  }

  console.log('\n📈 Generated data summary:')
  console.log(`   - Work records: ${totalWorkRecords}`)
  console.log(`   - Routine task instances: ${totalRoutineInstances}`)
  console.log(`   - Meeting instances: ${totalMeetingInstances}`)

  // Backfill daily analytics
  console.log('\n⏳ Calculating daily analytics (this may take a moment)...')
  await backfillMissingDates(options.userId, allDates)

  console.log('\n✅ Test data generation completed!')
  console.log('🔄 Please restart the frontend and refresh the Statistics page.')

  process.exit(0)
}

generateTestData().catch((err) => {
  console.error('❌ Error generating test data:', err)
  process.exit(1)
})
