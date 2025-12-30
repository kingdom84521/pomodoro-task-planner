<template>
  <div class="meeting-clock">
    <!-- Meeting info -->
    <div class="meeting-info">
      <h3 class="meeting-title">{{ meeting?.meeting?.title || '會議進行中' }}</h3>
      <p class="meeting-time">預定時間：{{ meeting?.scheduled_time || '--:--' }}</p>
    </div>

    <!-- Timer display -->
    <div class="timer-section">
      <TimerDisplay
        mode="stopwatch"
        :elapsed="elapsed"
        :status="status"
        timer-type="meeting"
        mode-label="會議中"
        :show-ring="false"
      />
    </div>

    <!-- Actions -->
    <div class="timer-actions">
      <el-button
        type="danger"
        size="large"
        @click="handleEndMeeting"
      >
        結束會議
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TimerDisplay from './TimerDisplay.vue'
import { useMeetingsStore } from '../stores/meetings'
import { ElMessage } from 'element-plus'

const meetingsStore = useMeetingsStore()

// Current active meeting
const meeting = computed(() => meetingsStore.activeMeeting)

// Stopwatch elapsed time
const elapsed = computed(() => meetingsStore.stopwatch.elapsed)

// Status
const status = computed(() => {
  if (meetingsStore.isStopwatchRunning) return 'running'
  return 'idle'
})

// End the meeting
const handleEndMeeting = async () => {
  try {
    await meetingsStore.endActiveMeeting()
    ElMessage.success('會議已結束')
  } catch (error) {
    console.error('Failed to end meeting:', error)
    ElMessage.error('結束會議失敗')
  }
}
</script>

<style scoped>
.meeting-clock {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: #606266;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.meeting-info {
  text-align: center;
  margin-bottom: 24px;

  .meeting-title {
    font-size: 18px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;
  }

  .meeting-time {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.timer-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-actions {
  margin-top: 24px;

  .el-button {
    min-width: 120px;
  }
}
</style>
