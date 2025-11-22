# Frontend Source Code 前端原始碼說明

本目錄包含前端應用程式的所有原始碼。

## 📄 核心檔案

### `main.ts`
**應用程式入口檔案**

這是整個前端應用程式的啟動檔案，負責：

1. **建立 Vue 應用實例**: `createApp(App)`
2. **註冊 Pinia**: 狀態管理系統
   ```typescript
   app.use(createPinia())
   ```
3. **註冊 Vue Router**: 路由系統
   ```typescript
   app.use(router)
   ```
4. **掛載應用**: 將應用掛載到 DOM
   ```typescript
   app.mount('#app')
   ```

**程式流程**:
```typescript
import App from './App.vue'
    ↓
建立 Vue 實例
    ↓
註冊插件（Pinia + Router）
    ↓
掛載到 #app
    ↓
渲染根元件 App.vue
```

---

### `App.vue`
**根元件**

應用程式的最頂層元件，包含：

**Template 結構**:
```vue
<template>
  <div id="app">
    <AppNav />        <!-- 導航列（若已登入） -->
    <RouterView />    <!-- 路由視圖，渲染當前頁面 -->
  </div>
</template>
```

**職責**:
- 提供應用程式的整體佈局
- 顯示導航列
- 渲染路由匹配的頁面元件
- 管理全域樣式類別

---

### `style.css`
**全域樣式檔案**

定義整個應用程式的全域樣式：

1. **Tailwind 基礎層**:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

2. **CSS 變數定義**:
   ```css
   :root {
     --primary-color: #6366f1;
     --text-color: #1f2937;
     /* ... */
   }
   ```

3. **全域樣式重置**:
   - 字體系統
   - 基礎排版
   - 表單元素樣式
   - 滾動條樣式

4. **工具類別**:
   ```css
   .container-app { /* 容器樣式 */ }
   .btn-primary { /* 主要按鈕樣式 */ }
   ```

---

## 📂 子目錄說明

### `components/` - 元件目錄
存放所有可重用的 Vue 元件，按功能分類組織。

**目錄結構**:
```
components/
├── analytics/     # 數據分析相關元件
├── auth/          # 認證相關元件
├── common/        # 通用基礎元件
├── pomodoro/      # 番茄鐘相關元件
└── tasks/         # 任務管理相關元件
```

**元件分類**:
- **展示型元件** (Presentational): 只負責 UI 呈現，不包含業務邏輯
- **容器型元件** (Container): 包含業務邏輯，與 Store 互動

📖 詳細說明: [components/explanation.md](components/explanation.md)

---

### `composables/` - 可組合函式目錄
存放 Vue Composition API 的可組合邏輯，提供響應式的業務邏輯封裝。

**包含檔案**:
- `useAuth.ts`: 認證相關邏輯
- `useTasks.ts`: 任務管理邏輯
- `usePomodoro.ts`: 番茄鐘邏輯
- `useAnalytics.ts`: 數據分析邏輯
- `useNotifications.ts`: 通知系統邏輯

**設計模式**:
```typescript
// Composable 基本結構
export function useFeature() {
  const store = useFeatureStore()

  // 響應式狀態
  const data = computed(() => store.data)

  // 方法
  const fetchData = async () => { /* ... */ }

  // 返回
  return { data, fetchData }
}
```

📖 詳細說明: [composables/explanation.md](composables/explanation.md)

---

### `pages/` - 頁面目錄
存放路由對應的頁面元件，每個檔案對應一個路由。

**包含頁面**:
- `LoginPage.vue`: 登入頁面 (`/login`)
- `RegisterPage.vue`: 註冊頁面 (`/register`)
- `TasksPage.vue`: 任務列表頁面 (`/tasks`)
- `ApplyModePage.vue`: 番茄鐘執行頁面 (`/apply-mode`)
- `AnalyticsPage.vue`: 數據分析頁面 (`/analytics`)
- `CustomFieldsPage.vue`: 自訂欄位頁面 (`/custom-fields`)
- `GroupsPage.vue`: 群組管理頁面 (`/groups`)

**頁面元件特點**:
- 直接對應路由路徑
- 通常是容器型元件
- 組合多個子元件
- 處理頁面層級的邏輯

📖 詳細說明: [pages/explanation.md](pages/explanation.md)

---

### `router/` - 路由目錄
Vue Router 路由配置，定義 URL 與頁面元件的映射關係。

**包含檔案**:
- `index.ts`: 路由配置主檔案

**路由配置內容**:
```typescript
const routes = [
  { path: '/login', component: LoginPage },
  { path: '/tasks', component: TasksPage, meta: { requiresAuth: true } },
  // ...
]
```

**路由守衛**:
- `beforeEach`: 全域前置守衛，檢查認證狀態
- `meta.requiresAuth`: 需要認證的路由標記

📖 詳細說明: [router/explanation.md](router/explanation.md)

---

### `services/` - API 服務目錄
HTTP API 客戶端服務，封裝所有後端 API 呼叫。

**包含檔案**:
- `api.ts`: Axios 實例配置（基礎 URL、攔截器）
- `authApi.ts`: 認證相關 API
- `taskApi.ts`: 任務管理 API
- `pomodoroApi.ts`: 番茄鐘 API
- `analyticsApi.ts`: 數據分析 API

**API 服務結構**:
```typescript
// authApi.ts 範例
export async function login(credentials: LoginInput): Promise<AuthResponse> {
  const response = await api.post('/auth/login', credentials)
  return response.data
}
```

