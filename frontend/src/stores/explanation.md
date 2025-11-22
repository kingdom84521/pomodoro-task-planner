# Stores 狀態管理說明文件

本目錄包含所有 Pinia Store，負責管理應用程式的全域狀態。

## 📚 Pinia 簡介

Pinia 是 Vue 3 官方推薦的狀態管理函式庫，取代 Vuex。

**優點**:
- ✅ TypeScript 完整支援
- ✅ Composition API 風格
- ✅ 模組化設計
- ✅ DevTools 整合
- ✅ 輕量且效能優異

## 📄 Store 檔案列表

```
stores/
├── authStore.ts       # 使用者認證狀態
├── taskStore.ts       # 任務列表狀態
├── pomodoroStore.ts   # 番茄鐘計時器狀態
└── analyticsStore.ts  # 數據分析狀態
```

---

## 🔐 authStore.ts - 認證狀態管理

### 職責
- 管理使用者登入狀態
- 儲存使用者資訊
- 處理 JWT Token
- 提供認證相關方法

### State（狀態）

```typescript
const user = ref<User | null>(null)  // 當前登入使用者
const token = ref<string | null>(null)  // JWT Token
const loading = ref(false)  // 載入狀態
const error = ref<string | null>(null)  // 錯誤訊息
```

### Getters（計算屬性）

```typescript
const isAuthenticated = computed(() => !!token.value && !!user.value)
const userEmail = computed(() => user.value?.email || '')
const userName = computed(() => user.value?.name || '')
```

### Actions（方法）

#### `login(credentials: LoginInput): Promise<void>`
**登入方法**

```typescript
const login = async (credentials: LoginInput) => {
  loading.value = true
  try {
    const response = await authApi.login(credentials)
    token.value = response.token
    user.value = response.user

    // 儲存到 localStorage
    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))
  } catch (err) {
    error.value = '登入失敗'
    throw err
  } finally {
    loading.value = false
  }
}
```

#### `register(userData: RegisterInput): Promise<void>`
**註冊方法**

類似 login，註冊成功後自動登入。

#### `logout(): void`
**登出方法**

```typescript
const logout = () => {
  user.value = null
  token.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}
```

#### `checkAuth(): void`
**檢查認證狀態**

應用啟動時呼叫，從 localStorage 恢復登入狀態。

```typescript
const checkAuth = () => {
  const storedToken = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')

  if (storedToken && storedUser) {
    token.value = storedToken
    user.value = JSON.parse(storedUser)
  }
}
```

### 使用範例

```vue
<script setup>
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()

// 登入
await authStore.login({ email, password })

// 檢查認證狀態
if (authStore.isAuthenticated) {
  // 已登入
}

// 登出
authStore.logout()
</script>
```

---

## ✅ taskStore.ts - 任務狀態管理

### 職責
- 管理任務列表
- 處理任務 CRUD 操作
- 快取任務資料
- 提供任務篩選與搜尋

### State（狀態）

```typescript
const tasks = ref<Task[]>([])  // 任務列表
const selectedTask = ref<Task | null>(null)  // 當前選擇的任務
const loading = ref(false)
const error = ref<string | null>(null)
```

### Getters（計算屬性）

```typescript
// 待處理任務
const pendingTasks = computed(() =>
  tasks.value.filter(t => t.status === 'pending')
)

// 進行中任務
const inProgressTasks = computed(() =>
  tasks.value.filter(t => t.status === 'in-progress')
)

// 已完成任務
const completedTasks = computed(() =>
  tasks.value.filter(t => t.status === 'completed')
)

// 任務總數統計
const taskStats = computed(() => ({
  total: tasks.value.length,
  pending: pendingTasks.value.length,
  inProgress: inProgressTasks.value.length,
  completed: completedTasks.value.length
}))
```

### Actions（方法）

#### `fetchTasks(): Promise<void>`
**取得任務列表**

```typescript
const fetchTasks = async () => {
  loading.value = true
  try {
    const data = await taskApi.getTasks()
    tasks.value = data
  } catch (err) {
    error.value = '無法載入任務'
  } finally {
    loading.value = false
  }
}
```

#### `createTask(taskData: CreateTaskInput): Promise<Task>`
**建立新任務**

```typescript
const createTask = async (taskData: CreateTaskInput) => {
  const task = await taskApi.createTask(taskData)
  tasks.value.push(task)  // 加入列表
  return task
}
```

#### `updateTask(id: string, updates: UpdateTaskInput): Promise<Task>`
**更新任務**

```typescript
const updateTask = async (id: string, updates: UpdateTaskInput) => {
  const updated = await taskApi.updateTask(id, updates)

  // 更新 store 中的任務
  const index = tasks.value.findIndex(t => t._id === id)
  if (index !== -1) {
    tasks.value[index] = updated
  }

  return updated
}
```

