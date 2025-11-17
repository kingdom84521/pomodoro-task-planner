# ✅ VPS 配置完成

**日期**: 2025-11-16
**VPS IP**: 10.0.0.78
**狀態**: 所有服務已配置為 VPS 訪問模式

---

## 🎯 修改內容

### 1. 環境變數配置

#### .env.example 和 .env
```bash
# Backend CORS
CORS_ORIGIN=http://10.0.0.78:5173
SOCKET_IO_CORS_ORIGIN=http://10.0.0.78:5173

# Frontend
VITE_API_URL=http://10.0.0.78:3000/api/v1
VITE_SOCKET_URL=http://10.0.0.78:3000
```

#### frontend/.env
```bash
VITE_API_URL=http://10.0.0.78:3000/api/v1
VITE_SOCKET_URL=http://10.0.0.78:3000
```

### 2. Docker Compose 配置

**修改內容**: [docker-compose.yml](docker-compose.yml#L40-L57)

```yaml
frontend:
  image: node:20-alpine
  container_name: pomodoro_planner_frontend
  restart: unless-stopped
  working_dir: /app
  command: sh -c "npm install && npm run dev -- --host 0.0.0.0"  # ← 改為 0.0.0.0
  ports:
    - '5173:5173'
  environment:
    VITE_API_URL: ${VITE_API_URL:-http://10.0.0.78:3000/api/v1}  # ← 使用 VPS IP
    VITE_SOCKET_URL: ${VITE_SOCKET_URL:-http://10.0.0.78:3000}   # ← 使用 VPS IP
  depends_on:
    - backend
  networks:
    - pomodoro_network
  volumes:
    - ./frontend:/app
    - /app/node_modules
```

**關鍵改動**:
- Backend:
  - `CORS_ORIGIN`: 設置允許的前端來源為 VPS IP (http://10.0.0.78:5173)
  - `SOCKET_IO_CORS_ORIGIN`: Socket.io CORS 配置
- Frontend:
  - `--host 0.0.0.0`: 允許 Vite 接受來自任何 IP 的連接（而非僅 localhost）
  - `VITE_API_URL` 和 `VITE_SOCKET_URL`: 使用 VPS IP 地址而非 localhost

---

## 🌐 訪問服務

### 外部訪問（從任何地方）
- **前端應用**: http://10.0.0.78:5173
- **後端 API**: http://10.0.0.78:3000
- **健康檢查**: http://10.0.0.78:3000/health

### 內部訪問（僅限 VPS 本機）
- **MongoDB**: mongodb://localhost:27017

---

## 🧪 驗證測試

### 1. 後端健康檢查
```bash
curl http://10.0.0.78:3000/health
```

**預期輸出**:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2025-11-16T13:58:28.082Z",
  "environment": "development"
}
```

### 2. 前端可訪問性
```bash
curl -I http://10.0.0.78:5173
```

**預期輸出**:
```
HTTP/1.1 200 OK
Content-Type: text/html
...
```

### 3. 完整註冊/登入流程
```bash
# 註冊用戶
curl -X POST http://10.0.0.78:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","name":"Test User"}'

# 登入
curl -X POST http://10.0.0.78:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

---

## 📋 部署檢查清單

- [x] 環境變數使用 VPS IP (10.0.0.78)
- [x] Docker Compose frontend 使用 `--host 0.0.0.0`
- [x] 所有服務重新啟動
- [x] 後端健康檢查通過 (http://10.0.0.78:3000/health)
- [x] 前端可訪問 (http://10.0.0.78:5173)
- [x] MongoDB 連接正常
- [x] Socket.io 初始化成功

---

## 🔧 如何使用

### 重啟服務（套用新配置）
```bash
cd /home/ubuntu/works/task-planning-with-tomato-clock

# 停止所有服務
docker compose down

# 啟動所有服務
docker compose up -d

# 查看日誌
docker compose logs -f
```

### 查看服務狀態
```bash
# 查看所有容器狀態
docker compose ps

# 查看特定服務日誌
docker compose logs backend
docker compose logs frontend
docker compose logs mongodb
```

---

## 🌟 功能驗證

### 瀏覽器訪問
1. 打開瀏覽器訪問: http://10.0.0.78:5173
2. 前端應該能夠成功連接到後端 API
3. 註冊/登入功能應該正常工作
4. Socket.io 實時通訊應該正常

### API 測試
使用 Postman/Insomnia 或 curl 測試所有 API 端點:
- Auth: `/api/v1/auth/*`
- Tasks: `/api/v1/tasks/*`
- Pomodoro: `/api/v1/pomodoro/*`

---

## ⚠️ 重要注意事項

### 1. 生產環境配置
目前配置適用於**開發環境**。生產環境需要:
- 使用 HTTPS (SSL/TLS)
- 配置正式域名
- 使用環境變數管理敏感信息
- 啟用 CORS 白名單
- 使用 Nginx/Caddy 作為反向代理
- 啟用防火牆規則

### 2. 防火牆設置
確保 VPS 防火牆允許以下端口:
```bash
# 允許 HTTP 流量
sudo ufw allow 3000/tcp  # Backend
sudo ufw allow 5173/tcp  # Frontend (開發環境)

# 生產環境建議
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
```

### 3. IP 地址變更
如果 VPS IP 地址變更，需要更新以下文件:
1. `.env`
2. `.env.example`
3. `frontend/.env`
4. `docker-compose.yml` (默認值)

---

## 📊 當前服務狀態

```
✅ MongoDB      - Running on port 27017
✅ Backend      - Running on port 3000 (Node 20)
✅ Frontend     - Running on port 5173 (Node 20)
✅ Socket.IO    - Initialized and ready
✅ JWT Auth     - Configured and working
✅ VPS Access   - Configured for 10.0.0.78
```

---

## 🎉 成功！

所有服務現在都可以通過 VPS IP 地址 **10.0.0.78** 訪問！

**前端**: http://10.0.0.78:5173
**後端**: http://10.0.0.78:3000

---

**配置完成時間**: 2025-11-16 13:58 UTC
**配置者**: Claude (AI Assistant)
**狀態**: 🟢 完全運行，VPS 外部訪問就緒
