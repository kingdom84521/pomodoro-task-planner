<template>
  <div class="today-routine-list">
    <div class="section-header">
      <div class="header-left">
        <span class="section-icon">📌</span>
        <h3 class="section-title">今日例行</h3>
        <span class="progress-badge">{{ progress.completed }}/{{ progress.total }} 已完成</span>
      </div>
      <router-link to="/tasks" class="manage-link">
        管理 →
      </router-link>
    </div>

    <div class="list-content">
      <BounceLoading v-if="loading" />
      <div v-else-if="instances.length === 0" class="empty-state">
        今日無例行任務
      </div>
      <DataTable v-else :data="instances">
        <el-table-column width="50" align="center">
          <template #default="{ row }">
            <el-checkbox
              :model-value="row.status === 'completed'"
              @change="toggleComplete(row)"
            />
          </template>
        </el-table-column>

        <el-table-column prop="routine_task.title" label="名稱" min-width="150">
          <template #default="{ row }">
            <span :class="{ 'completed-text': row.status === 'completed' }">
              {{ row.routine_task?.title }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="資源分群" min-width="100" align="center">
          <template #default="{ row }">
            <span class="resource-tag">
              {{ getResourceGroupName(row.routine_task?.resource_group_id) || '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="週期" min-width="120" align="center">
          <template #default="{ row }">
            <span class="recurrence-text">
              {{ formatRecurrence(row.routine_task?.recurrence_rule) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column width="60" align="center">
          <template #default="{ row }">
            <span
              v-if="row.status !== 'completed'"
              class="pomodoro-icon"
              :class="{ 'disabled': hasExistingTask }"
              @click="startPomodoro(row)"
            >
              🍅
            </span>
          </template>
        </el-table-column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import DataTable from './DataTable.vue'
import BounceLoading from './BounceLoading.vue'
import { useRoutineTasksStore } from '../stores/routineTasks'
import { usePomodoroStore } from '../stores/pomodoro'
import { getResourceGroups } from '../api/resourceGroups'
import { ref } from 'vue'

const router = useRouter()
const routineTasksStore = useRoutineTasksStore()
const pomodoroStore = usePomodoroStore()

const resourceGroups = ref([])

// Loading state
const loading = computed(() => routineTasksStore.loadingToday)

// Today's instances
const instances = computed(() => routineTasksStore.todayInstances || [])

// Progress
const progress = computed(() => routineTasksStore.todayProgress || { completed: 0, total: 0 })

// Has existing task in pomodoro
const hasExistingTask = computed(() => pomodoroStore.hasTask)

// Load resource groups
const loadResourceGroups = async () => {
  try {
    const response = await getResourceGroups()
    resourceGroups.value = response.data.resource_groups
  } catch (error) {
    console.error('Failed to load resource groups:', error)
  }
}

// Get resource group name by ID
const getResourceGroupName = (id) => {
  if (!id) return ''
  const group = resourceGroups.value.find(g => g.id === id)
  return group ? group.name : ''
}

// Format recurrence rule for display
const formatRecurrence = (rule) => {
  if (!rule) return '-'

  const { frequency, daysOfWeek, weekFilter, interval } = rule
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']

  switch (frequency) {
    case 'daily':
      return '每天'
    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const days = daysOfWeek.map(d => dayNames[d]).join('')
        let prefix = ''
        if (weekFilter?.type === 'odd') prefix = '奇數週'
        else if (weekFilter?.type === 'even') prefix = '偶數週'
        return `${prefix}週${days}`
      }
      return '每週'
    case 'interval':
      return `每 ${interval || 1} 天`
    default:
      return '-'
  }
}

// Toggle complete status
const toggleComplete = async (instance) => {
  try {
    if (instance.status === 'completed') {
      await routineTasksStore.uncompleteInstance(instance.id)
    } else {
      await routineTasksStore.completeInstance(instance.id)
    }
  } catch (error) {
    console.error('Failed to toggle complete:', error)
    ElMessage.error('操作失敗')
  }
}

// Start pomodoro for this task
const startPomodoro = (instance) => {
  if (hasExistingTask.value) {
    ElMessage.warning('已有進行中的任務，請先完成或取消')
    return
  }

  const task = {
    id: `routine_${instance.id}`,
    title: instance.routine_task?.title,
    resource_group_id: instance.routine_task?.resource_group_id,
    resourceGroup: getResourceGroupName(instance.routine_task?.resource_group_id),
    status: '進行中',
    isRoutine: true,
    routineInstanceId: instance.id,
  }

  pomodoroStore.setCurrentTask(task)
  router.push('/history')
}

onMounted(async () => {
  await Promise.all([
    routineTasksStore.fetchTodayInstances(),
    loadResourceGroups(),
  ])
})
</script>

<style scoped>
.today-routine-list {
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

  .progress-badge {
    background: #f0f9eb;
    color: #67c23a;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 12px;
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

.completed-text {
  text-decoration: line-through;
  color: #909399;
}

.resource-tag {
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.recurrence-text {
  font-size: 12px;
  color: #909399;
}

.pomodoro-icon {
  cursor: pointer;
  font-size: 16px;
  transition: transform 0.15s;

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
</style>
