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
          popper-class="d-flex"
        >
          <el-option
            v-for="group in resourceGroups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />

          <!-- 新增資源分群按鈕 -->
          <template #footer v-if="showAddGroupButton">
            <el-button
              text
              type="primary"
              class="add-group-button"
              @click.stop="navigateToResourceSettings"
            >
              + 新增自定義分群
            </el-button>
          </template>
        </el-select>
      </el-form-item>

      <!-- 任務類型選項 -->
      <el-form-item>
        <div class="task-type-options">
          <el-checkbox v-model="formData.isScheduled">
            預定任務
          </el-checkbox>
          <el-checkbox v-model="formData.isRoutine">
            例行任務
          </el-checkbox>
        </div>
      </el-form-item>

      <!-- 預定時間（一般預定任務：datetime；例行預定任務：time） -->
      <el-form-item v-if="formData.isScheduled && !formData.isRoutine" label="預定開始時間" required>
        <el-date-picker
          v-model="formData.scheduledAt"
          type="datetime"
          placeholder="選擇日期時間"
          style="width: 100%"
          :disabled-date="disabledDate"
          format="YYYY/MM/DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
      </el-form-item>

      <el-form-item v-if="formData.isScheduled && formData.isRoutine" label="開始日期時間" required>
        <el-date-picker
          v-model="formData.startsAt"
          type="datetime"
          placeholder="選擇開始日期時間"
          style="width: 100%"
          :disabled-date="disabledDate"
          format="YYYY/MM/DD HH:mm"
          value-format="YYYY-MM-DDTHH:mm:ss"
        />
      </el-form-item>

      <!-- 週期設定（勾選例行任務時顯示） -->
      <RecurrenceRuleEditor
        v-if="formData.isRoutine"
        v-model="recurrenceRule"
        class="recurrence-editor-spacing"
      />

      <el-form-item>
        <el-button
          type="primary"
          @click="handleSubmit"
          :loading="submitting"
          style="width: 100%"
        >
          {{ buttonText }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getResourceGroups } from '../api/resourceGroups'
import { createSimpleTask } from '../api/simpleTasks'
import { useRoutineTasksStore } from '../stores/routineTasks'
import RecurrenceRuleEditor from './RecurrenceRuleEditor.vue'

const router = useRouter()

const emit = defineEmits(['task-created', 'routine-task-created'])

const routineTasksStore = useRoutineTasksStore()

// localStorage keys
const STORAGE_KEY_FORM = 'newTaskForm:formData'
const STORAGE_KEY_RECURRENCE = 'newTaskForm:recurrenceRule'

// Load saved data from localStorage (synchronous to avoid flash)
const loadSavedFormData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FORM)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load saved form data:', e)
  }
  return { title: '', resource_group_id: null, isRoutine: false, isScheduled: false, scheduledAt: null, startsAt: null }
}

const loadSavedRecurrenceRule = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECURRENCE)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load saved recurrence rule:', e)
  }
  return { frequency: 'daily' }
}

// Recurrence rule (for routine tasks) - initialized from localStorage
const recurrenceRule = ref(loadSavedRecurrenceRule())

// 表單資料 - initialized from localStorage
const formData = ref(loadSavedFormData())

// 資源分群列表
const resourceGroups = ref([])

// 提交狀態
const submitting = ref(false)

// 計算資源分群總百分比
const totalPercentage = computed(() => {
  return resourceGroups.value.reduce((sum, group) => sum + group.percentage_limit, 0)
})

// 判斷是否顯示新增分群按鈕
const showAddGroupButton = computed(() => {
  return totalPercentage.value !== 100
})

// 按鈕文字
const buttonText = computed(() => {
  if (formData.value.isRoutine && formData.value.isScheduled) return '新增預定例行任務'
  if (formData.value.isRoutine) return '新增例行任務'
  if (formData.value.isScheduled) return '新增預定任務'
  return '新增任務'
})

// 禁用過去的日期
const disabledDate = (date) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}


