# Pomodoro Task Planner

基於資源配比演算法的番茄鐘任務管理系統。

## 功能特性

- **番茄鐘計時器** - 支援暫停/繼續，狀態持久化
- **智能優先權** - 基於資源配比的任務推薦演算法
- **數據分析** - Sliding Window 圖表、資源使用率統計
- **會議管理** - 單次會議 + 週期性會議，會議中自動計時
- **例行任務** - 每日/每週重複任務管理
- **多用戶** - Zitadel OIDC 認證（開發環境支援 Mock 用戶）

## 技術架構

| 層級 | 技術 |
|------|------|
| Frontend | Vue 3、Element Plus、Vite、Pinia、Chart.js |
| Backend | Express.js、Drizzle ORM、node-cron |
| Database | SQLite（開發）、PostgreSQL（生產） |
| Auth | Zitadel OIDC |
| Package Manager | Yarn 4 (PnP) |

## 快速開始（開發環境）

### 1. 安裝依賴

```bash
yarn install
```

### 2. 啟動系統

```bash
yarn dev
```

就這樣！預設使用 SQLite + Mock Auth，不需要額外設定。

- **前端**: http://localhost:3000
- **後端**: http://localhost:3001

## 專案結構

```
pomodoro-task-planner-web/
├── packages/
│   ├── frontend/           # Vue 3 前端
│   │   ├── src/
│   │   │   ├── api/        # API 客戶端
│   │   │   ├── components/ # Vue 組件
│   │   │   ├── views/      # 頁面
│   │   │   ├── stores/     # Pinia 狀態
│   │   │   └── router.js
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   │
│   └── backend/            # Express.js 後端
│       ├── routes/         # API 路由
│       ├── services/       # 業務邏輯
│       ├── database/       # Drizzle ORM
│       ├── middleware/     # JWT Auth
│       ├── Dockerfile
│       └── docker-entrypoint.sh
│
├── docs/                   # 部署文件
├── docker-compose.yml
├── docker-bake.hcl
└── .env.example
```

## 開發指令

```bash
yarn dev              # 同時啟動前後端
yarn dev:backend      # 只啟動後端
yarn dev:frontend     # 只啟動前端
yarn build:frontend   # 建置前端
```

## 生產環境部署

使用 Docker Compose 部署，詳細步驟請參考：

- **[部署指南](docs/DEPLOYMENT.md)** - 完整部署流程
- **[Zitadel 設定](docs/ZITADEL_SETUP.md)** - OIDC 認證設定
- **[PostgreSQL 設定](docs/POSTGRESQL_SETUP.md)** - 資料庫設定

### 快速預覽

```bash
# 1. 設定環境變數
cp .env.example .env
# 編輯 .env 填入 Zitadel、PostgreSQL 設定

# 2. 建置 Docker images
docker buildx bake

# 3. 啟動服務
docker compose up -d
```

## 優先權演算法

系統根據資源配比計算任務優先權，優先推薦「資源充裕」的分類任務。

### 計算邏輯

1. **長期權重優先** - 半年期資源剩餘權重最高
2. **多時段加權** - 考慮 7D/30D/季度/半年 使用情況
3. **超標懲罰** - 超過配額時降低優先權
4. **手動調整** - 高/中/低優先權額外加成

## 授權

MIT License
