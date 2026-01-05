<template>
  <div class="work-history-page">
    <div class="left-panel">
      <BounceLoading v-if="!isReady" />
      <CardTable
        v-else
        :columns="columns"
        :data="records"
        empty-text="尚無工作紀錄"
      />
    </div>
    <div class="right-panel">
      <!-- Meeting reminder bar -->
      <MeetingReminderBar v-if="!hasActiveMeeting" />

      <!-- Show MeetingClock when in meeting, otherwise PomodoroClock -->
      <MeetingClock v-if="hasActiveMeeting" />
      <PomodoroClock v-else @record-created="handleRecordCreated" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import PomodoroClock from '../components/PomodoroClock.vue'
import MeetingClock from '../components/MeetingClock.vue'
import MeetingReminderBar from '../components/MeetingReminderBar.vue'
import CardTable from '../components/CardTable.vue'
import BounceLoading from '../components/BounceLoading.vue'
import { getWorkRecords } from '../api/workRecords'
import { useMeetingsStore } from '../stores/meetings'

const meetingsStore = useMeetingsStore()

// Check if there's an active meeting
const hasActiveMeeting = computed(() => !!meetingsStore.activeMeeting)

// Column definitions
const columns = [
  { prop: 'taskName', label: '任務名稱', flex: 1 },
  { prop: 'duration', label: '耗時', width: '120px', align: 'center' },
  { prop: 'date', label: '日期', width: '120px', align: 'center' },
]

// 資料
const records = ref([])
const isReady = ref(false)

// 最短載入時間（毫秒）
const MIN_LOADING_TIME = 500

// 格式化時長（秒 -> 分鐘，用小數表示，最多兩位小數）
const formatDuration = (seconds) => {
  const minutes = seconds / 60
  // 取到小數點後兩位
  const rounded = Math.round(minutes * 100) / 100
  return `${rounded} 分鐘`
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-')
}

// 取得本週日期範圍（週一到週日）
const getThisWeekRange = () => {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, ...

  // Calculate Monday of this week
  // If Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
  const mondayOffset = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1)
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  // Sunday is 6 days after Monday
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const formatYMD = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    startDate: formatYMD(monday),
    endDate: formatYMD(sunday),
  }
}

// 載入工作紀錄
const loadRecords = async () => {
  isReady.value = false
  const startTime = Date.now()

  try {
    const { startDate, endDate } = getThisWeekRange()
    const response = await getWorkRecords({ startDate, endDate })
    const workRecords = response.data.work_records || []

    // 轉換資料格式
    records.value = workRecords.map(record => ({
      id: record.id,
      taskName: record.task_name,
      duration: formatDuration(record.duration),
      date: formatDate(record.completed_at),
    }))
  } catch (error) {
    console.error('Failed to load work records:', error)
    ElMessage.error('載入工作紀錄失敗')
    records.value = []
  }

  // 確保最短顯示 loading 0.5 秒
  const elapsed = Date.now() - startTime
  if (elapsed < MIN_LOADING_TIME) {
    await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
  }

  isReady.value = true
}

// 處理新增工作紀錄事件（直接加入列表，不重新載入）
const handleRecordCreated = (record) => {
  records.value.unshift({
    id: record.id,
    taskName: record.task_name,
    duration: formatDuration(record.duration),
    date: formatDate(record.completed_at),
  })
}

onMounted(() => {
  loadRecords()
  // Start polling for upcoming meetings
  meetingsStore.startPolling()
})

onUnmounted(() => {
  // Stop polling when leaving the page
  meetingsStore.stopPolling()
})
</script>

<style scoped>
.work-history-page {
  display: flex;
  gap: 20px;
  flex: 1;
  height: 0;
  min-height: 0;

  .left-panel {
    flex: 0 0 70%;
    max-width: 70%;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .right-panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
}
</style>
