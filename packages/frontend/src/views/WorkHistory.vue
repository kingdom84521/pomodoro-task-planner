<template>
  <div class="work-history-page">
    <div class="left-panel">
      <div class="table-container">
        <BounceLoading v-if="!isReady" />
        <DataTable v-else :data="records">
          <el-table-column prop="taskName" label="任務名稱" min-width="40" />
          <el-table-column prop="duration" label="耗時" min-width="30" align="center" />
          <el-table-column prop="date" label="日期" min-width="30" align="center" />
        </DataTable>
      </div>
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
import DataTable from '../components/DataTable.vue'
import BounceLoading from '../components/BounceLoading.vue'
import { getWorkRecords } from '../api/workRecords'
import { useMeetingsStore } from '../stores/meetings'

const meetingsStore = useMeetingsStore()

// Check if there's an active meeting
const hasActiveMeeting = computed(() => !!meetingsStore.activeMeeting)

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

// 載入工作紀錄
const loadRecords = async () => {
  isReady.value = false
  const startTime = Date.now()

  try {
    const response = await getWorkRecords({ limit: 50 })
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

    .table-container {
      height: fit-content;
      max-height: 100%;
      overflow: visible;
      background: #ffffff;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
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
