# Pomodoro Task Planner

基於資源配比演算法的番茄鐘任務管理系統，支援 Notion 整合。

## 功能特性

- **番茄鐘計時器** - Vue3 + Element Plus 精美界面
- **智能優先權** - 基於資源配比的任務推薦演算法
- **Notion 整合** - Automation Webhook + iframe 嵌入
- **狀態持久化** - localStorage + 後端同步，重整頁面計時繼續
- **多時段統計** - 1D/3D/7D/15D/30D/90D/6M 資源使用分析
- **Mock 模式** - 無需 PostgreSQL 即可快速測試
- **會議管理** - 單次會議 + 週期性會議
- **例行任務** - 每日/每週重複任務管理

## 技術架構

| 層級 | 技術 |
|------|------|
| Frontend | Vue 3、Element Plus、Vite、Pinia、Vue Router |
| Backend | Express.js、PostgreSQL、JWT Auth |
| Integration | Notion API、Webhooks |
| Package Manager | Yarn 4 (workspaces) |

## 快速開始

### 1. 安裝依賴

```bash
yarn install
```

### 2. 設定環境變數

```bash
cp packages/backend/.env.example packages/backend/.env
```

編輯 `packages/backend/.env`：

```env
# Mock 模式（預設，無需資料庫）
MOCK_AUTH=true

# PostgreSQL 模式（可選）
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=pomodoro_planner
# DB_USER=postgres
# DB_PASSWORD=your_password

# Notion API（可選）
# NOTION_API_KEY=secret_xxx
# NOTION_DATABASE_ID=xxx
```

### 3. 啟動系統

```bash
yarn dev
```

- **前端**: http://localhost:3000
- **後端**: http://localhost:3001

### 4. 測試

開啟瀏覽器訪問 http://localhost:3000，使用任意測試用戶登入：

| 用戶 ID | 名稱 |
|---------|------|
| user-1 | Alice |
| user-2 | Bob |
| user-3 | Charlie |
| user-4 | Diana |
| user-5 | Eve |

## 專案結構

```
pomodoro-task-planner-web/
├── packages/
│   ├── frontend/          # Vue3 前端應用
│   │   ├── src/
│   │   │   ├── api/       # API 客戶端
│   │   │   ├── components/# Vue 組件
│   │   │   ├── views/     # 頁面組件
│   │   │   ├── stores/    # Pinia 狀態管理
│   │   │   └── router.js  # 路由設定
│   │   └── vite.config.js
│   │
│   └── backend/           # Express.js 後端
│       ├── routes/        # API 路由
│       ├── services/      # 業務邏輯
│       ├── middleware/    # 中介軟體
│       ├── database/      # 資料庫層
│       └── utils/         # 工具函式
│
├── package.json           # Workspace 設定
└── yarn.lock
```

## 開發指令

```bash
yarn dev              # 同時啟動前後端
yarn dev:backend      # 只啟動後端
yarn dev:frontend     # 只啟動前端
yarn build:frontend   # 建置前端
```

## API 端點

### 任務管理

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/tasks` | 取得任務列表（已排序） |
| POST | `/api/tasks` | 新增/更新任務 |
| POST | `/api/tasks/refresh-priorities` | 刷新優先權 |

### 番茄鐘

| Method | Endpoint | 說明 |
|--------|----------|------|
| POST | `/api/pomodoro/start` | 開始計時 |
| GET | `/api/pomodoro/status/:task_id` | 查詢狀態 |
| POST | `/api/pomodoro/pause` | 暫停 |
| POST | `/api/pomodoro/resume` | 繼續 |
| POST | `/api/pomodoro/complete` | 完成 |
| POST | `/api/pomodoro/cancel` | 取消 |

### 其他

| Method | Endpoint | 說明 |
|--------|----------|------|
| GET | `/api/work-records` | 工作紀錄 |
| GET/POST | `/api/meetings` | 會議管理 |
| GET/POST | `/api/routine-tasks` | 例行任務 |
| GET/POST | `/api/resource-groups` | 資源群組 |
| GET/POST | `/api/user-settings` | 用戶設定 |

## 優先權演算法

系統根據資源配比計算任務優先權，優先推薦「資源充裕」的分類任務。

### 計算邏輯

1. **長期權重優先** - 半年期資源剩餘權重最高 (×1000)
2. **多時段加權** - 考慮 1D/3D/7D/15D/30D/90D/6M 使用情況
3. **超標懲罰** - 半年超標時大幅降低優先權
4. **手動調整** - 高/中/低優先權額外加成

### 預設分類配額

| 分類 | 配額 |
|------|------|
| 工作 | 40% |
| 學習 | 30% |
| 運動 | 15% |
| 休閒 | 15% |

## Notion 整合

### 1. 建立 Integration

1. 前往 https://www.notion.so/my-integrations
2. 建立新 Integration，複製 Token
3. 設定 `NOTION_API_KEY` 環境變數

### 2. 設定資料庫屬性

| 屬性名稱 | 類型 | 說明 |
|----------|------|------|
| Priority Score | Number | API 自動更新 |
| Recommended Rank | Number | API 自動更新 |
| Pomodoro Timer | Formula | 計時器 URL |
| Page ID | Formula | `id()` |

**Pomodoro Timer 公式**：
```
"https://your-domain.com/timer?task_id=" + id()
```

### 3. 設定 Automation

**新增任務時**：
- Trigger: Page added to database
- Action: Webhook POST to `/api/tasks`

### 4. 嵌入計時器

在任務頁面使用 `/embed` 嵌入 Pomodoro Timer URL。

## 部署

### Backend

```bash
cd packages/backend
npm install --production

# 使用 PM2
pm2 start index.js --name pomodoro-backend
```

### Frontend

```bash
cd packages/frontend
yarn build
# 將 dist/ 部署到靜態伺服器
```

### Nginx 範例

```nginx
server {
    listen 443 ssl http2;
    server_name pomodoro.your.domain;

    root /var/www/pomodoro;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## PostgreSQL 模式

如需使用真實資料庫：

```bash
# 建立資料庫
psql -U postgres
CREATE DATABASE pomodoro_planner;
\q

# 執行 schema
psql -U postgres -d pomodoro_planner -f packages/backend/database/schema.sql

# 更新 .env
MOCK_AUTH=false
DB_HOST=localhost
DB_NAME=pomodoro_planner
DB_USER=postgres
DB_PASSWORD=your_password
```

## 授權

MIT License
