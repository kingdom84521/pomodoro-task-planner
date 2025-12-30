<template>
  <div class="new-task-form">
    <div class="form-header">
      <h3 class="form-title">新增任務</h3>
    </div>

    <el-form :model="formData" label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="任務名稱" required>
        <el-input
          v-model="formData.title"
          placeholder="請輸入任務名稱"
          :maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="資源分群">
        <el-select
          v-model="formData.resource_group_id"
          placeholder="請選擇資源分群（可選）"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="group in resourceGroups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>

      <!-- 例行任務選項 -->
      <el-form-item>
        <el-checkbox v-model="formData.isRoutine">
          設為例行任務
        </el-checkbox>
      </el-form-item>

      <!-- 週期設定（勾選例行任務時顯示） -->
      <div v-if="formData.isRoutine" class="recurrence-section">
        <el-form-item label="週期類型">
          <el-radio-group v-model="formData.frequency">
            <el-radio label="daily">每天</el-radio>
            <el-radio label="weekly">每週</el-radio>
            <el-radio label="interval">每 N 天</el-radio>
            <el-radio label="advanced">進階</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 每週：星期選擇 -->
        <el-form-item v-if="formData.frequency === 'weekly' || formData.frequency === 'advanced'" label="星期">
          <el-checkbox-group v-model="formData.daysOfWeek">
            <el-checkbox :label="1">一</el-checkbox>
            <el-checkbox :label="2">二</el-checkbox>
            <el-checkbox :label="3">三</el-checkbox>
            <el-checkbox :label="4">四</el-checkbox>
            <el-checkbox :label="5">五</el-checkbox>
            <el-checkbox :label="6">六</el-checkbox>
            <el-checkbox :label="0">日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 每 N 天：間隔輸入 -->
        <el-form-item v-if="formData.frequency === 'interval'" label="間隔天數">
          <el-input-number
            v-model="formData.interval"
            :min="1"
            :max="365"
            style="width: 100%"
          />
        </el-form-item>

        <!-- 進階：週數篩選 -->
        <el-form-item v-if="formData.frequency === 'advanced'" label="週數篩選">
          <el-radio-group v-model="formData.weekFilterType">
            <el-radio label="all">全部</el-radio>
            <el-radio label="odd">奇數週</el-radio>
            <el-radio label="even">偶數週</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <el-form-item>
        <el-button
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
          style="width: 100%"
        >
          {{ formData.isRoutine ? '新增例行任務' : '新增任務' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getResourceGroups } from '../api/resourceGroups'
import { createSimpleTask } from '../api/simpleTasks'
import { useRoutineTasksStore } from '../stores/routineTasks'

const emit = defineEmits(['task-created', 'routine-task-created'])

const routineTasksStore = useRoutineTasksStore()

// 表單資料
const formData = ref({
  title: '',
  resource_group_id: null,
  isRoutine: false,
  frequency: 'daily',
  daysOfWeek: [],
  interval: 1,
  weekFilterType: 'all',
})

// 資源分群列表
const resourceGroups = ref([])

// 提交狀態
const submitting = ref(false)

// 載入資源分群
const loadResourceGroups = async () => {
  try {
    const response = await getResourceGroups()
    resourceGroups.value = response.data.resource_groups
  } catch (error) {
    console.error('Failed to load resource groups:', error)
    ElMessage.error('載入資源分群失敗')
  }
}

// 建立週期規則
const buildRecurrenceRule = () => {
  const rule = {
    frequency: formData.value.frequency === 'advanced' ? 'weekly' : formData.value.frequency,
  }

  if (formData.value.frequency === 'weekly' || formData.value.frequency === 'advanced') {
    if (formData.value.daysOfWeek.length > 0) {
      rule.daysOfWeek = [...formData.value.daysOfWeek].sort((a, b) => a - b)
    }
  }

  if (formData.value.frequency === 'interval') {
    rule.interval = formData.value.interval
  }

  if (formData.value.frequency === 'advanced' && formData.value.weekFilterType !== 'all') {
    rule.weekFilter = {
      type: formData.value.weekFilterType,
    }
  }

  return rule
}

// 重置表單
const resetForm = () => {
  formData.value = {
    title: '',
    resource_group_id: null,
    isRoutine: false,
    frequency: 'daily',
    daysOfWeek: [],
    interval: 1,
    weekFilterType: 'all',
  }
}

// 提交表單
const handleSubmit = async () => {
  // 驗證
  if (!formData.value.title || !formData.value.title.trim()) {
    ElMessage.warning('請輸入任務名稱')
    return
  }

  // 驗證例行任務的週期設定
  if (formData.value.isRoutine) {
    if ((formData.value.frequency === 'weekly' || formData.value.frequency === 'advanced') &&
        formData.value.daysOfWeek.length === 0) {
      ElMessage.warning('請選擇至少一個星期')
      return
    }
  }

  submitting.value = true

  try {
    if (formData.value.isRoutine) {
      // 新增例行任務
      const routineTaskData = {
        title: formData.value.title.trim(),
        resource_group_id: formData.value.resource_group_id || null,
        recurrence_rule: buildRecurrenceRule(),
        is_active: true,
      }

      await routineTasksStore.createRoutineTask(routineTaskData)
      ElMessage.success('新增例行任務成功')
      emit('routine-task-created')
    } else {
      // 新增一般任務
      const taskData = {
        title: formData.value.title.trim(),
        status: '待處理',
      }

      if (formData.value.resource_group_id) {
        taskData.resource_group_id = formData.value.resource_group_id
      }

      const response = await createSimpleTask(taskData)
      const newTask = response.data.task

      ElMessage.success('新增任務成功')
      emit('task-created', newTask)
    }

    // 清空表單
    resetForm()
  } catch (error) {
    console.error('Failed to create task:', error)
    ElMessage.error(formData.value.isRoutine ? '新增例行任務失敗' : '新增任務失敗')
  } finally {
    submitting.value = false
  }
}

// 組件載入時獲取資源分群
onMounted(() => {
  loadResourceGroups()
})
</script>

<style scoped>
.new-task-form {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: fit-content;

  .form-header {
    margin-bottom: 20px;

    .form-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
    }
  }

  --el-text-color-regular: #606266;
}

.recurrence-section {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;

  :deep(.el-form-item) {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  :deep(.el-checkbox-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
