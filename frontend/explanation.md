# Frontend 前端說明文件

本目錄包含番茄鐘任務規劃系統的前端應用程式碼。

## 📁 目錄結構

```
frontend/
├── src/                    # 原始碼目錄
│   ├── components/        # Vue 元件
│   ├── composables/       # Composition API 可組合函式
│   ├── pages/             # 頁面元件
│   ├── router/            # 路由配置
│   ├── services/          # API 客戶端服務
│   ├── stores/            # Pinia 狀態管理
│   ├── types/             # TypeScript 型別定義
│   ├── assets/            # 靜態資源（圖片、字體等）
│   ├── App.vue            # 根元件
│   ├── main.ts            # 應用程式入口
│   └── style.css          # 全域樣式
├── public/                # 公開靜態資源
├── tests/                 # 測試檔案
├── index.html             # HTML 入口檔案
├── package.json           # 專案依賴配置
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 建置工具配置
├── tailwind.config.js     # Tailwind CSS 配置
└── .env.example           # 環境變數範例
```

## 📄 根目錄檔案說明

### `package.json`
專案的套件管理配置檔案，定義：
- 專案名稱、版本、描述
- 專案依賴套件
  - `vue`: Vue 3 框架
  - `vue-router`: 路由管理
  - `pinia`: 狀態管理
  - `axios`: HTTP 客戶端
  - `chart.js`: 圖表庫
  - `vue-chartjs`: Vue Chart.js 封裝
- 開發工具套件
  - `vite`: 快速建置工具
  - `typescript`: 型別檢查
  - `tailwindcss`: CSS 框架
  - `eslint`: 程式碼檢查
  - `prettier`: 程式碼格式化
- npm/yarn 指令腳本
  - `dev`: 開發模式啟動（Vite Dev Server）
  - `build`: 建置生產版本
  - `preview`: 預覽生產版本
  - `test:unit`: 執行單元測試
  - `lint`: 程式碼檢查
  - `format`: 程式碼格式化

### `vite.config.ts`
Vite 建置工具配置檔案，設定：
- Vue 插件配置
- 路徑別名（@/ → src/）
- 開發伺服器配置（端口、Proxy）
- 建置輸出配置

### `tsconfig.json`
TypeScript 編譯器配置檔案，設定：
- 編譯目標版本
- 模組系統
- 路徑別名
- 嚴格模式選項
- Vue 型別支援

### `tailwind.config.js`
Tailwind CSS 配置檔案，設定：
- 內容掃描路徑
- 主題客製化（顏色、字體、間距）
- 插件配置

### `.env.example`
環境變數範例檔案：
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### `index.html`
HTML 入口檔案，包含：
- `<div id="app">`: Vue 應用掛載點
- 引入 `main.ts`

## 📂 主要目錄說明

### `src/` - 原始碼目錄
包含所有前端應用程式的原始碼。

### `src/components/` - 元件目錄
存放所有可重用的 Vue 元件，詳細說明請見 [src/components/explanation.md](src/components/explanation.md)

### `src/composables/` - 可組合函式目錄
存放 Vue Composition API 的可組合邏輯，詳細說明請見 [src/composables/explanation.md](src/composables/explanation.md)

### `src/pages/` - 頁面目錄
存放路由對應的頁面元件，詳細說明請見 [src/pages/explanation.md](src/pages/explanation.md)

### `src/router/` - 路由目錄
Vue Router 路由配置，詳細說明請見 [src/router/explanation.md](src/router/explanation.md)

### `src/services/` - API 服務目錄
HTTP API 客戶端服務，詳細說明請見 [src/services/explanation.md](src/services/explanation.md)

### `src/stores/` - 狀態管理目錄
Pinia Store 狀態管理，詳細說明請見 [src/stores/explanation.md](src/stores/explanation.md)

## 🏗️ 架構設計原則

### MVVM 架構模式
```
View (Template)
    ↓ ↑
ViewModel (Composables + Stores)
    ↓ ↑
Model (Services + API)
```

### 元件設計原則
- **單一職責**: 每個元件只負責一個明確的功能
- **可重用性**: 抽離共用邏輯到 Composables
- **Props Down, Events Up**: 父子元件通訊規則
- **組合優於繼承**: 使用 Composition API 組合邏輯

### 狀態管理原則
- **全域狀態**: 使用 Pinia Store
- **本地狀態**: 使用 Vue `ref` / `reactive`
- **計算屬性**: 使用 `computed` 衍生資料
- **副作用**: 使用 `watch` / `watchEffect`

