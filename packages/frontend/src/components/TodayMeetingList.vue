<template>
  <div class="today-meeting-list">
    <div class="section-header">
      <span class="section-icon">🕐</span>
      <h3 class="section-title">今日會議</h3>
    </div>

    <div class="list-content">
      <BounceLoading v-if="loading" />
      <div v-else-if="sortedMeetings.length === 0" class="empty-state">
        今日無會議
      </div>
      <div v-else class="card-list">
        <div
          v-for="item in sortedMeetings"
          :key="item.id"
          class="meeting-card"
          :class="item.status"
          @click="navigateToMeetings"
        >
          <div class="card-content">
            <div class="card-title">{{ item.meeting?.title }}</div>
            <div class="card-footer">
              <span class="card-status" :class="getStatusClass(item)">
                {{ getStatusText(item) }}
              </span>
              <span class="card-arrow">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import BounceLoading from './BounceLoading.vue'
import { useMeetingsStore } from '../stores/meetings'

const router = useRouter()
const meetingsStore = useMeetingsStore()

// Loading state
const loading = computed(() => meetingsStore.loadingToday)

// Today's meetings
const meetings = computed(() => meetingsStore.todayMeetingsSorted || [])

// 排序：未完成的放前面
const sortedMeetings = computed(() => {
  return [...meetings.value].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return 0
  })
})

// 取得狀態 class
const getStatusClass = (item) => {
  if (item.status === 'completed') return 'completed'
  return 'pending'
}

// 取得狀態文字
const getStatusText = (item) => {
  if (item.status === 'completed') return '已結束'

  // 比較時間
  const now = new Date()
  const [hours, minutes] = item.scheduled_time.split(':').map(Number)
  const scheduledTime = new Date()
  scheduledTime.setHours(hours, minutes, 0, 0)

  if (now < scheduledTime) {
    return `將開始於 ${item.scheduled_time}`
  }
  return '尚未開會'
}

const navigateToMeetings = () => {
  router.push('/meetings')
}

onMounted(() => {
  meetingsStore.fetchTodayMeetings()
  meetingsStore.startPolling()
})

onUnmounted(() => {
  meetingsStore.stopPolling()
})
</script>

<style scoped>
.today-meeting-list {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  min-width: 270px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 0 12px;

  .section-icon {
    font-size: 18px;
  }

  .section-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.list-content {
  /* No fixed min-height - let content determine height */
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 24px;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meeting-card {
  background: #f5f5f5;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    filter: brightness(0.97);
  }

  &.pending {
    background: #ecf5ff;
    border-color: #b3d8ff;
  }

  &.completed {
    background: #f5f5f5;
    border-color: #e0e0e0;
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-status {
  font-size: 12px;

  &.completed {
    color: #909399;
  }

  &.pending {
    color: #5a9cf8;
  }
}

.card-arrow {
  font-size: 14px;
  color: #909399;
}
</style>
