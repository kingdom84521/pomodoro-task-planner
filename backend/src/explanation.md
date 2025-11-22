# Backend Source Code 原始碼說明

本目錄包含後端應用程式的所有原始碼。

## 📄 核心檔案

### `server.ts`
**伺服器入口檔案**

這是整個後端應用程式的啟動檔案，負責：

1. **載入環境變數**: 從 `.env` 檔案載入配置
2. **初始化 Express 應用**: 建立 Express 實例
3. **連接資料庫**: 建立 MongoDB 連線
4. **註冊全域中介層**:
   - `cors()`: 處理跨域請求
   - `express.json()`: 解析 JSON 請求體
   - `morgan()`: HTTP 請求日誌記錄
5. **註冊路由**:
   - `/api/auth`: 認證相關路由
   - `/api/tasks`: 任務管理路由
   - `/api/pomodoro`: 番茄鐘路由
   - `/api/analytics`: 數據分析路由
6. **註冊錯誤處理中介層**: 統一處理所有錯誤
7. **啟動 HTTP 伺服器**: 監聽指定端口

**程式流程**:
```typescript
載入環境變數
    ↓
連接 MongoDB
    ↓
建立 Express App
    ↓
註冊中介層與路由
    ↓
啟動 HTTP 伺服器
    ↓
監聽請求
```

## 📂 子目錄說明

### `api/` - API 層
處理 HTTP 請求與回應的邏輯層。

**包含內容**:
- `controllers/`: 控制器，處理請求邏輯
- `routes/`: 路由定義，映射 URL 到控制器
- `middleware/`: 中介層（認證、驗證、錯誤處理）

**職責**:
- 接收 HTTP 請求
- 驗證請求參數
- 呼叫 Service 層處理業務邏輯
- 回傳 HTTP 回應

📖 詳細說明: [api/explanation.md](api/explanation.md)

---

### `models/` - 資料模型層
定義 MongoDB 資料庫的資料結構（Schema）和模型（Model）。

**包含內容**:
- `User.ts`: 使用者資料模型
- `Task.ts`: 任務資料模型
- `PomodoroSession.ts`: 番茄鐘會話資料模型
- `Interruption.ts`: 中斷記錄資料模型

**職責**:
- 定義資料結構（欄位、型別、驗證規則）
- 定義資料庫索引
- 提供資料庫 CRUD 操作介面
- 定義資料模型方法（實例方法、靜態方法）

📖 詳細說明: [models/explanation.md](models/explanation.md)

---

### `services/` - 業務邏輯層
實作核心業務邏輯，這是應用程式的「大腦」。

**包含內容**:
- `auth/`: 認證服務
- `tasks/`: 任務管理服務
- `pomodoro/`: 番茄鐘服務
- `analytics/`: 數據分析服務

**職責**:
- 實作業務規則與邏輯
- 與資料庫互動（透過 Model 層）
- 處理複雜的資料運算
- 協調多個資料模型的操作

**設計原則**:
- **純函式設計**: Service 函式應為純函式，易於測試
- **無狀態**: 不依賴全域狀態
- **單一職責**: 每個 Service 只負責一個業務領域

📖 詳細說明: [services/explanation.md](services/explanation.md)

---

### `config/` - 配置層
存放應用程式的配置檔案。

**包含內容**:
- `database.ts`: MongoDB 連線配置
- `env.ts`: 環境變數配置
- `constants.ts`: 常數定義

**職責**:
- 集中管理配置資訊
- 提供配置的型別定義
- 驗證配置的有效性

📖 詳細說明: [config/explanation.md](config/explanation.md)

---

### `utils/` - 工具函式層
提供可重用的工具函式。

**包含內容**:
- `jwtUtils.ts`: JWT Token 生成與驗證
- `passwordUtils.ts`: 密碼加密與驗證
- `validationUtils.ts`: 輸入驗證工具
- `dateUtils.ts`: 日期時間處理工具
- `errorUtils.ts`: 錯誤處理工具

**職責**:
- 提供通用的輔助函式
- 封裝第三方函式庫
- 提高程式碼重用性

**設計原則**:
- **純函式**: 無副作用，相同輸入產生相同輸出
- **單一功能**: 每個函式只做一件事
- **易於測試**: 獨立測試每個工具函式

📖 詳細說明: [utils/explanation.md](utils/explanation.md)

---

## 🏗️ 架構模式

