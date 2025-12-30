<template>
  <div class="task-list-page">
    <div class="left-panel">
      <el-collapse v-model="activeCollapse">
        <!-- 全部任務區（預設展開，放上面） -->
        <el-collapse-item name="tasks" class="collapse-card">
          <template #title>
            <div class="collapse-header">
              <span class="collapse-icon">📋</span>
              <span class="collapse-title">全部任務</span>
              <el-badge
                :value="allTasksCount"
                :hidden="allTasksCount === 0"
                type="info"
                class="collapse-badge"
              />
            </div>
          </template>
          <TaskTable ref="taskTableRef" />
        </el-collapse-item>

        <!-- 例行任務區 -->
        <el-collapse-item name="routine" class="collapse-card">
          <template #title>
            <div class="collapse-header">
              <span class="collapse-icon">📌</span>
              <span class="collapse-title">例行任務</span>
              <el-badge
                :value="routineTasksCount"
                :hidden="routineTasksCount === 0"
                type="info"
                class="collapse-badge"
              />
            </div>
          </template>
          <RoutineTaskTable />
        </el-collapse-item>
      </el-collapse>
    </div>
    <div class="right-panel">
      <NewTaskForm @task-created="handleTaskCreated" @routine-task-created="handleRoutineTaskCreated" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TaskTable from '../components/TaskTable.vue'
import RoutineTaskTable from '../components/RoutineTaskTable.vue'
import NewTaskForm from '../components/NewTaskForm.vue'
import { useRoutineTasksStore } from '../stores/routineTasks'

const routineTasksStore = useRoutineTasksStore()

const taskTableRef = ref(null)

// Component active state (prevents updates during unmount)
const isActive = ref(true)

// 預設展開一般任務，收合例行任務
const activeCollapse = ref(['tasks'])

// 例行任務數量 (guarded to prevent updates during unmount)
const routineTasksCount = computed(() => {
  if (!isActive.value) return 0
  return (routineTasksStore.routineTasks || []).length
})

// 全部任務數量（一般任務 + 今日例行任務，從 TaskTable 取得）
const allTasksCount = computed(() => {
  if (!isActive.value) return 0
  return taskTableRef.value?.taskCount || 0
})

// 處理新增一般任務事件
const handleTaskCreated = (newTask) => {
  if (taskTableRef.value) {
    taskTableRef.value.addTask(newTask)
  }
}

// 處理新增例行任務事件
const handleRoutineTaskCreated = () => {
  // Store 會自動更新，不需要額外處理
}

// 載入例行任務
onMounted(async () => {
  await routineTasksStore.fetchRoutineTasks()
})

onBeforeUnmount(() => {
  isActive.value = false
})
</script>

<style scoped>
.task-list-page {
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
    overflow-y: auto;

    :deep(.el-collapse) {
      --el-collapse-header-height: 56px;
      --el-collapse-header-bg-color: #ffffff;
      --el-collapse-content-bg-color: #ffffff;
      border: none;
    }

    .collapse-card {
      margin-bottom: 16px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      padding: 0 20px;
    }
  }

  .right-panel {
    flex: 1;
    min-width: 0;
  }
}

.collapse-header {
  display: flex;
  align-items: center;
  gap: 8px;

  .collapse-icon {
    font-size: 18px;
  }

  .collapse-title {
    color: #303133;
  }

  .collapse-badge {
    --el-badge-font-size: 12px;
    margin-left: 4px;
  }
}
</style>