#### `deleteTask(id: string): Promise<void>`
**刪除任務**

```typescript
const deleteTask = async (id: string) => {
  await taskApi.deleteTask(id)

  // 從列表移除
  tasks.value = tasks.value.filter(t => t._id !== id)
}
```

#### `getTaskById(id: string): Task | undefined`
**根據 ID 取得任務**

```typescript
const getTaskById = (id: string) => {
  return tasks.value.find(t => t._id === id)
}
```

---

## 🍅 pomodoroStore.ts - 番茄鐘狀態管理

### 職責
- 管理番茄鐘計時器狀態
- 處理計時器邏輯
- 管理番茄鐘會話
- 處理休息計時器

### State（狀態）

```typescript
const activeSession = ref<PomodoroSession | null>(null)
const sessions = ref<PomodoroSession[]>([])

const timerState = ref<TimerState>({
  remaining: 0,      // 剩餘時間（毫秒）
  elapsed: 0,        // 已用時間（毫秒）
  progress: 0,       // 進度百分比
  isRunning: false,  // 是否運行中
  isPaused: false    // 是否已暫停
})

const breakTimerState = ref<BreakTimerState>({
  type: null,        // 'short' | 'long' | null
  duration: 0,       // 休息時長（毫秒）
  remaining: 0,      // 剩餘時間（毫秒）
  isRunning: false
})

const loading = ref(false)
const error = ref<string | null>(null)
```

### Getters（計算屬性）

```typescript
const hasActiveSession = computed(() => !!activeSession.value)
const isTimerRunning = computed(() => timerState.value.isRunning)
const hasActiveBreak = computed(() => breakTimerState.value.type !== null)

// 格式化時間顯示
const formattedRemaining = computed(() =>
  formatTime(timerState.value.remaining)
)
const formattedElapsed = computed(() =>
  formatTime(timerState.value.elapsed)
)
const formattedBreakRemaining = computed(() =>
  formatTime(breakTimerState.value.remaining)
)

// 今日完成的番茄鐘數
const completedSessionsToday = computed(() => {
  const today = new Date().toDateString()
  return sessions.value.filter(s =>
    s.status === 'completed' &&
    new Date(s.startTime).toDateString() === today
  ).length
})
```

### Actions（方法）

#### `setActiveSession(session: PomodoroSession): void`
**設定當前會話並啟動計時器**

```typescript
const setActiveSession = (session: PomodoroSession) => {
  activeSession.value = session

  // 計算並啟動計時器
  const duration = session.duration
  const elapsed = Date.now() - new Date(session.startTime).getTime()
  const remaining = Math.max(0, duration - elapsed)

  updateTimerState({ remaining, elapsed, ... })
  startTimerTicking()
}
```

#### `startTimerTicking(): void`
**啟動計時器倒數**

```typescript
let timerInterval: number | null = null

const startTimerTicking = () => {
  if (timerInterval) clearInterval(timerInterval)

  timerInterval = window.setInterval(() => {
    if (!activeSession.value) return

    const now = Date.now()
    const startTime = new Date(activeSession.value.startTime).getTime()
    const duration = activeSession.value.duration

    const elapsed = now - startTime
    const remaining = Math.max(0, duration - elapsed)
    const progress = (elapsed / duration) * 100

    timerState.value = {
      remaining,
      elapsed,
      progress,
      isRunning: remaining > 0,
      isPaused: false
    }

    // 時間到了
    if (remaining <= 0) {
      stopTimerTicking()
    }
  }, 1000)  // 每秒更新
}
```

#### `pauseTimer(): void`
**暫停計時器**

```typescript
const pauseTimer = () => {
  stopTimerTicking()
  timerState.value.isPaused = true
  timerState.value.isRunning = false
}
```

#### `resumeTimer(): void`
**恢復計時器**

```typescript
const resumeTimer = () => {
  timerState.value.isPaused = false
  timerState.value.isRunning = true
  startTimerTicking()
}
```

#### `startBreakTimer(type: 'short' | 'long', duration: number): void`
**啟動休息計時器**

```typescript
const startBreakTimer = (type: 'short' | 'long', duration: number) => {
  stopBreakTimer()  // 清除現有計時器

  breakTimerState.value = {
    type,
    duration,
    remaining: duration,
    isRunning: true
  }

  const startTime = Date.now()

  breakTimerInterval = window.setInterval(() => {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, duration - elapsed)

    breakTimerState.value.remaining = remaining
    breakTimerState.value.isRunning = remaining > 0

    if (remaining <= 0) {
      stopBreakTimer()
    }
  }, 1000)
}
```

#### `stopBreakTimer(): void`
**停止休息計時器**

