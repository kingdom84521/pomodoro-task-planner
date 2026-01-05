<template>
  <div class="today-routine-list">
    <div class="section-header">
      <span class="section-icon">📌</span>
      <h3 class="section-title">今日例行</h3>
    </div>

    <div class="list-content">
      <BounceLoading v-if="loading" />
      <div v-else-if="sortedInstances.length === 0" class="empty-state">
        今日無例行任務
      </div>
      <div v-else class="card-list">
        <div
          v-for="item in sortedInstances"
          :key="item.id"
          class="task-card"
          :class="item.status"
          @click="navigateToTasks"
        >
          <div class="card-content">
            <div class="card-title">{{ item.routine_task?.title }}</div>
            <div class="card-footer">
              <span class="card-status" :class="item.status">
                {{ item.status === 'completed' ? '已執行' : '未執行' }}
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
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BounceLoading from './BounceLoading.vue'
import { useRoutineTasksStore } from '../stores/routineTasks'

const router = useRouter()
const routineTasksStore = useRoutineTasksStore()

// Loading state
const loading = computed(() => routineTasksStore.loadingToday)

// Today's instances
const instances = computed(() => routineTasksStore.todayInstances || [])

// 排序：未執行的放前面
const sortedInstances = computed(() => {
  return [...instances.value].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return 0
  })
})

const navigateToTasks = () => {
  router.push('/tasks')
}

onMounted(() => {
  routineTasksStore.fetchTodayInstances()
})
</script>

<style scoped>
.today-routine-list {
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

.task-card {
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