// Watch and save form data to localStorage
watch(formData, (newValue) => {
  try {
    localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify(newValue))
  } catch (e) {
    console.error('Failed to save form data:', e)
  }
}, { deep: true })

watch(recurrenceRule, (newValue) => {
  try {
    localStorage.setItem(STORAGE_KEY_RECURRENCE, JSON.stringify(newValue))
  } catch (e) {
    console.error('Failed to save recurrence rule:', e)
  }
}, { deep: true })

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

// 跳轉到資源管理頁面
const navigateToResourceSettings = () => {
  router.push('/settings/resources')
}

// 重置表單 (also clears localStorage)
const resetForm = () => {
  formData.value = {
    title: '',
    resource_group_id: null,
    isRoutine: false,
    isScheduled: false,
    scheduledAt: null,
    startsAt: null,
  }
  recurrenceRule.value = { frequency: 'daily' }
  // Clear localStorage
  localStorage.removeItem(STORAGE_KEY_FORM)
  localStorage.removeItem(STORAGE_KEY_RECURRENCE)
}

// 提交表單
const handleSubmit = async () => {
  // 驗證
  if (!formData.value.title || !formData.value.title.trim()) {
    ElMessage.warning('請輸入任務名稱')
    return
  }

  // 驗證預定任務
  if (formData.value.isScheduled && !formData.value.isRoutine) {
    if (!formData.value.scheduledAt) {
      ElMessage.warning('請選擇預定開始時間')
      return
    }
    // 檢查時間是否為未來
    if (new Date(formData.value.scheduledAt) <= new Date()) {
      ElMessage.warning('預定時間必須是未來的時間')
      return
    }
  }

  // 驗證預定例行任務
  if (formData.value.isScheduled && formData.value.isRoutine) {
    if (!formData.value.startsAt) {
      ElMessage.warning('請選擇開始日期時間')
      return
    }
  }

  // 驗證例行任務的週期設定
  if (formData.value.isRoutine) {
    const rule = recurrenceRule.value
    // Check if weekly frequency requires at least one day selected
    if (rule.frequency === 'weekly' && (!rule.byweekday || rule.byweekday.length === 0)) {
      ElMessage.warning('請選擇至少一個星期')
      return
    }
    // Check if monthly/yearly requires at least one date or weekday
    if ((rule.frequency === 'monthly' || rule.frequency === 'yearly') &&
        (!rule.bymonthday || rule.bymonthday.length === 0) &&
        (!rule.byweekday || rule.byweekday.length === 0)) {
      ElMessage.warning('請選擇日期或星期')
      return
    }
    // Check if yearly requires at least one month
    if (rule.frequency === 'yearly' && (!rule.bymonth || rule.bymonth.length === 0)) {
      ElMessage.warning('請選擇至少一個月份')
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
        recurrence_rule: recurrenceRule.value,
        is_active: true,
      }

      // 如果也勾選了預定任務，加入 starts_at
      if (formData.value.isScheduled && formData.value.startsAt) {
        routineTaskData.starts_at = formData.value.startsAt
      }

      await routineTasksStore.createRoutineTask(routineTaskData)
      ElMessage.success(formData.value.isScheduled ? '新增預定例行任務成功' : '新增例行任務成功')
      emit('routine-task-created')
    } else {
      // 新增一般任務（含預定任務）
      const taskData = {
        title: formData.value.title.trim(),
        status: '待處理',
      }

      if (formData.value.resource_group_id) {
        taskData.resource_group_id = formData.value.resource_group_id
      }

      if (formData.value.isScheduled && formData.value.scheduledAt) {
        taskData.scheduled_at = formData.value.scheduledAt
      }

      const response = await createSimpleTask(taskData)
      const newTask = response.data.task

      ElMessage.success(formData.value.isScheduled ? '新增預定任務成功' : '新增任務成功')
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

  .task-type-options {
    display: flex;
    gap: 16px;
  }

  .recurrence-editor-spacing {
    margin-bottom: 18px;
  }

  :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }
}
</style>

<style>
.d-flex {
  .add-group-button {
    flex: 1;
    justify-content: center;
  }
}
</style>
