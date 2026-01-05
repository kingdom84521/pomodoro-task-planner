# Zitadel 設定指南

本文件說明如何在自架的 Zitadel 中設定應用程式，以啟用 OIDC 登入功能。

---

## 目錄

1. [登入 Zitadel Console](#step-1登入-zitadel-console)
2. [建立 Project](#step-2建立-project)
3. [建立 Application](#step-3建立-application)
4. [設定 Redirect URI](#step-4設定-redirect-uri)
5. [取得設定值](#step-5取得設定值)
6. [設定 Token](#step-6設定-token-settings)
7. [填入環境變數](#step-7填入環境變數)

---

## Step 1：登入 Zitadel Console

1. 打開瀏覽器
2. 前往你的 Zitadel Console：`https://your-zitadel-domain.com/ui/console`
3. 使用管理員帳號登入

---

## Step 2：建立 Project

> 如果你已經有 Project，可以跳過這一步。

1. 點擊左側選單的 **Projects**
2. 點擊右上角的 **+ Create Project**
3. 輸入 Project 名稱：`Pomodoro Task Planner`
4. 點擊 **Continue**

![Create Project](https://zitadel.com/docs/img/guides/console-project-create.png)

---

## Step 3：建立 Application

1. 在 Project 頁面，點擊 **+ New**
2. 輸入 Application 名稱：`Pomodoro Web App`
3. 選擇 Application Type：**User Agent**

   > User Agent 適用於在瀏覽器中運行的 SPA（Single Page Application）

4. 點擊 **Continue**
5. 選擇 Authentication Method：**PKCE**

   > PKCE 是 SPA 的最佳安全實踐，不需要 Client Secret

6. 點擊 **Continue**

---

## Step 4：設定 Redirect URI

在這個步驟，你需要設定兩個重要的 URI：

### Redirect URI（登入後導向）

這是使用者登入成功後，Zitadel 會將使用者導回的網址。

**範例值：**
- 開發環境：`http://localhost:3000/auth/callback`
- 生產環境：`https://pomodoro.example.com/auth/callback`

### Post Logout Redirect URI（登出後導向）

這是使用者登出後，Zitadel 會將使用者導回的網址。

**範例值：**
- 開發環境：`http://localhost:3000/`
- 生產環境：`https://pomodoro.example.com/`

### 設定步驟

1. 在 **Redirect URIs** 欄位，輸入：
   ```
   https://pomodoro.example.com/auth/callback
   ```

2. 在 **Post Logout URIs** 欄位，輸入：
   ```
   https://pomodoro.example.com/
   ```

3. 點擊 **Create**

---

## Step 5：取得設定值

Application 建立完成後，你會看到以下資訊：

### Client ID

在 Application 詳細頁面的 **Configuration** 區塊可以找到。

格式類似：`276899234567890123@pomodoro-task-planner`

> 📝 記下這個值，稍後需要填入 `VITE_ZITADEL_CLIENT_ID`

### Project Resource ID

1. 回到 Project 頁面
2. 點擊 **Settings**（齒輪圖示）
3. 在 **General** 區塊找到 **Resource ID**

格式類似：`276899234567890123`

> 📝 記下這個值，稍後需要填入 `ZITADEL_AUDIENCE`

---

## Step 6：設定 Token Settings

為了確保正確的使用者資訊傳遞，需要調整 Token 設定：

1. 在 Application 頁面，點擊 **Token Settings**
2. 確認以下選項已啟用：
   - [x] **User roles inside ID Token**
   - [x] **User Info inside ID Token**
3. 點擊 **Save**

---

## Step 7：填入環境變數

將以上取得的值填入 `.env` 檔案：

```env
# 後端設定
ZITADEL_DOMAIN=https://zitadel.example.com
ZITADEL_AUDIENCE=276899234567890123

# 前端設定（Build Time）
VITE_ZITADEL_DOMAIN=https://zitadel.example.com
VITE_ZITADEL_CLIENT_ID=276899234567890123@pomodoro-task-planner
VITE_ZITADEL_REDIRECT_URI=https://pomodoro.example.com/auth/callback
VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI=https://pomodoro.example.com/
```

---

## 常見問題

### Q1：登入時出現 "redirect_uri_mismatch" 錯誤

**原因：** 前端設定的 Redirect URI 與 Zitadel Console 中設定的不一致。

**解決方法：**
1. 確認 `VITE_ZITADEL_REDIRECT_URI` 的值
2. 前往 Zitadel Console > Application > Redirect URIs
3. 確保兩者**完全一致**（包含 protocol、domain、path）

### Q2：登入時出現 "invalid_client" 錯誤

**原因：** Client ID 設定錯誤。

**解決方法：**
1. 前往 Zitadel Console > Application > Configuration
2. 複製完整的 Client ID（包含 @ 後面的部分）
3. 確認 `VITE_ZITADEL_CLIENT_ID` 已正確設定

### Q3：使用 HTTP 時登入失敗

**原因：** Zitadel 預設只允許 HTTPS。

**解決方法（僅限開發環境）：**
1. 前往 Zitadel Console > Application
2. 找到 **Dev Mode** 選項
3. 將其切換為 **ON**

> ⚠️ **警告：** 生產環境必須使用 HTTPS，請勿啟用 Dev Mode。

### Q4：Token 中沒有使用者資訊

**原因：** Token Settings 未正確設定。

**解決方法：**
1. 前往 Application > Token Settings
2. 啟用 **User Info inside ID Token**
3. 儲存設定

---

## 參考資源

- [Zitadel Vue.js 官方文件](https://zitadel.com/docs/sdk-examples/vue)
- [Zitadel OIDC 設定指南](https://zitadel.com/docs/guides/integrate/login/oidc/login-users)
- [Zitadel Application 管理](https://zitadel.com/docs/guides/manage/console/applications)