#### `formatTime(milliseconds: number): string`
**格式化時間為 MM:SS**

```typescript
const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
```

---

## 📊 analyticsStore.ts - 數據分析狀態管理

### 職責
- 管理分析數據
- 快取分析結果
- 處理時間範圍選擇

### State（狀態）

```typescript
const analytics = ref<AnalyticsData | null>(null)
const summary = ref<AnalyticsSummary | null>(null)
const timeRange = ref<{ startDate: string; endDate: string } | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
```

### Getters（計算屬性）

```typescript
const hasData = computed(() => !!analytics.value || !!summary.value)
```

### Actions（方法）

#### `fetchAnalytics(startDate?: string, endDate?: string): Promise<void>`
**取得分析數據**

```typescript
const fetchAnalytics = async (startDate?: string, endDate?: string) => {
  loading.value = true
  try {
    const response = await analyticsApi.getAnalytics(startDate, endDate)
    analytics.value = response.analytics
    timeRange.value = response.timeRange
  } finally {
    loading.value = false
  }
}
```

#### `fetchSummary(startDate?: string, endDate?: string): Promise<void>`
**取得摘要數據**

---

## 🏗️ Store 設計模式

### Setup Store 風格（推薦）

```typescript
export const useFeatureStore = defineStore('feature', () => {
  // State - 使用 ref
  const data = ref<Data[]>([])
  const loading = ref(false)

  // Getters - 使用 computed
  const count = computed(() => data.value.length)

  // Actions - 使用 function
  const fetchData = async () => { /* ... */ }

  // 返回所有需要暴露的內容
  return { data, loading, count, fetchData }
})
```

### Options Store 風格（傳統）

```typescript
export const useFeatureStore = defineStore('feature', {
  state: () => ({
    data: [],
    loading: false
  }),

  getters: {
    count: (state) => state.data.length
  },

  actions: {
    async fetchData() { /* ... */ }
  }
})
```

本專案採用 **Setup Store** 風格，與 Composition API 一致。

---

## 📦 Store 使用範例

### 在元件中使用

```vue
<script setup lang="ts">
import { useTaskStore } from '@/stores/taskStore'
import { usePomodoroStore } from '@/stores/pomodoroStore'

// 取得 store 實例
const taskStore = useTaskStore()
const pomodoroStore = usePomodoroStore()

// 存取狀態（響應式）
const tasks = taskStore.tasks
const isTimerRunning = pomodoroStore.isTimerRunning

// 呼叫 actions
await taskStore.fetchTasks()
pomodoroStore.pauseTimer()

// 存取 getters
const pending = taskStore.pendingTasks
const formattedTime = pomodoroStore.formattedRemaining
</script>

<template>
  <div>
    <p>任務數: {{ tasks.length }}</p>
    <p>待處理: {{ pending.length }}</p>
    <p>計時器運行中: {{ isTimerRunning }}</p>
    <p>剩餘時間: {{ formattedTime }}</p>
  </div>
</template>
```

### 在 Composable 中使用

```typescript
export function useTasks() {
  const taskStore = useTaskStore()

  // 封裝 store 的方法
  const createTask = async (data: CreateTaskInput) => {
    return await taskStore.createTask(data)
  }

  // 返回響應式資料
  return {
    tasks: computed(() => taskStore.tasks),
    pendingTasks: computed(() => taskStore.pendingTasks),
    createTask
  }
}
```

---

## 🔄 Store 之間的互動

Store 可以互相使用：

```typescript
// pomodoroStore.ts
export const usePomodoroStore = defineStore('pomodoro', () => {
  const taskStore = useTaskStore()  // 使用其他 store

  const completeSession = async () => {
    // 完成番茄鐘時更新任務
    const taskId = activeSession.value?.taskId
    if (taskId) {
      await taskStore.incrementActualPomodoros(taskId)
    }
  }

  return { completeSession }
})
```

---

## 💾 資料持久化

### localStorage 同步

```typescript
// 儲存到 localStorage
const saveToLocalStorage = () => {
  localStorage.setItem('tasks', JSON.stringify(tasks.value))
}

// 從 localStorage 載入
const loadFromLocalStorage = () => {
  const stored = localStorage.getItem('tasks')
  if (stored) {
    tasks.value = JSON.parse(stored)
  }
}

// 監聽變化自動儲存
watch(tasks, saveToLocalStorage, { deep: true })
```

### 與後端同步

Store 通過 API 服務與後端同步：

```
Component → Store → API Service → Backend
          ← Store ← API Response ←
```

---

## 🔗 相關文件

- [Services 說明](../services/explanation.md) - Store 使用的 API 服務
- [Composables 說明](../composables/explanation.md) - 封裝 Store 的可組合邏輯
- [Components 說明](../components/explanation.md) - 使用 Store 的元件
