# Components 元件說明文件

本目錄包含所有可重用的 Vue 元件，按功能領域分類組織。

## 📁 目錄結構

```
components/
├── analytics/         # 數據分析相關元件
├── auth/              # 認證相關元件
├── common/            # 通用基礎元件
├── pomodoro/          # 番茄鐘相關元件
└── tasks/             # 任務管理相關元件
```

---

## 📊 analytics/ - 數據分析元件

### `CompletionRateChart.vue`
**任務完成率圓餅圖元件**

**功能**: 以圓餅圖視覺化呈現任務完成狀態分布

**Props**:
```typescript
interface Props {
  metrics: CompletionRateMetrics | null
}
// CompletionRateMetrics 包含: completed, inProgress, pending 任務數
```

**技術實作**:
- 使用 `vue-chartjs` 的 `Pie` 元件
- Chart.js 配置: 顯示圖例、工具提示
- 顏色方案:
  - 已完成 (綠色): `rgba(34, 197, 94, 0.8)`
  - 進行中 (藍色): `rgba(59, 130, 246, 0.8)`
  - 待處理 (灰色): `rgba(156, 163, 175, 0.8)`

**資料結構**:
```typescript
chartData = {
  labels: ['Completed', 'In Progress', 'Pending'],
  datasets: [{
    data: [completed, inProgress, pending],
    backgroundColor: [綠, 藍, 灰]
  }]
}
```

**顯示內容**:
- 圓餅圖
- 完成率百分比（大數字顯示）
- 各狀態數量統計

---

### `PomodoroAccuracyChart.vue`
**番茄鐘估算準確度長條圖元件**

**功能**: 比較預估與實際番茄鐘數，顯示估算準確度

**Props**:
```typescript
interface Props {
  metrics: PomodoroAccuracyMetrics | null
}
// 包含: estimatedTotal, actualTotal, accuracyRate, averageDeviation
```

**技術實作**:
- 使用 `vue-chartjs` 的 `Bar` 元件
- 雙長條對比: 預估 vs 實際
- Y 軸從 0 開始，步長為 1

**顯示內容**:
- 長條圖（預估/實際對比）
- 準確率百分比
- 平均偏差值

---

### `TimeDistributionChart.vue`
**時間分布折線圖元件**

**功能**: 顯示每日番茄鐘數量趨勢

**Props**:
```typescript
interface Props {
  metrics: TimeDistributionMetrics | null
}
// 包含: totalPomodoros, totalFocusTime, averageSessionDuration,
//      sessionsPerDay, mostProductiveHour
```

**技術實作**:
- 使用 `vue-chartjs` 的 `Line` 元件
- 區域填充效果 (`fill: true`)
- 平滑曲線 (`tension: 0.4`)

**顯示內容**:
- 折線圖（每日番茄鐘數）
- 總番茄鐘數
- 總專注時間（小時）
- 平均每次時長（分鐘）
- 最高效時段

---

## 🔐 auth/ - 認證元件

### `LoginForm.vue`
**登入表單元件**

**功能**: 提供使用者登入介面

**表單欄位**:
- Email（必填，email 格式驗證）
- Password（必填，最少 8 字元）

**驗證邏輯**:
```typescript
const validateEmail = (): boolean => {
  if (!formData.value.email) {
    errors.value.email = 'Email is required'
    return false
  }
  // Email 格式驗證
}
```

**提交流程**:
1. 驗證表單欄位
2. 呼叫 `authApi.login()`
3. 成功後儲存 Token
4. emit `success` 事件
5. 父元件導航到 /tasks

**Emits**:
```typescript
{
  success: [] // 登入成功時觸發
}
```

**錯誤處理**:
- 即時表單驗證
- API 錯誤訊息顯示
- 載入狀態管理

---

### `RegisterForm.vue`
**註冊表單元件**

**功能**: 提供使用者註冊介面

**表單欄位**:
- Name（必填）
- Email（必填，email 格式）
- Password（必填，最少 8 字元）
- Confirm Password（必填，需與密碼一致）

**驗證邏輯**:
- 所有欄位必填
- Email 格式檢查
- 密碼長度檢查
- 密碼確認比對

**提交流程**:
1. 驗證所有欄位
2. 呼叫 `authApi.register()`
3. 成功後自動登入
4. 導航到 /tasks

