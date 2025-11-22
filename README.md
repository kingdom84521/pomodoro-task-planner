# 🍅 番茄鐘任務規劃系統

> 基於番茄工作法的智能任務管理與時間追蹤應用程式

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Yarn](https://img.shields.io/badge/Yarn-4.11.0-2c8ebb.svg)](https://yarnpkg.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 📖 專案簡介

番茄鐘任務規劃系統是一個全端 Web 應用程式，結合番茄工作法（Pomodoro Technique）與時間區塊規劃（Time Blocking），幫助使用者更有效地管理任務、追蹤時間，並透過數據分析優化工作效率。

### ✨ 核心功能

- 🎯 **智能任務管理** - 完整的任務 CRUD 操作，支援任務估算與實際番茄鐘數追蹤
- ⏱️ **番茄鐘計時器** - 自動計時、暫停/恢復、中斷記錄功能
- 📊 **數據分析儀表板** - 完成率、準確率、時間分布等多維度分析
- 🔔 **智能休息提醒** - 根據完成的番茄鐘數自動建議短休息或長休息
- 📈 **視覺化圖表** - 使用 Chart.js 呈現任務完成趨勢與生產力指標
- 🔧 **自訂欄位** - 支援 7 種預設欄位與自訂欄位建立（文字、數字、選項、布林值、日期）
- 👥 **群組協作**（即將推出）- 團隊任務分配與共享分析（User Story 5）
- 🌐 **響應式設計** - 支援桌面與行動裝置

## 🛠️ 技術棧

### 前端
- **框架**: Vue 3 (Composition API + `<script setup>`)
- **狀態管理**: Pinia
- **路由**: Vue Router
- **樣式**: Tailwind CSS
- **圖表**: Chart.js + vue-chartjs
- **HTTP 客戶端**: Axios
- **語言**: TypeScript

### 後端
- **執行環境**: Node.js 18+
- **框架**: Express.js
- **資料庫**: MongoDB + Mongoose
- **驗證**: JWT (JSON Web Tokens)
- **驗證中介層**: express-validator
- **語言**: TypeScript

### 開發工具
- **套件管理器**: Yarn 4.11.0 (Berry PnP 模式)
- **程式碼品質**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **部署**: Docker + Docker Compose

## 📦 安裝與設定

### 系統需求

- Node.js >= 18.0.0
- Yarn >= 4.0.0
- MongoDB >= 5.0
- Docker & Docker Compose（選用）

### 快速開始

#### 1. 複製專案

```bash
git clone <repository-url>
cd task-planning-with-tomato-clock
```

#### 2. 安裝相依套件

本專案使用 **Yarn 4 PnP 模式**，請確保已安裝 Yarn 4：

```bash
# 啟用 Corepack（Node.js 16.10+ 內建）
corepack enable

# 安裝所有相依套件（root + backend + frontend）
yarn install
```

#### 3. 環境變數設定

建立環境變數檔案：

```bash
# 後端環境變數
cp backend/.env.example backend/.env

# 前端環境變數
cp frontend/.env.example frontend/.env
```

編輯 `backend/.env`：

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/pomodoro-planner
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

編輯 `frontend/.env`：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

#### 4. 啟動 MongoDB

使用 Docker：

```bash
docker-compose up -d mongodb
```

或在本機啟動 MongoDB 服務。

#### 5. 執行開發伺服器

```bash
# 同時啟動前端和後端（推薦）
yarn dev

# 或分別啟動
yarn dev:backend  # 後端：http://localhost:3000
yarn dev:frontend # 前端：http://localhost:5173
```

#### 6. 開啟瀏覽器

訪問 [http://localhost:5173](http://localhost:5173)

## 🚀 使用 Docker 部署

### 建置與啟動所有服務

```bash
# 建置映像檔
yarn docker:build

# 啟動容器
yarn docker:up

# 停止容器
yarn docker:down
```

服務將在以下端口啟動：
- 前端：http://localhost:8080
- 後端：http://localhost:3000
- MongoDB：localhost:27017

## 📂 專案結構

```
task-planning-with-tomato-clock/
├── backend/                    # 後端服務
│   ├── src/
│   │   ├── api/               # API 路由與控制器
│   │   │   ├── controllers/   # 請求處理邏輯
│   │   │   ├── routes/        # 路由定義
│   │   │   └── middleware/    # 中介層（驗證、錯誤處理）
│   │   ├── models/            # Mongoose 資料模型
│   │   ├── services/          # 業務邏輯層
│   │   │   ├── analytics/     # 分析服務
│   │   │   ├── pomodoro/      # 番茄鐘服務
│   │   │   └── tasks/         # 任務服務
│   │   ├── config/            # 配置檔案
│   │   └── utils/             # 工具函式
│   ├── tests/                 # 測試檔案
│   └── package.json
│
├── frontend/                   # 前端應用
│   ├── src/
│   │   ├── components/        # Vue 元件
│   │   │   ├── analytics/     # 分析圖表元件
│   │   │   ├── auth/          # 認證表單元件
│   │   │   ├── common/        # 共用元件
│   │   │   ├── pomodoro/      # 番茄鐘元件
│   │   │   └── tasks/         # 任務管理元件
│   │   ├── composables/       # Vue Composition API 可組合函式
│   │   ├── pages/             # 頁面元件
│   │   ├── router/            # 路由配置
│   │   ├── services/          # API 客戶端
│   │   ├── stores/            # Pinia 狀態管理
│   │   └── types/             # TypeScript 型別定義
│   └── package.json
│
├── specs/                      # 需求規格與計畫文件
│   └── 001-pomodoro-task-planner/
│       ├── spec.md            # 功能規格
│       ├── plan.md            # 實作計畫
│       └── tasks.md           # 任務清單
│
├── docker-compose.yml         # Docker Compose 配置
├── .gitignore
├── package.json               # Root workspace 配置
└── README.md                  # 本檔案
```

## 🎯 可用指令

### 開發

```bash
yarn dev              # 同時啟動前後端開發伺服器
yarn dev:backend      # 僅啟動後端
yarn dev:frontend     # 僅啟動前端
```

### 建置

```bash
yarn build            # 建置前後端
yarn build:backend    # 建置後端
yarn build:frontend   # 建置前端
```

### 測試

```bash
yarn test             # 執行所有測試
yarn test:backend     # 後端測試
yarn test:frontend    # 前端測試
```

### 程式碼品質

```bash
yarn lint             # 檢查所有程式碼
yarn lint:backend     # 檢查後端
yarn lint:frontend    # 檢查前端
yarn format           # 格式化所有檔案
```

### Docker

```bash
yarn docker:build     # 建置 Docker 映像檔
yarn docker:up        # 啟動 Docker 容器
yarn docker:down      # 停止 Docker 容器
```

## 📱 主要功能頁面

### 1. 任務管理（Tasks）
- 建立、編輯、刪除任務
- 設定預估番茄鐘數
- 任務狀態管理（待處理、進行中、已完成）
- 到期日與分類標籤

### 2. 執行模式（Apply Mode）
- 選擇任務後自動開始番茄鐘
- 即時計時器顯示（剩餘時間與進度）
- 暫停/恢復功能
- 完成後自動建議休息時間
- 休息計時器（短休息 5 分鐘 / 長休息 15 分鐘）

### 3. 數據分析（Analytics）
- **時間範圍選擇**: 最近 7/30/90 天或自訂區間
- **摘要指標卡片**:
  - 總任務數
  - 已完成任務數
  - 總番茄鐘數
  - 專注時間
  - 完成率
  - 準確率
- **視覺化圖表**:
  - 完成率圓餅圖
  - 番茄鐘估算準確度長條圖
  - 時間分布折線圖

### 4. 自訂欄位（Custom Fields）
- **7 種預設欄位**:
  - ⚡ 優先級（低、中、高、緊急）
  - 🏷️ 標籤
  - 👤 客戶
  - 💰 預算
  - 📊 狀態標籤
  - ⏰ 到期時間
  - 📝 備註
- **自訂欄位建立**:
  - 支援文字、數字、選項、布林值、日期等 5 種資料類型
  - 可設定必填/選填
  - 選項欄位可自訂下拉選單內容

### 5. 群組協作（Groups）- 預覽版
- 建立與加入群組
- 邀請碼系統
- 群組統計資訊（成員數、任務數、番茄鐘數）
- 群組管理（擁有者/成員權限）

## 🔐 API 端點

### 認證
- `POST /api/auth/register` - 使用者註冊
- `POST /api/auth/login` - 使用者登入
- `GET /api/auth/me` - 取得當前使用者資訊

### 任務
- `GET /api/tasks` - 取得任務列表
- `POST /api/tasks` - 建立新任務
- `GET /api/tasks/:id` - 取得單一任務
- `PUT /api/tasks/:id` - 更新任務
- `DELETE /api/tasks/:id` - 刪除任務

### 番茄鐘
- `POST /api/pomodoro/start` - 開始番茄鐘
- `POST /api/pomodoro/complete` - 完成番茄鐘
- `POST /api/pomodoro/pause` - 暫停番茄鐘
- `GET /api/pomodoro/active` - 取得當前進行中的番茄鐘
- `GET /api/pomodoro/sessions` - 取得番茄鐘歷史記錄
- `GET /api/pomodoro/suggested-break` - 取得建議休息時間

### 分析
- `GET /api/analytics` - 取得分析數據
- `GET /api/analytics/summary` - 取得摘要統計

## 🧪 測試

本專案採用 TDD（測試驅動開發）方法：

### 後端測試
- 單元測試：使用 Jest
- 整合測試：測試 API 端點與資料庫互動
- 合約測試：驗證 API 回應格式

### 前端測試
- 元件測試：使用 Vitest + Vue Test Utils
- E2E 測試：使用 Playwright（即將推出）

## 🗺️ 開發路線圖

### ✅ 已完成（Phase 1 - MVP）
- [x] 使用者認證系統（註冊/登入/JWT）
- [x] 任務 CRUD 操作
- [x] 番茄鐘計時器核心功能
- [x] 中斷記錄（暫停/恢復）
- [x] 休息計時器（短休息/長休息）
- [x] 數據分析儀表板
- [x] 三種視覺化圖表
- [x] 自訂欄位管理介面

### 🚧 進行中（Phase 2）
- [ ] 自訂欄位後端 API（User Story 8）
- [ ] 群組協作功能（User Story 5）
  - [ ] 群組 CRUD 操作
  - [ ] 成員管理
  - [ ] 任務分配
  - [ ] 群組層級自訂欄位
- [ ] 通知系統優化

### 📋 規劃中（Phase 3）
- [ ] 資料匯出功能（CSV/JSON）
- [ ] 預測性分析（機器學習）
- [ ] 行動應用程式（React Native）
- [ ] 第三方整合（Google Calendar、Notion）

## 🔧 進階配置

### Yarn PnP 模式

本專案使用 Yarn 4 的 Plug'n'Play 模式以提升安裝速度與磁碟效率：

```yaml
# .yarnrc.yml
enableGlobalCache: false
nodeLinker: pnp
```

### VSCode 整合

專案已配置 VSCode SDK 支援：

```bash
yarn dlx @yarnpkg/sdks vscode
```

### Git Hooks

使用 Husky 自動執行程式碼檢查：
- Pre-commit: 執行 lint-staged（ESLint + Prettier）
- Pre-push: 執行測試（可選）

## 🤝 貢獻指南

歡迎貢獻！請遵循以下步驟：

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 程式碼規範

- 使用 TypeScript 嚴格模式
- 遵循 ESLint 規則
- 撰寫有意義的 commit 訊息
- 新增功能必須包含測試
- 保持程式碼覆蓋率 > 80%

## 📄 授權

本專案採用 MIT 授權 - 詳見 [LICENSE](LICENSE) 檔案

## 👨‍💻 作者

開發團隊

## 🙏 致謝

- [Vue.js](https://vuejs.org/) - 漸進式 JavaScript 框架
- [Express.js](https://expressjs.com/) - 快速、極簡的 Node.js Web 框架
- [MongoDB](https://www.mongodb.com/) - 文件導向資料庫
- [Chart.js](https://www.chartjs.org/) - 簡單而靈活的 JavaScript 圖表庫
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS 框架

## 📞 聯絡方式

如有問題或建議，歡迎開啟 [Issue](https://github.com/your-repo/issues)

---

⭐ 如果這個專案對你有幫助，請給我們一個星星！

**番茄工作法** 是 Francesco Cirillo 於 1980 年代末開發的時間管理方法。
