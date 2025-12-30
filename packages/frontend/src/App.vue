<template>
  <div id="app">
    <el-container class="layout-container">
      <!-- 頂部導航欄 -->
      <el-header class="navbar">
        <div class="navbar-left">
          <router-link to="/" class="nav-link" exact>首頁</router-link>
          <router-link to="/tasks" class="nav-link">任務列表</router-link>
          <router-link to="/meetings" class="nav-link">會議</router-link>
          <router-link to="/history" class="nav-link">工作紀錄</router-link>
          <router-link to="/statistics" class="nav-link">數值統計</router-link>
        </div>
        <div class="navbar-right">
          <!-- User Info Display -->
          <div v-if="currentUser" class="user-info">
            <span class="welcome-text">歡迎，{{ currentUser.name }}</span>
          </div>
          <div v-else class="user-info">
            <el-text type="info">載入中...</el-text>
          </div>

          <router-link to="/settings" class="nav-link icon-only">
            <el-icon :size="20"><Setting /></el-icon>
          </router-link>
        </div>
      </el-header>

      <!-- 主要內容區域 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { authApi } from './api/auth'

const currentUser = ref(null)

// Fetch current user on mount
onMounted(async () => {
  try {
    const response = await authApi.getCurrentUser()
    currentUser.value = response.data.user
  } catch (error) {
    console.error('Failed to fetch user:', error)
    ElMessage.error('無法載入用戶資訊')
  }
})
</script>

<style scoped>
#app {
  height: 100vh;
  background: #f5f7fa;

  .layout-container {
    height: 100%;
    flex-direction: column;

    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      background-color: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
      height: 60px;

      .navbar-left {
        display: flex;
        gap: 24px;
        align-items: center;
      }

      .navbar-right {
        display: flex;
        align-items: center;
        gap: 16px;

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;

          .welcome-text {
            font-size: 14px;
            color: #606266;
            white-space: nowrap;
          }
        }
      }
    }

    .main-content {
      flex: 1;
      height: 0;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
  }

  .nav-link {
    text-decoration: none;
    color: #606266;
    font-size: 16px;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 4px;
    transition: all 0.3s;
    display: flex;
    align-items: center;

    &:hover {
      color: #409eff;
      background-color: #ecf5ff;
    }

    &.router-link-active {
      color: #409eff;
      background-color: #ecf5ff;
    }

    &.icon-only {
      padding: 8px;
    }
  }
}
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
