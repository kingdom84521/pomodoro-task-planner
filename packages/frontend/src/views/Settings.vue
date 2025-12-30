<template>
  <div class="settings-page">
    <div class="settings-sidebar">
      <div class="sidebar-header">
        <h2>設定</h2>
        <div v-if="showSyncButtons" class="sync-buttons">
          <el-tooltip content="從雲端下載設定" placement="top">
            <el-button
              :icon="Download"
              circle
              size="small"
              @click="handleDownload"
              :loading="downloading"
            />
          </el-tooltip>
          <el-tooltip content="上傳設定到雲端" placement="top">
            <el-button
              :icon="Upload"
              circle
              size="small"
              @click="handleUpload"
              :loading="uploading"
            />
          </el-tooltip>
        </div>
      </div>
      <nav class="settings-nav">
        <router-link to="/settings/pomodoro" class="nav-item">
          <span class="nav-icon">🍅</span>
          <span class="nav-text">番茄鐘</span>
        </router-link>
        <router-link to="/settings/meetings" class="nav-item">
          <span class="nav-icon">🕐</span>
          <span class="nav-text">會議設定</span>
        </router-link>
        <router-link to="/settings/resources" class="nav-item">
          <span class="nav-icon">📁</span>
          <span class="nav-text">資源管理</span>
        </router-link>
      </nav>
    </div>
    <div class="settings-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Upload, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUserSettingsStore } from '../stores/userSettings'

const settingsStore = useUserSettingsStore()

const uploading = ref(false)
const downloading = ref(false)

const showSyncButtons = computed(() => !settingsStore.isSynced)

const handleUpload = async () => {
  uploading.value = true
  try {
    await settingsStore.uploadSettings()
    ElMessage.success('設定已上傳到雲端')
  } catch (error) {
    console.error('Failed to upload settings:', error)
    ElMessage.error('上傳設定失敗')
  } finally {
    uploading.value = false
  }
}

const handleDownload = async () => {
  downloading.value = true
  try {
    const success = await settingsStore.downloadSettings()
    if (success) {
      ElMessage.success('設定已從雲端下載')
    } else {
      ElMessage.warning('雲端沒有儲存的設定')
    }
  } catch (error) {
    console.error('Failed to download settings:', error)
    ElMessage.error('下載設定失敗')
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.settings-page {
  display: flex;
  height: 100%;
  gap: 20px;

  .settings-sidebar {
    flex: 0 0 20%;
    max-width: 20%;
    background: #ffffff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #303133;
      }

      .sync-buttons {
        display: flex;
        gap: 8px;
      }
    }

    .settings-nav {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .nav-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        border-radius: 6px;
        text-decoration: none;
        color: #606266;
        font-size: 15px;
        transition: all 0.3s;
        user-select: none;

        &:hover {
          background-color: #f5f7fa;
          color: #409eff;
        }

        &.router-link-active {
          background-color: #ecf5ff;
          color: #409eff;
          font-weight: 500;
        }

        .nav-icon {
          margin-right: 12px;
          font-size: 18px;
        }

        .nav-text {
          flex: 1;
        }
      }
    }
  }

  .settings-content {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
  }
}
</style>
