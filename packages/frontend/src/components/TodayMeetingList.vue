<template>
  <div class="today-meeting-list">
    <div class="section-header">
      <div class="header-left">
        <span class="section-icon">🕐</span>
        <h3 class="section-title">今日會議</h3>
      </div>
      <router-link to="/meetings" class="manage-link">
        管理 →
      </router-link>
    </div>

    <div class="list-content">
      <BounceLoading v-if="loading" />
      <div v-else-if="meetings.length === 0" class="empty-state">
        今日無會議
      </div>
      <DataTable v-else :data="meetings">
        <el-table-column prop="scheduled_time" label="時間" width="80" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ row.scheduled_time }}</span>
          </template>
        </el-table-column>

        <el-table-column label="名稱" min-width="150">
          <template #default="{ row }">
            <span :class="{ 'completed-text': row.status === 'completed' }">
              {{ row.meeting?.title }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="類型" min-width="80" align="center">
          <template #default="{ row }">
            <span class="type-tag" :class="row.meeting?.meeting_type">
              {{ row.meeting?.meeting_type === 'recurring' ? '例行' : '一次性' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="狀態" min-width="80" align="center">
          <template #default="{ row }">
            <span class="status-tag" :class="row.status">
              {{ getStatusText(row.status) }}
            </span>
          </template>
        </el-table-column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import DataTable from './DataTable.vue'
import BounceLoading from './BounceLoading.vue'
import { useMeetingsStore } from '../stores/meetings'

const meetingsStore = useMeetingsStore()

// Loading state
const loading = computed(() => meetingsStore.loadingToday)

// Today's meetings
const meetings = computed(() => meetingsStore.todayMeetingsSorted || [])

// Get status text
const getStatusText = (status) => {
  const statusMap = {
    pending: '待開始',
    in_progress: '進行中',
    completed: '已結束',
    skipped: '已跳過',
  }
  return statusMap[status] || status
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
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 12px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-icon {
    font-size: 18px;
  }

  .section-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .manage-link {
    color: #409eff;
    font-size: 14px;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.list-content {
  min-height: 100px;
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 24px;
}

.time-text {
  font-family: 'Courier New', monospace;
  font-weight: 500;
  color: #303133;
}

.completed-text {
  text-decoration: line-through;
  color: #909399;
}

.type-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.recurring {
    background: #ecf5ff;
    color: #409eff;
  }

  &.one-time {
    background: #f5f7fa;
    color: #606266;
  }
}

.status-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;

  &.pending {
    background: #fdf6ec;
    color: #e6a23c;
  }

  &.in_progress {
    background: #d1fae5;
    color: #10b981;
  }

  &.completed {
    background: #f0f9eb;
    color: #67c23a;
  }

  &.skipped {
    background: #f5f7fa;
    color: #909399;
  }
}

</style>
