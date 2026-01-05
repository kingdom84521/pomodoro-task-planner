# PostgreSQL 設定指南

本文件說明如何設定外部 PostgreSQL 資料庫。

> **自動化說明：** 應用程式啟動時會**自動**建立資料庫和資料表，你只需要提供一個有權限的 PostgreSQL 連線。

---

## 選擇你的情況

### 情況 A：使用現有的 PostgreSQL 使用者

如果你已經有 PostgreSQL 伺服器和使用者（例如 `postgres`），直接使用現有的帳號密碼：

```env
DB_MODE=postgres
DATABASE_URL=postgresql://postgres:你的現有密碼@主機:5432/pomodoro_planner
```

跳到 [Step 3：啟動服務](#step-3啟動服務)。

---

### 情況 B：建立新的專用使用者（推薦）

如果你想為這個應用程式建立專用使用者：

#### Step 1：產生密碼

```bash
# 產生 32 字元的隨機密碼
openssl rand -base64 32
```

輸出範例：`K7xH2mN9pQ3rT6wY1aB4cD5eF8gH0jK2`

> 📝 **記下這個密碼**，等等要用。

#### Step 2：建立使用者

用 `postgres` 超級使用者連線，執行：

```sql
CREATE USER pomodoro_user WITH PASSWORD '你產生的密碼' CREATEDB;
```

**用 psql 指令：**
```bash
psql -h 你的主機 -U postgres -c "CREATE USER pomodoro_user WITH PASSWORD 'K7xH2mN9pQ3rT6wY1aB4cD5eF8gH0jK2' CREATEDB;"
```

#### Step 3：填入環境變數

```env
DB_MODE=postgres
DATABASE_URL=postgresql://pomodoro_user:K7xH2mN9pQ3rT6wY1aB4cD5eF8gH0jK2@主機:5432/pomodoro_planner
```

---

## Step 3：啟動服務

```bash
docker compose up -d
```

應用程式啟動時會自動：
1. 等待 PostgreSQL 連線成功
2. 檢查資料庫是否存在，不存在則建立
3. 建立所有資料表（透過 Drizzle ORM）

---

## 常見問題

### Q1：我需要先手動建立資料庫嗎？

**不需要！** 應用程式會自動建立。你只需要確保：
- PostgreSQL 伺服器正在運行
- 提供的使用者有建立資料庫的權限（`CREATEDB`）

### Q2：密碼有特殊字元怎麼辦？

需要進行 URL 編碼：

| 字元 | 編碼 |
|------|------|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `#` | `%23` |

**範例：** 密碼 `p@ss:word` → `p%40ss%3Aword`

> 💡 **建議：** 用 `openssl rand -base64 32` 產生的密碼只會有字母數字和 `+/=`，其中 `+` 和 `/` 需要編碼為 `%2B` 和 `%2F`。

### Q3：需要 SSL 連線怎麼辦？

在連線字串後面加參數：

```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### Q4：如何確認連線成功？

查看 backend 日誌：

```bash
docker compose logs backend
```

成功的話會看到：

```
=== Pomodoro Backend Startup ===
[1/3] Waiting for PostgreSQL...
    PostgreSQL is available
[2/3] Checking database...
    Target database: pomodoro_planner
    Connected to PostgreSQL
    Database already exists
[3/3] Starting application...
Server running on port 3001
```

---

## 進階設定

### 手動驗證資料表

```bash
psql "$DATABASE_URL" -c "\dt"
```

預期會看到 10 個資料表。

### 備份資料庫

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

### 還原資料庫

```bash
psql "$DATABASE_URL" < backup.sql
```
