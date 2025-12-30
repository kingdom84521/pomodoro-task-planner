<template>
  <div class="meeting-settings">
    <div class="page-header">
      <h2 class="page-title">會議設定</h2>
    </div>

    <el-form label-width="180px" style="max-width: 500px">
      <el-form-item label="會議提前提醒時間（分鐘）">
        <el-input-number
          v-model="reminderMinutes"
          :min="1"
          :max="60"
          @change="handleReminderChange"
        />
        <p class="form-hint">會議開始前幾分鐘顯示提醒</p>
      </el-form-item>

      <el-form-item>
        <el-button
          type="primary"
          :loading="syncing"
          @click="handleSync"
        >
          {{ syncing ? '同步中...' : '同步到雲端' }}
        </el-button>
        <span v-if="!isSynced" class="sync-hint">有未同步的變更</span>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserSettingsStore } from '../../stores/userSettings'

const settingsStore = useUserSettingsStore()

const syncing = ref(false)

// Reminder minutes
const reminderMinutes = computed({
  get: () => settingsStore.meetingReminderMinutes,
  set: (value) => settingsStore.updateMeetingReminderMinutes(value),
})

// Sync status
const isSynced = computed(() => settingsStore.isSynced)

// Handle reminder change
const handleReminderChange = (value) => {
  settingsStore.updateMeetingReminderMinutes(value)
}

// Handle sync
const handleSync = async () => {
  syncing.value = true
  try {
    await settingsStore.uploadSettings()
    ElMessage.success('已同步到雲端')
  } catch (error) {
    console.error('Failed to sync settings:', error)
    ElMessage.error('同步失敗')
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  await settingsStore.downloadSettings()
})
</script>

<style scoped>
.meeting-settings {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .page-header {
    margin-bottom: 24px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
  }

  .form-hint {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }

  .sync-hint {
    margin-left: 12px;
    font-size: 13px;
    color: #e6a23c;
  }
}
</style>
