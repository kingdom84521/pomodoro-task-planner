<template>
  <div class="routine-task-table">
    <BounceLoading v-if="loading" />
    <div v-else-if="routineTasks.length === 0" class="empty-state">
      尚無例行任務
    </div>
    <DataTable v-else :data="routineTasks" @row-contextmenu="handleRowContextMenu">
      <el-table-column prop="title" label="名稱" min-width="150" />

      <el-table-column label="資源分群" min-width="100" align="center">
        <template #default="{ row }">
          <span class="resource-tag">
            {{ getResourceGroupName(row.resource_group_id) || '-' }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="週期" min-width="120" align="center">
        <template #default="{ row }">
          <span class="recurrence-text">
            {{ formatRecurrence(row.recurrence_rule) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="is_active" label="啟用" width="80" align="center">
        <template #default="{ row }">
          <el-switch
            v-model="row.is_active"
            @change="handleActiveChange(row)"
          />
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

    <!-- Edit Dialog -->
    <el-dialog
      v-model="editDialog.visible"
      title="編輯例行任務"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="editDialog.form" label-position="top">
        <el-form-item label="任務名稱" required>
          <el-input
            v-model="editDialog.form.title"
            placeholder="請輸入任務名稱"
            :maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="資源分群">
          <el-select
            v-model="editDialog.form.resource_group_id"
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

        <div class="recurrence-section">
          <el-form-item label="週期類型">
            <el-radio-group v-model="editDialog.form.frequency">
              <el-radio label="daily">每天</el-radio>
              <el-radio label="weekly">每週</el-radio>
              <el-radio label="interval">每 N 天</el-radio>
              <el-radio label="advanced">進階</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item
            v-if="editDialog.form.frequency === 'weekly' || editDialog.form.frequency === 'advanced'"
            label="星期"
          >
            <el-checkbox-group v-model="editDialog.form.daysOfWeek">
              <el-checkbox :label="1">一</el-checkbox>
              <el-checkbox :label="2">二</el-checkbox>
              <el-checkbox :label="3">三</el-checkbox>
              <el-checkbox :label="4">四</el-checkbox>
              <el-checkbox :label="5">五</el-checkbox>
              <el-checkbox :label="6">六</el-checkbox>
              <el-checkbox :label="0">日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item v-if="editDialog.form.frequency === 'interval'" label="間隔天數">
            <el-input-number
              v-model="editDialog.form.interval"
              :min="1"
              :max="365"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item v-if="editDialog.form.frequency === 'advanced'" label="週數篩選">
            <el-radio-group v-model="editDialog.form.weekFilterType">
              <el-radio label="all">全部</el-radio>
              <el-radio label="odd">奇數週</el-radio>
              <el-radio label="even">偶數週</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>

        <el-form-item label="啟用狀態">
          <el-switch v-model="editDialog.form.is_active" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="editDialog.saving">
          儲存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import DataTable from './DataTable.vue'
import BounceLoading from './BounceLoading.vue'
import { useRoutineTasksStore } from '../stores/routineTasks'
import { getResourceGroups } from '../api/resourceGroups'

const routineTasksStore = useRoutineTasksStore()
const resourceGroups = ref([])

// Loading state
const loading = computed(() => routineTasksStore.loading)

// Routine tasks (with safeguard for undefined)
const routineTasks = computed(() => routineTasksStore.routineTasks || [])

// Context menu state
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  task: null,
})

// Edit dialog state
const editDialog = reactive({
  visible: false,
  saving: false,
  taskId: null,
  form: {
    title: '',
    resource_group_id: null,
    frequency: 'daily',
    daysOfWeek: [],
    interval: 1,
    weekFilterType: 'all',
    is_active: true,
  },
})

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

// Parse recurrence rule to form data
const parseRecurrenceToForm = (rule) => {
  if (!rule) {
    return {
      frequency: 'daily',
      daysOfWeek: [],
      interval: 1,
      weekFilterType: 'all',
    }
  }

  const { frequency, daysOfWeek, weekFilter, interval } = rule

  // Determine if it's advanced mode
  const hasWeekFilter = weekFilter && weekFilter.type !== 'all'
  const isAdvanced = hasWeekFilter

  return {
    frequency: isAdvanced ? 'advanced' : frequency,
    daysOfWeek: daysOfWeek || [],
    interval: interval || 1,
    weekFilterType: weekFilter?.type || 'all',
  }
}

// Build recurrence rule from form data
const buildRecurrenceRule = () => {
  const { frequency, daysOfWeek, interval, weekFilterType } = editDialog.form

  const rule = {
    frequency: frequency === 'advanced' ? 'weekly' : frequency,
  }

  if (frequency === 'weekly' || frequency === 'advanced') {
    if (daysOfWeek.length > 0) {
      rule.daysOfWeek = [...daysOfWeek].sort((a, b) => a - b)
    }
  }

  if (frequency === 'interval') {
    rule.interval = interval
  }

  if (frequency === 'advanced' && weekFilterType !== 'all') {
    rule.weekFilter = {
      type: weekFilterType,
    }
  }

  return rule
}

// Handle active switch change
const handleActiveChange = async (task) => {
  try {
    await routineTasksStore.updateRoutineTask(task.id, {
      ...task,
    })
    ElMessage.success(task.is_active ? '已啟用' : '已停用')
  } catch (error) {
    console.error('Failed to update task:', error)
    ElMessage.error('更新失敗')
    // Revert the switch
    task.is_active = !task.is_active
  }
}

// Handle row context menu
const handleRowContextMenu = (row, column, event) => {
  event.preventDefault()
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.task = row
}

// Hide context menu
const hideContextMenu = () => {
  contextMenu.visible = false
  contextMenu.task = null
}

// Handle edit
const handleEdit = () => {
  if (contextMenu.task) {
    const task = contextMenu.task
    const recurrenceForm = parseRecurrenceToForm(task.recurrence_rule)

    editDialog.taskId = task.id
    editDialog.form = {
      title: task.title,
      resource_group_id: task.resource_group_id,
      ...recurrenceForm,
      is_active: task.is_active,
    }
    editDialog.visible = true
  }
  hideContextMenu()
}

// Save edit
const saveEdit = async () => {
  // Validate
  if (!editDialog.form.title || !editDialog.form.title.trim()) {
    ElMessage.warning('請輸入任務名稱')
    return
  }

  if ((editDialog.form.frequency === 'weekly' || editDialog.form.frequency === 'advanced') &&
      editDialog.form.daysOfWeek.length === 0) {
    ElMessage.warning('請選擇至少一個星期')
    return
  }

  editDialog.saving = true

  try {
    const updateData = {
      title: editDialog.form.title.trim(),
      resource_group_id: editDialog.form.resource_group_id || null,
      recurrence_rule: buildRecurrenceRule(),
      is_active: editDialog.form.is_active,
    }

    await routineTasksStore.updateRoutineTask(editDialog.taskId, updateData)
    ElMessage.success('更新成功')
    editDialog.visible = false
  } catch (error) {
    console.error('Failed to update task:', error)
    ElMessage.error('更新失敗')
  } finally {
    editDialog.saving = false
  }
}

// Handle delete
const handleDelete = async () => {
  if (!contextMenu.task) return

  try {
    await ElMessageBox.confirm(
      `確定要刪除「${contextMenu.task.title}」嗎？`,
      '刪除例行任務',
      {
        confirmButtonText: '確定刪除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await routineTasksStore.deleteRoutineTask(contextMenu.task.id)
    ElMessage.success('已刪除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete task:', error)
      ElMessage.error('刪除失敗')
    }
  }

  hideContextMenu()
}

// Document click handler
const handleDocumentClick = (event) => {
  if (!event.target.closest('.context-menu')) {
    hideContextMenu()
  }
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  await Promise.all([
    routineTasksStore.fetchRoutineTasks(),
    loadResourceGroups(),
  ])
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.routine-task-table {
  position: relative;
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 24px;
}

.resource-tag {
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
}

.recurrence-text {
  font-size: 13px;
  color: #606266;
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
