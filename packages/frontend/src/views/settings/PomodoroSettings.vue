<template>
  <div class="pomodoro-settings">
    <div class="page-header">
      <h2 class="page-title">番茄鐘設定</h2>
    </div>

    <el-form :model="formData" label-width="180px" style="max-width: 500px">
      <el-form-item label="專注時間（分鐘）">
        <el-input-number
          v-model="formData.focusDuration"
          :min="1"
          :max="120"
          :step="5"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="短休息時間（分鐘）">
        <el-input-number
          v-model="formData.shortBreakDuration"
          :min="1"
          :max="30"
          :step="1"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="長休息間隔（次）">
        <el-input-number
          v-model="formData.longBreakInterval"
          :min="2"
          :max="10"
          :step="1"
          style="width: 100%"
        />
        <div class="form-hint">
          完成幾次專注後進入長休息
        </div>
      </el-form-item>

      <el-form-item label="長休息時間（分鐘）">
        <el-input-number
          v-model="formData.longBreakDuration"
          :min="5"
          :max="60"
          :step="5"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleSave" :disabled="!hasChanges">
          儲存設定
        </el-button>
        <el-button @click="handleReset" :disabled="!hasChanges">
          重置
        </el-button>
      </el-form-item>
    </el-form>

    <div v-if="settingsStore.hasPendingChanges" class="pending-notice">
      <el-icon><InfoFilled /></el-icon>
      <span>設定將於明天生效（今天已有工作紀錄）</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useUserSettingsStore } from '../../stores/userSettings'
import { usePomodoroStore } from '../../stores/pomodoro'

const settingsStore = useUserSettingsStore()
const pomodoroStore = usePomodoroStore()

// Form data (in minutes for display)
const formData = ref({
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
})

// Original values for comparison
const originalData = ref(null)

// Check if form has changes
const hasChanges = computed(() => {
  if (!originalData.value) return false
  return (
    formData.value.focusDuration !== originalData.value.focusDuration ||
    formData.value.shortBreakDuration !== originalData.value.shortBreakDuration ||
    formData.value.longBreakDuration !== originalData.value.longBreakDuration ||
    formData.value.longBreakInterval !== originalData.value.longBreakInterval
  )
})

// Load settings from store
const loadSettings = () => {
  const settings = settingsStore.displaySettings
  formData.value = {
    focusDuration: Math.round(settings.focusDuration / 60),
    shortBreakDuration: Math.round(settings.shortBreakDuration / 60),
    longBreakDuration: Math.round(settings.longBreakDuration / 60),
    longBreakInterval: settings.longBreakInterval,
  }
  originalData.value = { ...formData.value }
}

// Check if today has any completed focus sessions
const hasTodayRecords = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return pomodoroStore.session.validDate === today && pomodoroStore.session.completedFocusCount > 0
})

// Check if settings match current effective settings
const matchesCurrentSettings = (settings) => {
  const current = settingsStore.effectiveSettings
  return (
    settings.focusDuration === current.focusDuration &&
    settings.shortBreakDuration === current.shortBreakDuration &&
    settings.longBreakDuration === current.longBreakDuration &&
    settings.longBreakInterval === current.longBreakInterval
  )
}

// Save settings
const handleSave = () => {
  // Convert minutes to seconds
  const settings = {
    focusDuration: formData.value.focusDuration * 60,
    shortBreakDuration: formData.value.shortBreakDuration * 60,
    longBreakDuration: formData.value.longBreakDuration * 60,
    longBreakInterval: formData.value.longBreakInterval,
  }

  // If matches current settings, clear pending and apply immediately
  // Otherwise, check if today has records
  const immediate = matchesCurrentSettings(settings) || !hasTodayRecords.value
  settingsStore.updatePomodoroSettings(settings, immediate)
  originalData.value = { ...formData.value }

  if (matchesCurrentSettings(settings)) {
    ElMessage.success('設定已還原')
  } else if (immediate) {
    ElMessage.success('設定已儲存並立即生效')
  } else {
    ElMessage.success('設定已儲存，將於明天生效')
  }
}

// Reset form
const handleReset = () => {
  formData.value = { ...originalData.value }
}

onMounted(() => {
  // Apply pending settings if date has arrived
  settingsStore.applyPendingIfReady()
  loadSettings()
})
</script>

<style scoped>
.pomodoro-settings {
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

  .pending-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #fdf6ec;
    border: 1px solid #faecd8;
    border-radius: 4px;
    color: #e6a23c;
    font-size: 14px;
    margin-top: 24px;
    max-width: 500px;
  }
}
</style>
