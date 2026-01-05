<template>
  <div class="task-list-page">
    <div class="left-panel">
      <!-- Edit mode hint -->
      <div v-if="editingRowId !== null || editingCell !== null" class="edit-hint">
        按 Enter 儲存，按 Escape 取消
      </div>

      <BounceLoading v-if="!isReady" />
      <CardTable
        v-else
        :columns="columns"
        :data="allTasks"
        empty-text="尚無任務"
        @row-contextmenu="handleRowContextMenu"
        @cell-dblclick="handleCellDblClick"
      >
        <!-- Type column -->
        <template #type="{ row }">
          <el-tag :type="row.typeColor" size="small">
            {{ row.typeLabel }}
          </el-tag>
        </template>

        <!-- Title column -->
        <template #title="{ row }">
          <div class="task-name-cell">
            <!-- Edit mode -->
            <template v-if="isCellEditing(row.id, 'title')">
              <el-input
                v-model="editingRowData.title"
                @keyup.enter="saveEdit"
                @keyup.escape="cancelEdit"
              />
            </template>
            <!-- Normal mode -->
            <template v-else>
              <span class="task-title">{{ row.title }}</span>
              <span
                class="pomodoro-icon"
                :class="{ disabled: hasExistingTask }"
                @click.stop="startPomodoro(row)"
              >
                🍅
              </span>
            </template>
          </div>
        </template>

        <!-- Status column -->
        <template #status="{ row }">
          <!-- Edit mode (simple task only) -->
          <template v-if="isCellEditing(row.id, 'status') && row.taskType === 'simple'">
            <el-select
              v-model="editingRowData.status"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            >
              <el-option v-for="option in statusOptions" :key="option" :label="option" :value="option" />
            </el-select>
          </template>
          <!-- Normal mode -->
          <template v-else>
            <span :class="['status-tag', getStatusClass(row.status)]">
              {{ row.status }}
            </span>
          </template>
        </template>

        <!-- Resource group column -->
        <template #resourceGroup="{ row }">
          <!-- Edit mode -->
          <template v-if="isCellEditing(row.id, 'resourceGroup')">
            <el-select
              v-model="editingRowData.resourceGroup"
              style="width: 100%"
              clearable
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            >
              <el-option v-for="option in resourceGroupOptions" :key="option" :label="option" :value="option" />
            </el-select>
          </template>
          <!-- Normal mode -->
          <template v-else>
            <span class="resource-group-text">{{ row.resourceGroup || '-' }}</span>
          </template>
        </template>
      </CardTable>

      <!-- Context menu -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <!-- Pause/Resume for routine tasks only (first position) -->
        <template v-if="contextMenu.row?.taskType === 'routine'">
          <div
            v-if="contextMenu.row?.routineTask?.is_active"
            class="context-menu-item"
            @click="handleToggleRoutineActive(false)"
          >
            <el-icon><VideoPause /></el-icon>
            <span>暫停例行任務</span>
          </div>
          <div
            v-else
            class="context-menu-item"
            @click="handleToggleRoutineActive(true)"
          >
            <el-icon><VideoPlay /></el-icon>
            <span>恢復例行任務</span>
          </div>
        </template>
        <!-- Execute now for scheduled tasks -->
        <div
          v-if="contextMenu.row?.taskType === 'scheduled'"
          class="context-menu-item"
          @click="handleExecuteNow"
        >
          <el-icon><VideoPlay /></el-icon>
          <span>立即執行</span>
        </div>
        <div class="context-menu-item" @click="handleContextEdit">
          <el-icon><Edit /></el-icon>
          <span>編輯</span>
        </div>
        <div class="context-menu-item danger" @click="handleContextDelete">
          <el-icon><Delete /></el-icon>
          <span>刪除</span>
        </div>
      </div>
    </div>

    <div class="right-panel">
      <NewTaskForm @task-created="handleTaskCreated" @routine-task-created="handleRoutineTaskCreated" />
    </div>

    <!-- Routine Task Edit Dialog -->
    <el-dialog
      v-model="routineEditDialog.visible"
      title="編輯例行任務"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="routineEditDialog.form" label-position="top">
        <el-form-item label="任務名稱" required>
          <el-input
            v-model="routineEditDialog.form.title"
            placeholder="請輸入任務名稱"
            :maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="資源分群">
          <el-select
            v-model="routineEditDialog.form.resource_group_id"
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

        <RecurrenceRuleEditor v-model="routineEditDialog.recurrenceRule" />
      </el-form>

      <template #footer>
        <el-button @click="routineEditDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveRoutineEdit" :loading="routineEditDialog.saving">
          儲存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import CardTable from '../components/CardTable.vue'
