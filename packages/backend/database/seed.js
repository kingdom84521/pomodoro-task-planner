/**
 * Database Seed Script
 *
 * Seeds development data for testing.
 * This is automatically run when using SQLite in development mode.
 */

import { eq, count } from 'drizzle-orm'
import {
  users,
  resourceGroups,
  tasks,
  workRecords,
  routineTasks,
  meetings,
} from './schema.js'

/**
 * Seed development data if the database is empty
 */
export async function seedDevelopmentData(db) {
  // Check if data already exists
  const existingUsers = await db.select({ count: count() }).from(users)
  if (existingUsers[0].count > 0) {
    console.log('✓ Database already has data, skipping seed')
    return
  }

  console.log('🌱 Seeding development data...')

  // Create 5 mock users (sub must match MOCK_USERS in middleware/auth.js)
  const mockUsers = [
    { name: 'Mock User 1', email: 'user1@test.com', zitadelSub: 'mock-user-1' },
    { name: 'Mock User 2', email: 'user2@test.com', zitadelSub: 'mock-user-2' },
    { name: 'Mock User 3', email: 'user3@test.com', zitadelSub: 'mock-user-3' },
    { name: 'Mock User 4', email: 'user4@test.com', zitadelSub: 'mock-user-4' },
    { name: 'Mock User 5', email: 'user5@test.com', zitadelSub: 'mock-user-5' },
  ]

  const insertedUsers = await db
    .insert(users)
    .values(
      mockUsers.map((u) => ({
        name: u.name,
        email: u.email,
        zitadelSub: u.zitadelSub,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
    .returning()

  console.log(`✓ Created ${insertedUsers.length} mock users`)

  // Default resource groups
  const defaultResourceGroups = [
    { name: '工作', percentageLimit: 40 },
    { name: '學習', percentageLimit: 30 },
    { name: '運動', percentageLimit: 15 },
    { name: '生活', percentageLimit: 10 },
    { name: '娛樂', percentageLimit: 5 },
  ]

  // Create resource groups for each user
  for (const user of insertedUsers) {
    await db.insert(resourceGroups).values(
      defaultResourceGroups.map((rg) => ({
        userId: user.id,
        name: rg.name,
        percentageLimit: rg.percentageLimit,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
  }

  console.log('✓ Created default resource groups for each user')

  // Get user 1's resource groups
  const user1 = insertedUsers[0]
  const user1Groups = await db
    .select()
    .from(resourceGroups)
    .where(eq(resourceGroups.userId, user1.id))

  const workGroup = user1Groups.find((g) => g.name === '工作')
  const studyGroup = user1Groups.find((g) => g.name === '學習')
  const sportGroup = user1Groups.find((g) => g.name === '運動')
  const lifeGroup = user1Groups.find((g) => g.name === '生活')

  // Add sample tasks for user 1
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(14, 0, 0, 0)

  await db.insert(tasks).values([
    {
      userId: user1.id,
      title: '完成專案企劃書',
      status: '進行中',
      resourceGroupId: workGroup?.id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: user1.id,
      title: '學習 Vue3 組合式 API',
      status: '待處理',
      resourceGroupId: studyGroup?.id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: user1.id,
      title: '健身房訓練',
      status: '擱置中',
      resourceGroupId: sportGroup?.id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: user1.id,
      title: '閱讀技術書籍',
      status: '已交接',
      resourceGroupId: studyGroup?.id || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: user1.id,
      title: '準備週報簡報',
      status: '待處理',
      resourceGroupId: workGroup?.id || null,
      scheduledAt: tomorrow,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])

  console.log('✓ Sample tasks created for Mock User 1')

  // Add sample work records for user 1
  const sampleWorkRecords = [
    { taskName: '完成專案企劃書', duration: 1500, daysAgo: 0, resourceGroupId: workGroup?.id },
    { taskName: '學習 Vue3 組合式 API', duration: 1200, daysAgo: 1, resourceGroupId: studyGroup?.id },
    { taskName: '健身房訓練', duration: 900, daysAgo: 1, resourceGroupId: sportGroup?.id },
    { taskName: '閱讀技術書籍', duration: 1800, daysAgo: 2, resourceGroupId: studyGroup?.id },
    { taskName: '完成專案企劃書', duration: 1500, daysAgo: 3, resourceGroupId: workGroup?.id },
  ]

  for (const record of sampleWorkRecords) {
    const completedAt = new Date()
    completedAt.setDate(completedAt.getDate() - record.daysAgo)
    completedAt.setHours(10 + Math.floor(Math.random() * 8))

    await db.insert(workRecords).values({
      userId: user1.id,
      taskName: record.taskName,
      duration: record.duration,
      resourceGroupId: record.resourceGroupId || null,
      completedAt: completedAt,
      createdAt: completedAt,
    })
  }

  console.log('✓ Sample work records created for Mock User 1')

  // Add sample routine tasks for user 1
  const sampleRoutineTasks = [
    {
      title: '晨間整理',
      resourceGroupId: lifeGroup?.id,
      recurrenceRule: { frequency: 'daily' },
    },
    {
      title: '寫日報',
      resourceGroupId: workGroup?.id,
      recurrenceRule: { frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5] },
    },
    {
      title: '健身',
      resourceGroupId: sportGroup?.id,
      recurrenceRule: { frequency: 'weekly', daysOfWeek: [1, 3, 5] },
    },
    {
      title: '偶數週週三下午會議準備',
      resourceGroupId: workGroup?.id,
      recurrenceRule: {
        frequency: 'weekly',
        daysOfWeek: [3],
        weekFilter: { type: 'even' },
        timeRange: { start: '14:00', end: '17:00' },
      },
    },
  ]

  for (const rt of sampleRoutineTasks) {
    await db.insert(routineTasks).values({
      userId: user1.id,
      title: rt.title,
      resourceGroupId: rt.resourceGroupId || null,
      recurrenceRule: rt.recurrenceRule,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  console.log('✓ Sample routine tasks created for Mock User 1')

  // Add sample meetings for user 1
  const today = new Date().toISOString().split('T')[0]

  const sampleMeetings = [
    {
      title: '每日晨會',
      meetingType: 'recurring',
      recurrenceRule: { frequency: 'daily' },
      scheduledTime: '10:00',
      scheduledDate: null,
    },
    {
      title: '週一週會',
      meetingType: 'recurring',
      recurrenceRule: { frequency: 'weekly', daysOfWeek: [1] },
      scheduledTime: '14:00',
      scheduledDate: null,
    },
    {
      title: '客戶訪談',
      meetingType: 'one-time',
      recurrenceRule: null,
      scheduledTime: '15:00',
      scheduledDate: today,
    },
  ]

  for (const meeting of sampleMeetings) {
    await db.insert(meetings).values({
      userId: user1.id,
      title: meeting.title,
      meetingType: meeting.meetingType,
      recurrenceRule: meeting.recurrenceRule,
      scheduledTime: meeting.scheduledTime,
      scheduledDate: meeting.scheduledDate,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  console.log('✓ Sample meetings created for Mock User 1')
  console.log('🌱 Development data seeded successfully!')
}
