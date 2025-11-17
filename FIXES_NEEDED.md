# TypeScript 編譯錯誤修正指南

## 🔴 需要立即修正的錯誤

### 1. 缺少 luxon 依賴
**檔案**: `backend/src/utils/dateUtils.ts`
**錯誤**: `Cannot find module 'luxon'`

**修正方法**:
```bash
cd backend
npm install luxon
npm install --save-dev @types/luxon
```

或者移除 luxon 的 import，改用原生 Date API。

---

### 2. JWT Service 類型錯誤
**檔案**: `backend/src/services/auth/jwtService.ts`
**錯誤**: `No overload matches this call` (lines 24, 34)

**問題**: `expiresIn` 選項的類型不匹配

**修正方法**:
檢查 `jwt.sign()` 的調用，確保 options 物件的類型正確：

```typescript
// 錯誤的寫法
jwt.sign(payload, secret, { expiresIn: '7d' });

// 正確的寫法
jwt.sign(payload, secret, { expiresIn: '7d' } as SignOptions);
```

---

### 3. Pomodoro Socket 類型錯誤
**檔案**: `backend/src/sockets/pomodoroSocket.ts:155`
**錯誤**: `'session._id' is of type 'unknown'`

**修正方法**:
添加類型斷言或類型檢查：

```typescript
// 方法 1: 類型斷言
const sessionId = (session._id as mongoose.Types.ObjectId).toString();

// 方法 2: 類型檢查
if (session._id) {
  const sessionId = session._id.toString();
}
```

---

## 🟡 Dockerfile 修正（已完成）

- ✅ 已將 `npm ci` 改為 `npm install`
- ✅ 已將 `--only=production` 改為 `--omit=dev`

---

## 🟢 建議的快速修正步驟

1. **最快方法**: 移除 luxon 依賴，使用原生 Date
   ```bash
   # 編輯 backend/src/utils/dateUtils.ts
   # 移除 import luxon 的行
   # 改用原生 Date 方法
   ```

2. **修正 JWT 類型**:
   ```bash
   cd backend/src/services/auth
   # 檢查 jwtService.ts 的 jwt.sign() 調用
   # 添加適當的類型斷言
   ```

3. **修正 Socket 類型**:
   ```bash
   cd backend/src/sockets
   # 檢查 pomodoroSocket.ts:155
   # 添加類型斷言或檢查
   ```

---

## 📝 臨時解決方案：跳過 build

如果需要快速啟動服務進行測試，可以修改 Dockerfile 使用開發模式：

**backend/Dockerfile** (開發模式):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=development

# Start in dev mode (no build needed)
CMD ["npm", "run", "dev"]
```

這樣可以跳過 TypeScript 編譯步驟，直接用 tsx 運行。

---

## ✅ 完成後的驗證步驟

1. 重新構建: `docker compose build`
2. 啟動服務: `docker compose up -d`
3. 檢查日誌: `docker compose logs -f`
4. 測試 API: `curl http://localhost:3000/api/v1/health`

---

**最後更新**: 2025-11-16 13:28