import BounceLoading from '../components/BounceLoading.vue'
import NewTaskForm from '../components/NewTaskForm.vue'
import RecurrenceRuleEditor from '../components/RecurrenceRuleEditor.vue'
import { getSimpleTasks, updateSimpleTask, deleteSimpleTask } from '../api/simpleTasks'
import { getResourceGroups } from '../api/resourceGroups'
import { usePomodoroStore } from '../stores/pomodoro'
import { useRoutineTasksStore } from '../stores/routineTasks'

const router = useRouter()
const pomodoroStore = usePomodoroStore()
const routineTasksStore = useRoutineTasksStore()

// Minimum loading time
const MIN_LOADING_TIME = 500

// Component state
const isActive = ref(true)
const isReady = ref(false)

// Data
const simpleTasks = ref([])
const resourceGroups = ref([])

// Column definitions
const columns = [
  { prop: 'type', label: '類型', width: '80px' },
  { prop: 'title', label: '任務名稱', flex: 1 },
  { prop: 'status', label: '任務狀態', width: '120px', align: 'center' },
  { prop: 'resourceGroup', label: '資源分群', width: '150px', align: 'center' },
]

// 判斷任務是否為未到時間的預定任務
const isScheduledPending = (task) => {
  if (!task.scheduled_at) return false
  return new Date(task.scheduled_at) > new Date()
}

// Merged task list
const allTasks = computed(() => {
  if (!isActive.value) return []

  // Routine task instances (from today)
  const routineItems = (routineTasksStore.todayInstances || []).map(inst => {
    const routineTask = inst.routine_task
    const isActive = routineTask?.is_active ?? true

    // 判斷是否為預定的例行任務（scheduled_at 存在且在未來）
    const isScheduledRoutine = inst.scheduled_at && new Date(inst.scheduled_at) > new Date()

    return {
      id: `routine-${inst.id}`,
      originalId: inst.id,
      title: routineTask?.title || '',
      status: isActive ? '循環中' : '已暫停',
      resourceGroup: getResourceGroupName(routineTask?.resource_group_id),
      resource_group_id: routineTask?.resource_group_id,
      taskType: isScheduledRoutine ? 'scheduled' : 'routine',
      typeLabel: isScheduledRoutine ? '預定' : '例行',
      typeColor: isScheduledRoutine ? 'warning' : 'primary',
      routineInstance: inst,
      routineTask: routineTask,
      isScheduledRoutine,
    }
  })

  // Simple tasks (including scheduled tasks)
  const simpleItems = simpleTasks.value.map(task => {
    const isPending = isScheduledPending(task)
    return {
      ...task,
      resourceGroup: getResourceGroupName(task.resource_group_id),
      taskType: isPending ? 'scheduled' : 'simple',
      typeLabel: isPending ? '預定' : '一般',
      typeColor: isPending ? 'warning' : 'success',
      isScheduledPending: isPending,
    }
  })

  // Sort: routine → regular (non-pending scheduled) → pending scheduled
  const regularItems = simpleItems.filter(t => !t.isScheduledPending)
  const scheduledPendingItems = simpleItems.filter(t => t.isScheduledPending)

  return [...routineItems, ...regularItems, ...scheduledPendingItems]
})

// Status options for simple tasks
const statusOptions = ['待處理', '進行中', '擱置中', '已完成', '已交接', '已封存', '已取消']

// Resource group options
const resourceGroupOptions = computed(() => resourceGroups.value.map(g => g.name))

// Check if there's an existing pomodoro task
const hasExistingTask = computed(() => pomodoroStore.hasTask)

// Edit state
const editingRowId = ref(null) // Row ID for row edit mode (context menu)
const editingCell = ref(null) // { rowId, prop } for single cell edit mode (dblclick)
const editingRowData = reactive({
  title: '',
  status: '',
  resourceGroup: '',
})

// Check if a cell is in edit mode
const isCellEditing = (rowId, prop) => {
  // Row edit mode: all editable cells are in edit mode
  if (editingRowId.value === rowId) {
    return ['title', 'status', 'resourceGroup'].includes(prop)
  }
  // Single cell edit mode
  if (editingCell.value && editingCell.value.rowId === rowId && editingCell.value.prop === prop) {
    return true
  }
  return false
}

// Context menu state
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null,
})

