<template>
  <div class="recurring-meeting-table">
    <div v-if="meetings.length === 0" class="empty-state">
      尚無例行會議
    </div>
    <DataTable v-else :data="meetings" @row-contextmenu="handleRowContextMenu">
      <el-table-column prop="title" label="名稱" min-width="150">
        <template #default="{ row }">
          <div class="name-cell">
            <span class="meeting-title">{{ row.title }}</span>
            <span
              class="stopwatch-icon"
              :class="{ disabled: hasActiveMeeting }"
              @click.stop="handleStart(row)"
            >
              ⏱️
            </span>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="scheduled_time" label="時間" width="80" align="center">
        <template #default="{ row }">
          <span class="time-text">{{ row.scheduled_time }}</span>
        </template>
      </el-table-column>

      <el-table-column label="週期" min-width="100" align="center">
        <template #default="{ row }">
          <span class="recurrence-text">
            {{ formatRecurrence(row.recurrence_rule) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="耗時" min-width="140" align="center">
        <template #default="{ row }">
          <div v-if="row.completed_count > 0" class="duration-stats">
            <span class="duration-total">總計 {{ formatDuration(row.total_duration) }}</span>
            <span class="duration-avg">平均 {{ formatDuration(row.avg_duration) }}</span>
          </div>
          <span v-else class="no-data">-</span>
        </template>
      </el-table-column>

    </DataTable>

    <!-- Context menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <div class="context-menu-item" @click="handleEdit">
        <el-icon><Edit /></el-icon>
        <span>編輯</span>
      </div>
      <div class="context-menu-item danger" @click="handleDelete">
        <el-icon><Delete /></el-icon>
        <span>刪除</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, onMounted, onUnmounted } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import DataTable from './DataTable.vue'

const props = defineProps({
  meetings: {
    type: Array,
    required: true,
  },
  hasActiveMeeting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['edit', 'delete', 'start'])

// Handle start click
const handleStart = (row) => {
  if (props.hasActiveMeeting) return
  emit('start', row)
}

// Context menu state
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  meeting: null,
})

// Format recurrence rule
const formatRecurrence = (rule) => {
  if (!rule) return '-'

  const { frequency, daysOfWeek } = rule
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']

  if (frequency === 'daily') return '每天'

  if (frequency === 'weekly' && daysOfWeek) {
    const days = daysOfWeek.map(d => dayNames[d]).join('')
    return `週${days}`
  }

  return '-'
}

// Format duration in seconds to readable string
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '-'
  const minutes = (seconds / 60).toFixed(2)
  return `${minutes} 分鐘`
}

// Handle row context menu
const handleRowContextMenu = (row, column, event) => {
  event.preventDefault()
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.meeting = row
}

// Hide context menu
const hideContextMenu = () => {
  contextMenu.visible = false
  contextMenu.meeting = null
}

// Handle edit
const handleEdit = () => {
  if (contextMenu.meeting) {
    emit('edit', contextMenu.meeting)
  }
  hideContextMenu()
}

// Handle delete
const handleDelete = () => {
  if (contextMenu.meeting) {
    emit('delete', contextMenu.meeting)
  }
  hideContextMenu()
}

// Document click handler
const handleDocumentClick = (event) => {
  if (!event.target.closest('.context-menu')) {
    hideContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.recurring-meeting-table {
  position: relative;
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 24px;
}

.time-text {
  font-family: 'Courier New', monospace;
  font-weight: 500;
}

.recurrence-text {
  font-size: 13px;
  color: #606266;
}

.duration-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;

  .duration-total {
    color: #303133;
    font-weight: 500;
  }

  .duration-avg {
    color: #909399;
  }
}

.no-data {
  color: #c0c4cc;
}

.name-cell {
  display: flex;
  align-items: center;
  width: 100%;

  .meeting-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stopwatch-icon {
    opacity: 0;
    margin-left: 8px;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s, filter 0.2s, transform 0.15s;
    flex-shrink: 0;
    user-select: none;

    &:hover {
      transform: scale(1.15);
    }

    &.disabled {
      filter: grayscale(1);
      cursor: not-allowed;

      &:hover {
        transform: none;
      }
    }
  }

  &:hover .stopwatch-icon {
    opacity: 1;
  }
}

.context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 120px;
  z-index: 1000;

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #303133;
    transition: background 0.15s;

    &:hover {
      background: #f5f7fa;
    }

    &.danger {
      color: #f56c6c;

      &:hover {
        background: #fef0f0;
      }
    }
  }
}
</style>