---

## 🧩 common/ - 通用元件

### `AppInput.vue`
**通用輸入框元件**

**功能**: 可重用的表單輸入框，支援多種類型

**Props**:
```typescript
interface Props {
  modelValue: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'time'
  label?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
}
```

**v-model 支援**:
```vue
<!-- 父元件使用 -->
<AppInput v-model="email" type="email" label="Email" />
```

**樣式狀態**:
- 正常狀態: 藍色 focus 框
- 錯誤狀態: 紅色框 + 錯誤訊息

**可訪問性**:
- label 與 input 關聯
- required 屬性支援
- 錯誤訊息 aria-describedby

---

### `AppNav.vue`
**導航列元件**

**功能**: 應用程式頂部導航列

**導航項目**:
- Tasks（任務列表）
- Apply Mode（執行模式）
- Analytics（數據分析）
- Custom Fields（自訂欄位）
- Groups（群組）

**使用者選單**:
- 顯示使用者名稱
- 登出按鈕

**響應式設計**:
- 桌面版: 水平導航
- 行動版: 漢堡選單（規劃中）

**路由高亮**:
```vue
<router-link
  :class="{ 'active': $route.path === '/tasks' }"
>
  Tasks
</router-link>
```

---

## 🍅 pomodoro/ - 番茄鐘元件

### `PomodoroTimer.vue`
**番茄鐘計時器顯示元件**

**功能**: 顯示當前番茄鐘的計時資訊

**Props**:
```typescript
interface Props {
  remaining: number      // 剩餘時間（毫秒）
  elapsed: number        // 已用時間（毫秒）
  progress: number       // 進度百分比 (0-100)
  isRunning: boolean     // 是否運行中
  isPaused: boolean      // 是否已暫停
  taskName: string       // 任務名稱
}
```

**顯示內容**:
- 圓形進度環（SVG）
- 剩餘時間（MM:SS 格式）
- 已用時間
- 任務名稱
- 運行狀態指示

**視覺設計**:
```vue
<!-- 圓形進度環 -->
<svg class="timer-circle">
  <circle
    :stroke-dasharray="circumference"
    :stroke-dashoffset="dashOffset"
  />
</svg>
```

**進度計算**:
```typescript
const dashOffset = computed(() => {
  const offset = circumference * (1 - progress / 100)
  return offset
})
```

---

### `TimerControls.vue`
**計時器控制按鈕元件**

**功能**: 提供番茄鐘的控制按鈕

**Props**:
```typescript
interface Props {
  hasActiveSession: boolean
  isPaused: boolean
  isLoading: boolean
  completedToday: number
}
```

**按鈕狀態**:
1. **無進行中 Session**: 顯示「Start」按鈕
2. **進行中且運行**: 顯示「Pause」、「Complete」
3. **進行中且暫停**: 顯示「Resume」、「Cancel」

**Emits**:
```typescript
{
  start: []
  pause: []
  resume: []
  complete: []
  cancel: []
}
```

**今日統計**:
- 顯示今日已完成番茄鐘數
- 鼓勵訊息

---

### `BreakTimer.vue`
**休息計時器元件**

**功能**: 顯示休息時間倒數計時器

**Props**:
```typescript
interface Props {
  type: 'short' | 'long' | null
  remaining: number  // 剩餘時間（毫秒）
}
```

**顯示內容**:
- 休息類型標題（「Short Break」或「Long Break」）
- 圓形倒數計時器
- 剩餘時間（MM:SS）
- 控制按鈕

**控制按鈕**:
- **Skip Break**: 跳過休息
- **Add 5 Minutes**: 延長 5 分鐘

**Emits**:
```typescript
{
  stop: []      // 跳過休息
  extend: []    // 延長時間
}
```

**顏色區分**:
- Short Break: 綠色 (`#10b981`)
- Long Break: 紫色 (`#8b5cf6`)

---

### `BreakNotification.vue`
**休息提醒通知元件**

**功能**: 番茄鐘完成後彈出的休息建議通知

**Props**:
```typescript
interface Props {
  show: boolean
  suggestedBreak: {
    type: 'short' | 'long'
    duration: number  // 分鐘
    message: string
  } | null
}
```