// Routine task edit dialog
const routineEditDialog = reactive({
  visible: false,
  saving: false,
  taskId: null,
  form: {
    title: '',
    resource_group_id: null,
  },
  recurrenceRule: { frequency: 'daily' },
})

// Get resource group name by ID
const getResourceGroupName = (id) => {
  if (!id) return ''
  const group = resourceGroups.value.find(g => g.id === id)
  return group ? group.name : ''
}

// Status CSS class
const getStatusClass = (status) => {
  const classMap = {
    '待處理': 'status-pending',
    '進行中': 'status-in-progress',
    '擱置中': 'status-on-hold',
    '已完成': 'status-completed',
    '已交接': 'status-transferred',
    '已封存': 'status-archived',
    '已取消': 'status-cancelled',
    '循環中': 'status-recurring',
    '已暫停': 'status-paused',
  }
  return classMap[status] || 'status-pending'
}

// Load data
const loadResourceGroups = async () => {
  try {
    const response = await getResourceGroups()
    resourceGroups.value = response.data.resource_groups
  } catch (error) {
    console.error('Failed to load resource groups:', error)
  }
}

const loadSimpleTasks = async () => {
  try {
    const response = await getSimpleTasks()
    simpleTasks.value = response.data.tasks
  } catch (error) {
    console.error('Failed to load tasks:', error)
  }
}

const refresh = async () => {
  isReady.value = false
  const startTime = Date.now()

  await loadResourceGroups()
  await Promise.all([
    loadSimpleTasks(),
    routineTasksStore.fetchTodayInstances(),
  ])

  const elapsed = Date.now() - startTime
  if (elapsed < MIN_LOADING_TIME) {
    await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
  }

  isReady.value = true
}

// Handle new task created
const handleTaskCreated = (newTask) => {
  simpleTasks.value.unshift(newTask)
}

const handleRoutineTaskCreated = () => {
  // Store auto-updates
}

// Start pomodoro
const startPomodoro = (row) => {
  if (pomodoroStore.hasTask) {
    ElMessage.warning('已有進行中的任務，請先完成或取消')
    return
  }

  if (row.taskType === 'routine') {
    pomodoroStore.setCurrentTask({
      id: row.originalId,
      title: row.title,
      resource_group_id: row.resource_group_id,
      taskType: 'routine',
      routineInstanceId: row.originalId,
    })
  } else {
    pomodoroStore.setCurrentTask(row)
  }
  router.push('/history')
}

// Handle cell double-click
const handleCellDblClick = (row, prop, event) => {
  // Skip if type column (not editable)
  if (prop === 'type') return

  // For routine tasks, status is not editable (it's derived from is_active)
  if (row.taskType === 'routine' && prop === 'status') return

  startCellEdit(row, prop)
}

// Start row edit mode (from context menu)
const startRowEdit = (row) => {
  editingRowId.value = row.id
  editingCell.value = null
  editingRowData.title = row.title
  editingRowData.status = row.status
  editingRowData.resourceGroup = row.resourceGroup
}

// Start single cell edit mode (from dblclick)
const startCellEdit = (row, prop) => {
  editingCell.value = { rowId: row.id, prop }
  editingRowId.value = null
  editingRowData.title = row.title
  editingRowData.status = row.status
  editingRowData.resourceGroup = row.resourceGroup
}