## 🚀 應用程式啟動流程

1. **載入 index.html**
2. **執行 main.ts**
   - 建立 Vue 應用實例
   - 註冊 Pinia（狀態管理）
   - 註冊 Vue Router（路由）
   - 掛載到 `#app`
3. **渲染 App.vue（根元件）**
   - 顯示 `<RouterView>`
4. **路由匹配**
   - 根據 URL 渲染對應頁面元件
5. **元件生命週期**
   - Setup → 掛載 → 更新 → 卸載

## 📊 資料流向

### Pinia Store 資料流
```
Component（元件）
    ↓ Action 呼叫
Pinia Store（狀態管理）
    ↓ API 呼叫
API Service（服務層）
    ↓ HTTP 請求
Backend API（後端）
    ↓ 回應資料
API Service
    ↓ 更新 State
Pinia Store
    ↓ 響應式更新
Component（自動重新渲染）
```

### Composable 資料流
```
Component 呼叫 useTask()
    ↓
Composable 呼叫 taskStore
    ↓
Store 呼叫 taskApi
    ↓
API 發送 HTTP 請求
    ↓
回應更新 Store State
    ↓
Composable 回傳響應式資料
    ↓
Component 自動更新 UI
```

## 🎨 樣式系統

### Tailwind CSS Utility Classes
使用 Tailwind 的 utility-first 方法：
```vue
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <!-- 內容 -->
</div>
```

### Scoped Styles
元件內的 `<style scoped>` 確保樣式只作用於當前元件：
```vue
<style scoped>
.custom-button {
  /* 只影響此元件 */
}
</style>
```

### 全域樣式
`src/style.css` 定義全域樣式變數與基礎樣式。

## 🔐 認證流程

### 登入流程
```
LoginPage
    ↓ 提交表單
useAuth.login()
    ↓
authStore.login()
    ↓
authApi.login() → POST /api/auth/login
    ↓ 收到 Token
儲存 Token 到 localStorage
    ↓
更新 authStore.user
    ↓
導航到 /tasks
```

### 受保護路由
```
使用者訪問 /tasks
    ↓
router/index.ts beforeEach 守衛
    ↓
檢查 authStore.isAuthenticated
    ↓ 未登入
重導向到 /login
```

### API 請求認證
```
API 請求發送前
    ↓
axios interceptor
    ↓
讀取 localStorage 的 Token
    ↓
添加 Authorization Header
    ↓
發送請求
```

## 📱 響應式設計

使用 Tailwind 的響應式斷點：
- `sm:`: 640px 以上
- `md:`: 768px 以上
- `lg:`: 1024px 以上
- `xl:`: 1280px 以上

範例：
```vue
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- 手機單欄、平板雙欄、桌面三欄 -->
</div>
```

## 🧪 測試策略

- **元件測試**: 使用 Vitest + Vue Test Utils
- **E2E 測試**: 使用 Playwright（規劃中）
- **型別檢查**: TypeScript 編譯時檢查

## 📦 建置流程

### 開發模式
```bash
yarn dev
```
- Vite 啟動開發伺服器（端口 5173）
- 熱模組替換（HMR）即時更新
- Source Map 支援除錯

### 生產建置
```bash
yarn build
```
1. TypeScript 型別檢查
2. Vue SFC 編譯
3. JavaScript 打包與壓縮
4. CSS 提取與最小化
5. 靜態資源處理
6. 輸出到 `dist/` 目錄

## 🔗 相關文件

- [元件說明](src/components/explanation.md)
- [可組合函式說明](src/composables/explanation.md)
- [頁面說明](src/pages/explanation.md)
- [路由說明](src/router/explanation.md)
- [API 服務說明](src/services/explanation.md)
- [狀態管理說明](src/stores/explanation.md)

## 📝 開發規範

- 使用 **TypeScript** 進行型別安全開發
- 使用 **Composition API** (`<script setup>`)
- 遵循 **Vue 3 風格指南**
- 元件命名使用 **PascalCase**
- Props 定義使用 **defineProps** 配合 TypeScript interface
- Emit 定義使用 **defineEmits**
- 保持元件檔案在 **300 行以內**
- 複雜邏輯抽離到 **Composables**

## 🎯 效能優化

- **懶載入路由**: 使用動態 import
- **元件懶載入**: 大型元件使用 `defineAsyncComponent`
- **圖表按需載入**: Chart.js 只註冊需要的元件
- **API 請求快取**: Pinia Store 快取資料
- **防抖與節流**: 輸入事件使用 debounce
