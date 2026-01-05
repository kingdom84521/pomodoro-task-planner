# 部署指南

本文件說明如何將 Pomodoro Task Planner 部署到 Production 環境。

---

## 目錄

1. [前置需求](#前置需求)
2. [環境變數設定](#環境變數設定)
3. [建置 Docker Images](#建置-docker-images)
4. [啟動服務](#啟動服務)
5. [驗證部署](#驗證部署)
6. [常見問題](#常見問題)

---

## 前置需求

在開始之前，請確保已完成以下設定：

- [ ] Docker 已安裝 (版本 20.10+)
- [ ] Docker Compose 已安裝 (版本 2.0+)
- [ ] Docker Buildx 已安裝
- [ ] PostgreSQL 資料庫已準備好（參考 [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)）
- [ ] Zitadel 應用程式已設定（參考 [ZITADEL_SETUP.md](./ZITADEL_SETUP.md)）

---

## 環境變數設定

### Step 1：複製環境變數範本

```bash
cp .env.example .env
```

### Step 2：編輯 .env 檔案

```bash
nano .env  # 或使用你喜歡的編輯器
```

### Step 3：填入必要的值

| 變數 | 說明 | 範例 |
|------|------|------|
| `CORS_ORIGIN` | 前端網址 | `https://pomodoro.example.com` |
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://user:pass@host:5432/db` |
| `ZITADEL_DOMAIN` | Zitadel 網址 | `https://zitadel.example.com` |
| `ZITADEL_AUDIENCE` | Zitadel Project Resource ID | `123456789` |
| `VITE_API_BASE_URL` | 後端 API 網址 | `https://api.example.com/api` |
| `VITE_ZITADEL_CLIENT_ID` | Zitadel Client ID | `123456789@project` |
| `VITE_ZITADEL_REDIRECT_URI` | 登入後導向網址 | `https://pomodoro.example.com/auth/callback` |
| `VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI` | 登出後導向網址 | `https://pomodoro.example.com/` |

---

## 建置 Docker Images

### 方法一：使用 Docker Buildx Bake（推薦）

```bash
# 載入環境變數
source .env

# 建置所有 images
docker buildx bake \
  --set frontend.args.VITE_API_BASE_URL="$VITE_API_BASE_URL" \
  --set frontend.args.VITE_MOCK_AUTH="$VITE_MOCK_AUTH" \
  --set frontend.args.VITE_ZITADEL_DOMAIN="$VITE_ZITADEL_DOMAIN" \
  --set frontend.args.VITE_ZITADEL_CLIENT_ID="$VITE_ZITADEL_CLIENT_ID" \
  --set frontend.args.VITE_ZITADEL_REDIRECT_URI="$VITE_ZITADEL_REDIRECT_URI" \
  --set frontend.args.VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI="$VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI"
```

### 方法二：只建置單一 image

```bash
# 只建置前端
docker buildx bake frontend --set frontend.args.VITE_API_BASE_URL="$VITE_API_BASE_URL" ...

# 只建置後端
docker buildx bake backend
```

### 方法三：使用傳統 docker build

```bash
# 建置前端
docker build \
  -f packages/frontend/Dockerfile \
  --build-arg VITE_API_BASE_URL="$VITE_API_BASE_URL" \
  --build-arg VITE_MOCK_AUTH="false" \
  --build-arg VITE_ZITADEL_DOMAIN="$VITE_ZITADEL_DOMAIN" \
  --build-arg VITE_ZITADEL_CLIENT_ID="$VITE_ZITADEL_CLIENT_ID" \
  --build-arg VITE_ZITADEL_REDIRECT_URI="$VITE_ZITADEL_REDIRECT_URI" \
  --build-arg VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI="$VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI" \
  -t pomodoro-frontend:latest \
  .

# 建置後端
docker build \
  -f packages/backend/Dockerfile \
  -t pomodoro-backend:latest \
  .
```

---

## 啟動服務

### Step 1：啟動所有容器

```bash
docker compose up -d
```

### Step 2：查看容器狀態

```bash
docker compose ps
```

應該看到類似以下輸出：

```
NAME                 STATUS                   PORTS
pomodoro-backend     Up (healthy)             0.0.0.0:3001->3001/tcp
pomodoro-frontend    Up (healthy)             0.0.0.0:80->80/tcp
```

### Step 3：查看日誌

```bash
# 查看所有日誌
docker compose logs -f

# 只看後端日誌
docker compose logs -f backend

# 只看前端日誌
docker compose logs -f frontend
```

---

## 驗證部署

### 1. 檢查後端健康狀態

```bash
curl http://localhost:3001/api/health
```

預期回應：

```json
{"success":true,"data":{"status":"ok"}}
```

### 2. 檢查前端健康狀態

```bash
curl http://localhost/health
```

預期回應：

```
OK
```

### 3. 開啟瀏覽器測試

打開 `http://localhost`（或你設定的網址），應該會看到登入頁面。

---

## 常見問題

### Q1：容器啟動失敗，顯示 "unhealthy"

**可能原因：**
- 環境變數設定錯誤
- PostgreSQL 無法連線
- Zitadel 設定錯誤

**解決方法：**
```bash
# 查看詳細日誌
docker compose logs backend

# 檢查環境變數
docker compose exec backend env | grep -E "(DATABASE_URL|ZITADEL)"
```

### Q2：前端無法連接後端 API

**可能原因：**
- `CORS_ORIGIN` 設定錯誤
- `VITE_API_BASE_URL` 設定錯誤

**解決方法：**
1. 確認 `CORS_ORIGIN` 與前端網址完全一致（包含 protocol）
2. 確認 `VITE_API_BASE_URL` 指向正確的後端位址

### Q3：Zitadel 登入失敗

**可能原因：**
- Redirect URI 未在 Zitadel Console 中設定
- Client ID 錯誤

**解決方法：**
參考 [ZITADEL_SETUP.md](./ZITADEL_SETUP.md) 檢查設定。

---

## 停止服務

```bash
# 停止所有容器
docker compose down

# 停止並移除 volumes（小心：會刪除資料）
docker compose down -v
```

---

## 更新部署

```bash
# 1. 拉取最新程式碼
git pull

# 2. 重新建置 images
docker buildx bake --set frontend.args.VITE_API_BASE_URL="$VITE_API_BASE_URL" ...

# 3. 重新啟動容器
docker compose up -d
```