// Save edit
const saveEdit = async () => {
  const rowId = editingRowId.value || editingCell.value?.rowId
  if (!rowId) return

  const row = allTasks.value.find(t => t.id === rowId)
  if (!row) {
    cancelEdit()
    return
  }

  // Validate title is not empty
  if (editingRowId.value || editingCell.value?.prop === 'title') {
    if (!editingRowData.title || !editingRowData.title.trim()) {
      ElMessage.warning('任務名稱不能為空')
      return
    }
  }

  if (row.taskType === 'simple') {
    const simpleTask = simpleTasks.value.find(t => t.id === row.id)
    if (simpleTask) {
      const updatedData = {}

      if (editingRowId.value || editingCell.value?.prop === 'title') {
        if (editingRowData.title.trim() !== simpleTask.title) {
          updatedData.title = editingRowData.title.trim()
        }
      }
      if (editingRowId.value || editingCell.value?.prop === 'status') {
        if (editingRowData.status !== simpleTask.status) {
          updatedData.status = editingRowData.status
        }
      }
      if (editingRowId.value || editingCell.value?.prop === 'resourceGroup') {
        const group = resourceGroups.value.find(g => g.name === editingRowData.resourceGroup)
        const newGroupId = group?.id || null
        if (newGroupId !== simpleTask.resource_group_id) {
          updatedData.resource_group_id = newGroupId
        }
      }

      if (Object.keys(updatedData).length === 0) {
        cancelEdit()
        return
      }

      try {
        await updateSimpleTask(simpleTask.id, updatedData)
        if (updatedData.title !== undefined) simpleTask.title = updatedData.title
        if (updatedData.status !== undefined) simpleTask.status = updatedData.status
        if (updatedData.resource_group_id !== undefined) simpleTask.resource_group_id = updatedData.resource_group_id
        ElMessage.success('已儲存')
      } catch (error) {
        console.error('Failed to update task:', error)
        ElMessage.error('儲存失敗')
      }
    }
  } else if (row.taskType === 'routine') {
    const routineTask = row.routineTask
    if (routineTask) {
      const updatedData = {}

      if (editingRowId.value || editingCell.value?.prop === 'title') {
        if (editingRowData.title.trim() !== routineTask.title) {
          updatedData.title = editingRowData.title.trim()
        }
      }
      if (editingRowId.value || editingCell.value?.prop === 'resourceGroup') {
        const group = resourceGroups.value.find(g => g.name === editingRowData.resourceGroup)
        const newGroupId = group?.id || null
        if (newGroupId !== routineTask.resource_group_id) {
          updatedData.resource_group_id = newGroupId
        }
      }

      if (Object.keys(updatedData).length === 0) {
        cancelEdit()
        return
      }

      try {
        await routineTasksStore.updateRoutineTask(routineTask.id, {
          ...routineTask,
          ...updatedData,
        })
        ElMessage.success('已儲存')
      } catch (error) {
        console.error('Failed to update routine task:', error)
        ElMessage.error('儲存失敗')
      }
    }
  }

  cancelEdit()
}

// Cancel edit
const cancelEdit = () => {
  editingRowId.value = null
  editingCell.value = null
  editingRowData.title = ''
  editingRowData.status = ''
  editingRowData.resourceGroup = ''
}

// Context menu
const handleRowContextMenu = (row, event) => {
  if (editingRowId.value !== null || editingCell.value !== null) return

  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.row = row
}

const hideContextMenu = () => {
  contextMenu.visible = false
  contextMenu.row = null
}

const handleDocumentClick = (event) => {
  if (!event.target.closest('.context-menu')) {
    hideContextMenu()
  }
}

// Context menu: Edit
const handleContextEdit = () => {
  if (!contextMenu.row) return

  if (contextMenu.row.taskType === 'routine') {
    const routineTask = contextMenu.row.routineTask
    if (routineTask) {
      routineEditDialog.taskId = routineTask.id
      routineEditDialog.form = {
        title: routineTask.title,
        resource_group_id: routineTask.resource_group_id,
      }
      routineEditDialog.recurrenceRule = routineTask.recurrence_rule || { frequency: 'daily' }
      routineEditDialog.visible = true
    }
  } else {
    startRowEdit(contextMenu.row)
  }
  hideContextMenu()
}

// Context menu: Toggle routine active
const handleToggleRoutineActive = async (active) => {
  if (!contextMenu.row?.routineTask) return

  try {
    const routineTask = contextMenu.row.routineTask
    await routineTasksStore.updateRoutineTask(routineTask.id, {
      ...routineTask,
      is_active: active,
    })
    ElMessage.success(active ? '已恢復例行任務' : '已暫停例行任務')
  } catch (error) {
    console.error('Failed to toggle routine task:', error)
    ElMessage.error('操作失敗')
  }
  hideContextMenu()
}

// Context menu: Execute now (for scheduled tasks)
const handleExecuteNow = async () => {
  if (!contextMenu.row || contextMenu.row.taskType !== 'scheduled') return

  try {
    // 判斷是預定的例行任務還是一般預定任務
    if (contextMenu.row.isScheduledRoutine) {
      // 例行任務的立即執行
      const instanceId = contextMenu.row.originalId
      await routineTasksStore.executeInstanceNow(instanceId)
      ElMessage.success('任務已可立即執行')
    } else {
      // 一般預定任務的立即執行
      const taskId = contextMenu.row.id
      await updateSimpleTask(taskId, { scheduled_at: null })

      // Update local state
      const task = simpleTasks.value.find(t => t.id === taskId)
      if (task) {
        task.scheduled_at = null
      }

      ElMessage.success('任務已轉為一般任務')
    }
  } catch (error) {
    console.error('Failed to execute now:', error)
    ElMessage.error('操作失敗')
  }
  hideContextMenu()
}

