# Backend 後端說明文件

本目錄包含番茄鐘任務規劃系統的後端服務程式碼。

## 📁 目錄結構

```
backend/
├── src/                    # 原始碼目錄
│   ├── api/               # API 層
│   ├── models/            # 資料模型
│   ├── services/          # 業務邏輯層
│   ├── config/            # 配置檔案
│   ├── utils/             # 工具函式
│   └── server.ts          # 伺服器入口檔案
├── tests/                 # 測試檔案
├── package.json           # 專案依賴配置
├── tsconfig.json          # TypeScript 配置
└── .env.example           # 環境變數範例
```

## 📄 根目錄檔案說明

### `package.json`
專案的套件管理配置檔案，定義：
- 專案名稱、版本、描述
- 專案依賴套件（dependencies）
- 開發工具套件（devDependencies）
- npm/yarn 指令腳本（scripts）
  - `dev`: 開發模式啟動伺服器（使用 nodemon 自動重啟）
  - `build`: 編譯 TypeScript 到 JavaScript
  - `start`: 生產環境啟動伺服器
  - `test`: 執行測試套件
  - `lint`: 程式碼風格檢查
  - `format`: 程式碼格式化

### `tsconfig.json`
TypeScript 編譯器配置檔案，設定：
- 編譯目標版本（target: ES2020）
- 模組系統（module: commonjs）
- 輸出目錄（outDir: ./dist）
- 嚴格模式選項（strict: true）
- 路徑別名設定
- 型別檢查規則

### `.env.example`
環境變數範例檔案，展示需要設定的環境變數：
- `NODE_ENV`: 執行環境（development/production）
- `PORT`: 伺服器端口（預設 3000）
- `MONGODB_URI`: MongoDB 連線字串
- `JWT_SECRET`: JWT 加密金鑰
- `JWT_EXPIRES_IN`: JWT 過期時間
- `CORS_ORIGIN`: CORS 允許的來源網址

## 📂 主要目錄說明

### `src/` - 原始碼目錄
包含所有後端應用程式的原始碼，採用分層架構設計。

### `src/api/` - API 層
處理 HTTP 請求與回應的邏輯層，詳細說明請見 [src/api/explanation.md](src/api/explanation.md)

### `src/models/` - 資料模型層
定義 MongoDB 資料庫的資料結構（Schema），詳細說明請見 [src/models/explanation.md](src/models/explanation.md)

### `src/services/` - 業務邏輯層
實作核心業務邏輯，與資料庫和外部服務互動，詳細說明請見 [src/services/explanation.md](src/services/explanation.md)

### `src/config/` - 配置層
存放應用程式的配置檔案，詳細說明請見 [src/config/explanation.md](src/config/explanation.md)

### `src/utils/` - 工具函式層
提供可重用的工具函式，詳細說明請見 [src/utils/explanation.md](src/utils/explanation.md)

### `tests/` - 測試目錄
包含單元測試、整合測試、合約測試等測試檔案。

## 🏗️ 架構設計原則

### 分層架構
```
API 層 (Controllers/Routes)
    ↓
業務邏輯層 (Services)
    ↓
資料訪問層 (Models)
    ↓
資料庫 (MongoDB)
```

### 職責分離
- **API 層**: 只處理 HTTP 請求/回應，驗證輸入，不包含業務邏輯
- **Service 層**: 包含所有業務邏輯，純函式設計，易於測試
- **Model 層**: 定義資料結構與資料庫操作

### 設計模式
- **依賴注入**: Service 層不直接依賴具體實作
- **單一職責**: 每個檔案只負責一個明確的功能
- **開放封閉**: 易於擴展，不易修改現有程式碼

## 🚀 啟動流程

1. **載入環境變數** (`config/env.ts`)
2. **連接 MongoDB** (`config/database.ts`)
3. **初始化 Express 應用** (`server.ts`)
4. **註冊中介層** (CORS, JSON parser, 錯誤處理等)
5. **註冊路由** (Auth, Tasks, Pomodoro, Analytics)
6. **啟動 HTTP 伺服器** (監聽指定端口)

## 🔒 安全性考量

- **JWT 認證**: 使用 JSON Web Token 進行使用者身份驗證
- **密碼加密**: 使用 bcrypt 對密碼進行雜湊處理
- **輸入驗證**: 使用 express-validator 驗證所有輸入
- **CORS 保護**: 限制跨域請求來源
- **環境變數**: 敏感資訊不寫入程式碼，使用環境變數管理

## 📊 資料流向

### 使用者註冊/登入流程
```
客戶端 → POST /api/auth/register
    → authController.register()
    → authService.registerUser()
    → User.create() (存入資料庫)
    → 生成 JWT Token
    → 回傳 Token 給客戶端
```

### 建立任務流程
```
客戶端 → POST /api/tasks
    → authMiddleware (驗證 JWT)
    → taskController.createTask()
    → taskService.createTask()
    → Task.create() (存入資料庫)
    → 回傳任務資料給客戶端
```

### 開始番茄鐘流程
```
客戶端 → POST /api/pomodoro/start
    → authMiddleware
    → pomodoroController.startSession()
    → pomodoroService.startSession()
    → PomodoroSession.create() (存入資料庫)
    → 回傳 Session 資料給客戶端
```

## 🧪 測試策略

- **單元測試**: 測試 Service 層的純函式邏輯
- **整合測試**: 測試 API 端點與資料庫的互動
- **合約測試**: 驗證 API 回應格式符合前端預期

## 📝 開發規範

- 使用 **TypeScript** 進行型別安全開發
- 遵循 **ESLint** 程式碼風格規範
- 使用 **Prettier** 統一程式碼格式
- 撰寫有意義的 **commit 訊息**
- 新增功能必須包含 **測試**
- 所有函式必須有 **JSDoc 註解**

## 🔗 相關文件

- [API 層說明](src/api/explanation.md)
- [資料模型說明](src/models/explanation.md)
- [業務邏輯層說明](src/services/explanation.md)
- [配置說明](src/config/explanation.md)
- [工具函式說明](src/utils/explanation.md)
