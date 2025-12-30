<template>
  <div
    v-if="meeting"
    class="meeting-reminder-bar"
    :class="urgencyClass"
  >
    <div class="reminder-content">
      <el-icon class="reminder-icon"><Clock /></el-icon>
      <span class="reminder-text">{{ reminderText }}</span>
    </div>
    <div class="reminder-actions">
      <el-button
        type="primary"
        size="small"
        @click="handleStart"
      >
        開始會議
      </el-button>
      <el-button
        size="small"
        @click="handleSkip"
      >
        跳過
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Clock } from '@element-plus/icons-vue'
import { useMeetingsStore } from '../stores/meetings'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const meetingsStore = useMeetingsStore()
const router = useRouter()

// Get the most urgent meeting
const meeting = computed(() => meetingsStore.mostUrgentMeeting)

// Urgency class for styling
const urgencyClass = computed(() => {
  if (!meeting.value) return ''
  return meeting.value.urgency === 'overdue' ? 'overdue' : 'upcoming'
})

// Reminder text
const reminderText = computed(() => {
  if (!meeting.value) return ''

  const title = meeting.value.meeting?.title || '會議'

  if (meeting.value.urgency === 'overdue') {
    return `現在是【${title}】的預定時間`
  }

  // Calculate minutes until meeting
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const [hours, mins] = meeting.value.scheduled_time.split(':').map(Number)
  const meetingMinutes = hours * 60 + mins
  const diff = meetingMinutes - currentMinutes

  if (diff <= 1) {
    return `【${title}】即將開始`
  }

  return `【${title}】將在 ${diff} 分鐘後開始`
})

// Handle start meeting
const handleStart = async () => {
  if (!meeting.value) return

  try {
    await meetingsStore.startMeetingInstance(meeting.value)
    // Navigate to work history page if not already there
    if (router.currentRoute.value.path !== '/history') {
      router.push('/history')
    }
  } catch (error) {
    console.error('Failed to start meeting:', error)
    ElMessage.error('開始會議失敗')
  }
}

// Handle skip meeting
const handleSkip = async () => {
  if (!meeting.value) return

  try {
    await ElMessageBox.confirm(
      `確定要跳過【${meeting.value.meeting?.title}】嗎？`,
      '跳過會議',
      {
        confirmButtonText: '確定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await meetingsStore.skipMeetingInstance(meeting.value.id)
    ElMessage.info('已跳過會議')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to skip meeting:', error)
      ElMessage.error('跳過會議失敗')
    }
  }
}
</script>

<style scoped>
.meeting-reminder-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;

  &.upcoming {
    background: #ecf5ff;
    border: 1px solid #b3d8ff;

    .reminder-icon {
      color: #409eff;
    }
  }

  &.overdue {
    background: #fef3cd;
    border: 1px solid #ffc107;

    .reminder-icon {
      color: #e6a23c;
    }
  }
}

.reminder-content {
  display: flex;
  align-items: center;
  gap: 8px;

  .reminder-icon {
    font-size: 18px;
  }

  .reminder-text {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
  }
}

.reminder-actions {
  display: flex;
  gap: 8px;
}
</style>
