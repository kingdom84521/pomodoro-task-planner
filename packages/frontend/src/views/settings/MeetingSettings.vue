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
    </el-form>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserSettingsStore } from '../../stores/userSettings'

const settingsStore = useUserSettingsStore()

// Reminder minutes
const reminderMinutes = computed({
  get: () => settingsStore.meetingReminderMinutes,
  set: (value) => settingsStore.updateMeetingReminderMinutes(value),
})

// Handle reminder change
const handleReminderChange = (value) => {
  settingsStore.updateMeetingReminderMinutes(value)
}
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
    margin: 4px 0 0 8px;
  }
}
</style>