**Axios 攔截器**:
- **請求攔截器**: 自動添加 JWT Token
- **回應攔截器**: 統一處理錯誤

📖 詳細說明: [services/explanation.md](services/explanation.md)

---

### `stores/` - 狀態管理目錄
Pinia Store 狀態管理，管理應用程式的全域狀態。

**包含檔案**:
- `authStore.ts`: 使用者認證狀態
- `taskStore.ts`: 任務列表狀態
- `pomodoroStore.ts`: 番茄鐘計時器狀態
- `analyticsStore.ts`: 數據分析狀態

**Store 結構**:
```typescript
export const useFeatureStore = defineStore('feature', () => {
  // State（狀態）
  const data = ref<DataType[]>([])

  // Getters（計算屬性）
  const filteredData = computed(() => /* ... */)

  // Actions（方法）
  const fetchData = async () => { /* ... */ }

  return { data, filteredData, fetchData }
})
```

📖 詳細說明: [stores/explanation.md](stores/explanation.md)

---

### `types/` - 型別定義目錄
TypeScript 型別定義檔案，提供型別安全。

**包含檔案**:
- `auth.types.ts`: 認證相關型別
- `task.types.ts`: 任務相關型別
- `pomodoro.types.ts`: 番茄鐘相關型別
- `analytics.types.ts`: 數據分析相關型別

**型別範例**:
```typescript
// task.types.ts
export interface Task {
  _id: string
  userId: string
  name: string
  description?: string
  estimatedPomodoros: number
  actualPomodoros: number
  status: 'pending' | 'in-progress' | 'completed'
  createdAt: Date
  updatedAt: Date
}
```

---

## 🏗️ 元件通訊模式

### Props Down, Events Up
```
Parent Component（父元件）
    ↓ Props 傳遞資料
Child Component（子元件）
    ↓ Emit 發送事件
Parent Component（父元件處理事件）
```

### Provide / Inject（跨層級通訊）
```
Ancestor Component
    ↓ provide('key', value)
Descendant Component
    ↓ const value = inject('key')
```

### Store（全域狀態）
```
Component A
    ↓ store.action()
Pinia Store（更新狀態）
    ↓ 響應式更新
Component B（自動重新渲染）
```

---

## 🔄 響應式系統

### ref vs reactive

**ref**: 基本型別與單一物件
```typescript
const count = ref(0)
const user = ref<User | null>(null)

// 存取需要 .value
count.value++
```

**reactive**: 複雜物件
```typescript
const state = reactive({
  loading: false,
  data: [],
  error: null
})

// 直接存取屬性
state.loading = true
```

### computed（計算屬性）
```typescript
const filteredTasks = computed(() => {
  return tasks.value.filter(t => t.status === 'pending')
})
// 自動追蹤依賴，快取結果
```

### watch（監聽器）
```typescript
watch(searchTerm, (newValue) => {
  // 當 searchTerm 變化時執行
  performSearch(newValue)
})
```

---

## 📊 資料流程範例

### 完整的任務建立流程

```typescript
// 1. 使用者在 TasksPage 點擊「新增任務」
<TaskForm @submit="handleCreate" />

// 2. TaskForm emit submit 事件
const emit = defineEmits<{
  submit: [task: CreateTaskInput]
}>()
emit('submit', formData)

// 3. TasksPage 處理事件
const handleCreate = async (taskData: CreateTaskInput) => {
  await createTask(taskData)  // 呼叫 composable
}

// 4. useTasks composable 呼叫 store
const createTask = async (taskData: CreateTaskInput) => {
  await taskStore.createTask(taskData)
}

// 5. taskStore 呼叫 API
const createTask = async (taskData: CreateTaskInput) => {
  const task = await taskApi.createTask(taskData)
  tasks.value.push(task)  // 更新 state
}

// 6. taskApi 發送 HTTP 請求
export async function createTask(data: CreateTaskInput) {
  const response = await api.post('/tasks', data)
  return response.data
}

// 7. 後端回應，資料自動更新
// 8. TaskList 自動重新渲染（響應式）
```

---

## 🎨 樣式架構

### 樣式層級

1. **全域樣式** (`style.css`)
   - Tailwind 基礎
   - CSS 變數
   - 重置樣式

2. **元件樣式** (`<style scoped>`)
   - 元件特定樣式
   - Scoped 確保不污染全域

3. **Inline 樣式** (`:style`)
   - 動態樣式
   - 響應式變化

### Tailwind 優先使用
```vue
<!-- 優先使用 Tailwind -->
<div class="flex items-center gap-4 p-6 bg-white rounded-lg shadow">

<!-- 特殊需求才用 scoped -->
<style scoped>
.custom-animation {
  /* Tailwind 無法實現的動畫 */
}
</style>
```

---

## 🔐 安全性實踐

### XSS 防護
- Vue 自動轉義插值內容
- 使用 `v-html` 時務必消毒內容

### CSRF 防護
- JWT Token 存儲在 localStorage
- 每次請求自動添加 Authorization Header

### 輸入驗證
- 前端驗證（用戶體驗）
- 後端驗證（安全性）- 主要防線

---

## 🔗 相關文件

- [元件詳細說明](components/explanation.md)
- [可組合函式詳細說明](composables/explanation.md)
- [頁面詳細說明](pages/explanation.md)
- [路由詳細說明](router/explanation.md)
- [API 服務詳細說明](services/explanation.md)
- [狀態管理詳細說明](stores/explanation.md)