// Context menu: Delete
const handleContextDelete = async () => {
  if (!contextMenu.row) return

  // 使用 routineTask 存在與否來判斷是否為例行任務（包含預定的例行任務）
  const isRoutine = !!contextMenu.row.routineTask
  const dialogTitle = isRoutine ? '刪除例行任務' : '刪除任務'
  const dialogMessage = isRoutine
    ? `確定要刪除例行任務「${contextMenu.row.title}」嗎？這將會刪除此任務的所有未來排程。`
    : `確定要刪除「${contextMenu.row.title}」嗎？`

  try {
    await ElMessageBox.confirm(dialogMessage, dialogTitle, {
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消',
      type: 'warning',
    })

    if (isRoutine) {
      const routineTaskId = contextMenu.row.routineTask?.id
      if (routineTaskId) {
        await routineTasksStore.deleteRoutineTask(routineTaskId)
        ElMessage.success('例行任務已刪除')
      }
    } else {
      await deleteSimpleTask(contextMenu.row.id)
      const index = simpleTasks.value.findIndex(t => t.id === contextMenu.row.id)
      if (index !== -1) {
        simpleTasks.value.splice(index, 1)
      }
      ElMessage.success('已刪除')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete task:', error)
      ElMessage.error('刪除失敗')
    }
  }
  hideContextMenu()
}

// Save routine edit dialog
const saveRoutineEdit = async () => {
  if (!routineEditDialog.form.title?.trim()) {
    ElMessage.warning('請輸入任務名稱')
    return
  }

  const rule = routineEditDialog.recurrenceRule
  if (rule.frequency === 'weekly' && (!rule.byweekday || rule.byweekday.length === 0)) {
    ElMessage.warning('請選擇至少一個星期')
    return
  }
  if ((rule.frequency === 'monthly' || rule.frequency === 'yearly') &&
      (!rule.bymonthday || rule.bymonthday.length === 0) &&
      (!rule.byweekday || rule.byweekday.length === 0)) {
    ElMessage.warning('請選擇日期或星期')
    return
  }
  if (rule.frequency === 'yearly' && (!rule.bymonth || rule.bymonth.length === 0)) {
    ElMessage.warning('請選擇至少一個月份')
    return
  }

  routineEditDialog.saving = true

  try {
    await routineTasksStore.updateRoutineTask(routineEditDialog.taskId, {
      title: routineEditDialog.form.title.trim(),
      resource_group_id: routineEditDialog.form.resource_group_id || null,
      recurrence_rule: routineEditDialog.recurrenceRule,
      is_active: true,
    })
    ElMessage.success('更新成功')
    routineEditDialog.visible = false
  } catch (error) {
    console.error('Failed to update routine task:', error)
    ElMessage.error('更新失敗')
  } finally {
    routineEditDialog.saving = false
  }
}

// Keyboard handler
const handleKeyDown = (event) => {
  if (editingRowId.value !== null || editingCell.value !== null) {
    if (event.key === 'Escape') {
      cancelEdit()
    }
  }
}

onMounted(() => {
  refresh()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  isActive.value = false
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeyDown)
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
    position: relative;
  }

  .right-panel {
    flex: 1;
    min-width: 0;
  }
}

.edit-hint {
  background: #409eff;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 8px;
  display: inline-block;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

.task-name-cell {
  display: flex;
  align-items: center;
  width: 100%;

  .task-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pomodoro-icon {
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
}

:deep(.card-table-row):hover .pomodoro-icon {
  opacity: 1;
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  user-select: none;

  &.status-pending {
    background-color: #e5e7eb;
    color: #4b5563;
  }

  &.status-in-progress {
    background-color: #dbeafe;
    color: #1e40af;
  }

  &.status-on-hold {
    background-color: #fed7aa;
    color: #c2410c;
  }

  &.status-completed {
    background-color: #d1fae5;
    color: #065f46;
  }

  &.status-transferred {
    background-color: #e9d5ff;
    color: #7c3aed;
  }

  &.status-archived {
    background-color: #f3f4f6;
    color: #6b7280;
  }

  &.status-cancelled {
    background-color: #fafafa;
    color: #9ca3af;
  }

  &.status-recurring {
    background-color: #e0f2fe;
    color: #0369a1;
  }

  &.status-paused {
    background-color: #fef3c7;
    color: #92400e;
  }
}

.resource-group-text {
  color: #606266;
  font-size: 13px;
}

.context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px 0;
  min-width: 140px;
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

.recurrence-rule-editor {
  margin-bottom: 16px;
}
</style>