本後端採用 **分層架構（Layered Architecture）** 設計：

```
┌─────────────────────────────────────┐
│         API 層 (Presentation)       │
│  ┌─────────┐  ┌──────┐  ┌────────┐ │
│  │ Routes  │→│ Ctrl │→│ Middleware│ │
│  └─────────┘  └──────┘  └────────┘ │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      業務邏輯層 (Business Logic)     │
│  ┌──────────┐  ┌──────────────┐    │
│  │ Services │  │ Domain Logic │    │
│  └──────────┘  └──────────────┘    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│     資料訪問層 (Data Access)         │
│  ┌────────┐  ┌─────────────────┐   │
│  │ Models │  │ DB Operations   │   │
│  └────────┘  └─────────────────┘   │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│          資料庫 (MongoDB)            │
└─────────────────────────────────────┘
```

### 各層職責

**API 層** (Controllers + Routes + Middleware)
- ✅ 處理 HTTP 請求/回應
- ✅ 驗證輸入格式
- ✅ 認證與授權
- ❌ 不包含業務邏輯
- ❌ 不直接操作資料庫

**業務邏輯層** (Services)
- ✅ 實作業務規則
- ✅ 協調多個資料模型
- ✅ 處理複雜運算
- ❌ 不處理 HTTP
- ❌ 不包含資料庫細節

**資料訪問層** (Models)
- ✅ 定義資料結構
- ✅ 封裝資料庫操作
- ✅ 資料驗證
- ❌ 不包含業務邏輯
- ❌ 不處理 HTTP

## 📊 資料流範例

### 範例：建立新任務

```typescript
// 1. 客戶端發送請求
POST /api/tasks
Headers: { Authorization: "Bearer <token>" }
Body: { name: "寫文件", estimatedPomodoros: 3 }

// 2. API 層處理
→ routes/tasks.ts: 路由到 taskController.createTask
→ middleware/auth.ts: 驗證 JWT Token，取得 userId
→ middleware/validate.ts: 驗證請求參數

// 3. Controller 呼叫 Service
→ controllers/taskController.ts
    const task = await taskService.createTask(userId, taskData);

// 4. Service 執行業務邏輯
→ services/tasks/taskService.ts
    // 檢查使用者是否存在
    // 驗證任務資料
    // 建立任務
    const task = await Task.create({ userId, ...taskData });

// 5. Model 存入資料庫
→ models/Task.ts
    // Mongoose 將資料存入 MongoDB

// 6. 回傳結果
← Service 回傳任務物件
← Controller 包裝成 HTTP 回應
← 客戶端收到 201 Created 與任務資料
```

## 🔐 認證流程

### JWT Token 機制

```typescript
// 登入時生成 Token
User Login → Verify Password → Generate JWT Token → Return Token

// 後續請求攜帶 Token
Request → Extract Token → Verify Token → Extract User ID → Proceed
```

**Token 結構**:
```json
{
  "userId": "64abc123...",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## 🛡️ 錯誤處理策略

### 錯誤類型

1. **驗證錯誤** (400 Bad Request)
   - 輸入格式錯誤
   - 必填欄位缺失
   - 資料型別不符

2. **認證錯誤** (401 Unauthorized)
   - Token 無效或過期
   - 未提供 Token

3. **授權錯誤** (403 Forbidden)
   - 無權限存取資源

4. **資源不存在** (404 Not Found)
   - 請求的資源不存在

5. **伺服器錯誤** (500 Internal Server Error)
   - 資料庫連線失敗
   - 未預期的錯誤

### 錯誤處理流程

```typescript
try {
  // 業務邏輯
} catch (error) {
  // 統一錯誤處理中介層
  errorHandler(error, req, res, next)
}

// 回傳標準化錯誤格式
{
  "success": false,
  "message": "錯誤訊息",
  "errors": [...], // 詳細錯誤列表（選用）
  "stack": "..." // 開發環境才回傳
}
```

## 🧪 測試覆蓋

- **單元測試**: Service 層函式
- **整合測試**: API 端點
- **合約測試**: API 回應格式

## 🔗 相關文件

- [API 層詳細說明](api/explanation.md)
- [資料模型詳細說明](models/explanation.md)
- [業務邏輯詳細說明](services/explanation.md)
- [配置詳細說明](config/explanation.md)
- [工具函式詳細說明](utils/explanation.md)
