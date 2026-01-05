# Claude 開發備忘錄

## 待實現功能

### Android Service Worker 持久性通知
**優先級**: 未來功能
**狀態**: 待實現

**需求描述**:
- 在 Android 平台上實現即使關閉瀏覽器標籤頁，番茄鐘完成時仍能收到通知的功能
- iOS 平台暫不考慮（支援度不足）

**技術方案**:
1. Service Worker 註冊與生命週期管理
2. Push API 訂閱（需要 VAPID keys）
3. 後端推送服務整合（選項：Firebase Cloud Messaging, OneSignal, 或自建）
4. 番茄鐘計時器與推送排程整合
5. 通知權限與用戶體驗優化

**自建後端推送服務架構** (使用 BullMQ + Redis):
```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (瀏覽器)                                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ 開始計時    │ -> │ 註冊 SW     │ -> │ 訂閱 Push   │     │
│  │ 發送到後端  │    │ 取得權限    │    │ 取得 token  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend (Node.js)                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ API Server  │ -> │ BullMQ      │ -> │ Redis       │     │
│  │ 接收請求    │    │ 延遲任務    │    │ 任務儲存    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                              │                              │
│                              ▼ (25分鐘後)                   │
│                     ┌─────────────┐                         │
│                     │ Worker      │                         │
│                     │ 處理任務    │                         │
│                     └─────────────┘                         │
│                              │                              │
│                              ▼                              │
│                     ┌─────────────┐                         │
│                     │ web-push    │                         │
│                     │ 發送通知    │                         │
│                     └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Service Worker (背景)                                      │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │ 收到 Push   │ -> │ 顯示通知   │                        │
│  │ 事件        │    │ 給用戶     │                        │
│  └─────────────┘    └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

**為什麼需要後端排程？**
- Service Worker 無法自己執行定時器（瀏覽器關閉後 SW 會休眠）
- 只有後端主動「推」過來，SW 才會被喚醒
- BullMQ 提供延遲任務功能（類似 message queue 的延遲消費）

**所需套件**:
- `bullmq`: Node.js 延遲任務佇列
- `ioredis`: Redis 客戶端（BullMQ 依賴）
- `web-push`: 發送 Web Push 通知

**平台支援**:
- ✅ Android Chrome: 完整支援
- ⚠️ iOS Safari: 需要 iOS 16.4+，且必須將網頁加到主畫面

**相關資源**:
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [BullMQ 文件](https://docs.bullmq.io/)
- [web-push npm](https://www.npmjs.com/package/web-push)

---

### Drizzle PostgreSQL Schema 重構
**優先級**: 技術債
**狀態**: 待實現

**現況問題**:
- `database/schema.js` 使用 `sqliteTable`（SQLite 專用語法）
- PostgreSQL 建表目前用 raw SQL（在 `drizzle.js` 的 `createPostgresTables()`）
- 這不是正確的 Drizzle 使用方式

**正確做法**:
1. 新增 `database/schema.postgres.js`，使用 `pgTable` 定義 schema
2. 修改 `drizzle.js` 根據 `DB_MODE` 動態載入對應的 schema
3. 更新 `drizzle.config.js` 支援 PostgreSQL dialect
4. 使用 `drizzle-kit push` 或 `drizzle-kit migrate` 來同步 schema

**相關檔案**:
- `packages/backend/database/schema.js` - 現有 SQLite schema
- `packages/backend/database/drizzle.js` - 資料庫連線與建表邏輯
- `packages/backend/drizzle.config.js` - Drizzle Kit 設定

---

## 已完成功能

### 2025-12-27
- ✅ 創建通用 DataTable 組件
- ✅ WorkHistory 頁面（70:30 布局，左側工作記錄表格，右側番茄鐘）
- ✅ 任務列表點擊計時器圖標跳轉到工作紀錄頁面

### 2025-12-25
- ✅ 建立 Settings 頁面架構（左側 20% 選單，右側 80% 內容）
- ✅ 創建任務列表表格組件（TaskTable）
- ✅ 實現可編輯單元格（EditableCell）支援 text 和 select 類型
- ✅ Double-click 進入編輯模式
- ✅ Mock 認證系統（5 個測試用戶）

# 用詞解釋

> 注意，這個區塊充其量只是代表某個詞有更多的意涵在，如果你確認過前後文發現原本的意義比較合理，就不要參考這裡的解釋。

* 寫小說
  * thinking 的輸出過多實作細節，導致最後要做的東西跟使用者預期的方向大相徑庭。當出現這個情形的時候，需要在要改程式碼之前跟使用者確認這樣修正是否正確，禁止直接改程式碼的行為。
* 自幹
  * 透過基礎的 html, css, js 來達成我的需求。

---

## 判斷基準：什麼時候要問、什麼時候可以直接做

### 可以直接做的情況

1. **使用者給了明確範例或 demo**
   - 使用者提供了完整的 HTML/CSS/JS 範例
   - 照著範例實作即可，不需要自己發揮

2. **單純的微調**
   - 調整數值（如 animation duration、間距、顏色）
   - 修改文字內容
   - 簡單的樣式調整

3. **明確的新增需求**
   - 「加一個按鈕」「新增一個欄位」
   - 功能範圍清楚，不影響現有邏輯

4. **刪除/移除**
   - 「把這個刪掉」「移除這個功能」
   - 範圍明確，直接執行

### 需要先問使用者的情況

1. **即將改變現有行為**
   - 要修改已經在運作的邏輯
   - 可能影響其他功能的運作方式

2. **有多種實作方式**
   - 技術方案不只一種
   - 需要使用者決定偏好

3. **即將刪除使用者沒提到的東西**
   - 使用者說 A，但你覺得要連 B 一起改/刪
   - 必須先確認

4. **不確定使用者的意圖**
   - prompt 有歧義
   - 需要釐清具體需求

### 核心原則

- **先讀完相關程式碼再行動**
- **使用者給了範例，先比較範例達成什麼、現有程式碼缺什麼。如果認為一樣，挑戰範例並說明看法**
- **寧可少做，不要多做錯的**
- **改現有邏輯前先確認**