**顯示內容**:
- 恭喜訊息「🎉 Pomodoro Complete!」
- 建議休息類型與時長
- 建議訊息

**操作按鈕**:
- **Start Break**: 開始休息
- **Continue Working**: 繼續工作
- **Close (X)**: 關閉通知

**Emits**:
```typescript
{
  close: []
  'start-break': []
  'continue-working': []
}
```

**動畫效果**:
- 淡入淡出過場
- 背景遮罩

---

## ✅ tasks/ - 任務管理元件

### `TaskList.vue`
**任務列表元件**

**功能**: 顯示任務列表，支援篩選與排序

**Props**:
```typescript
interface Props {
  tasks: Task[]
  isLoading?: boolean
  error?: string | null
}
```

**列表功能**:
- 任務卡片顯示
- 狀態篩選（全部/待處理/進行中/已完成）
- 點擊選擇任務

**Emits**:
```typescript
{
  select: [task: Task]  // 選擇任務
}
```

**空狀態**:
- 無任務時顯示空狀態提示
- 引導建立第一個任務

**載入狀態**:
- 骨架屏動畫
- 或簡單載入指示器

---

### `TaskCard.vue`
**任務卡片元件**

**功能**: 單一任務的卡片展示

**Props**:
```typescript
interface Props {
  task: Task
  selected?: boolean
}
```

**顯示內容**:
- 任務名稱
- 任務描述（若有）
- 預估番茄鐘數 vs 實際番茄鐘數
- 任務狀態標籤
- 到期日（若有）
- 分類標籤（若有）

**互動**:
- 點擊選擇任務
- 懸停效果

**狀態顏色**:
- Pending: 灰色
- In Progress: 藍色
- Completed: 綠色

---

### `TaskForm.vue`
**任務表單元件**

**功能**: 建立/編輯任務的表單

**Props**:
```typescript
interface Props {
  task?: Task | null  // 編輯模式時傳入
  isLoading?: boolean
}
```

**表單欄位**:
- **Task Name**（必填）
- **Description**（選填）
- **Estimated Pomodoros**（必填，數字，最少 1）
- **Due Date**（選填）
- **Category/Group**（選填）

**驗證規則**:
```typescript
const validate = (): boolean => {
  // 名稱: 必填，3-200 字元
  // 預估番茄鐘: 必填，1-100
  // 描述: 最多 2000 字元
}
```

**Emits**:
```typescript
{
  submit: [taskData: CreateTaskInput | UpdateTaskInput]
  cancel: []
}
```

**模式**:
- **建立模式**: task prop 為 null
- **編輯模式**: task prop 有值，預填表單

---

## 🎨 元件設計原則

### 單一職責原則
每個元件只負責一個明確的功能：
- `TaskCard` 只負責顯示任務卡片
- `TaskForm` 只負責表單輸入
- `TaskList` 負責組織任務卡片列表

### Props Down, Events Up
```vue
<!-- 父元件 -->
<TaskForm
  :task="selectedTask"
  @submit="handleSubmit"
/>

<!-- TaskForm 元件內 -->
const emit = defineEmits(['submit'])
emit('submit', formData)
```

### 可重用性
```vue
<!-- AppInput 可用於多種場景 -->
<AppInput v-model="email" type="email" />
<AppInput v-model="password" type="password" />
<AppInput v-model="name" type="text" />
```

### Composition API
```vue
<script setup lang="ts">
// 使用 Composition API 組織邏輯
const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 響應式狀態
const formData = ref({ ... })

// 計算屬性
const isValid = computed(() => ...)

// 方法
const handleSubmit = () => { ... }
</script>
```

### TypeScript 型別安全
```typescript
interface Props {
  task: Task        // 明確型別
  isLoading: boolean
}

defineProps<Props>()  // 型別檢查
```

## 📦 元件匯出

所有元件都可以直接 import：
```typescript
import TaskList from '@/components/tasks/TaskList.vue'
import PomodoroTimer from '@/components/pomodoro/PomodoroTimer.vue'
import AppInput from '@/components/common/AppInput.vue'
```

## 🔗 相關文件

- [Composables 說明](../composables/explanation.md) - 元件使用的可組合邏輯
- [Stores 說明](../stores/explanation.md) - 元件使用的狀態管理
- [Pages 說明](../pages/explanation.md) - 元件組合成的頁面
