<template>
  <div class="task-table-panel">
    <!-- Edit mode hint -->
    <div v-if="editingRowIndex !== null" class="edit-hint">
      按 Enter 儲存，按 Escape 取消
    </div>

    <div class="task-table-container">
      <BounceLoading v-if="!isReady" />
      <div v-else-if="taskData.length === 0" class="empty-state">
        尚無任務
      </div>
      <DataTable
        v-else
        :data="taskData"
        @row-contextmenu="handleRowContextMenu"
      >
        <el-table-column prop="title" label="任務名稱" min-width="200">
          <template #default="{ row, $index }">
            <div class="task-name-cell">
              <!-- Row edit mode -->
              <template v-if="editingRowIndex === $index">
                <el-input
                  v-model="editingRowData.title"
                  size="small"
                  @keyup.enter="saveRowEdit"
                  @keyup.escape="cancelRowEdit"
                />
              </template>
              <!-- Normal mode -->
              <template v-else>
                <span v-if="row.taskType === 'routine'" class="routine-badge">📌</span>
                <EditableCell
                  v-if="row.taskType === 'simple'"
                  :value="row.title"
                  type="text"
                  :centered="false"
                  @on-edit="(newValue) => handleEdit($index, 'title', newValue)"
                />
                <span v-else class="routine-title">{{ row.title }}</span>
                <span class="pomodoro-icon" :class="{ 'disabled': hasExistingTask }"
                  @click.stop="startPomodoro(row)">🍅</span>
              </template>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="任務狀態" min-width="100" align="center">
          <template #default="{ row, $index }">
            <!-- Routine task: fixed "重複性" status -->
            <template v-if="row.taskType === 'routine'">
              <span class="status-tag status-recurring">重複性</span>
            </template>
            <!-- Simple task: Row edit mode -->
            <template v-else-if="editingRowIndex === $index">
              <el-select
                v-model="editingRowData.status"
                size="small"
                @keyup.enter="saveRowEdit"
                @keyup.escape="cancelRowEdit"
              >
                <el-option v-for="option in statusOptions" :key="option" :label="option" :value="option" />
              </el-select>
            </template>
            <!-- Simple task: Normal mode -->
            <template v-else>
              <div v-if="editingCell.row === $index && editingCell.field === 'status'" class="status-edit-cell">
                <el-select v-model="editingValue" @blur="saveEdit(row, 'status')" @change="saveEdit(row, 'status')"
                  ref="editInput" class="edit-select">
                  <el-option v-for="option in statusOptions" :key="option" :label="option" :value="option" />
                </el-select>
              </div>
              <div v-else class="status-edit-cell" @dblclick="startEdit($index, 'status', row.status)">
                <span :class="['status-tag', getStatusClass(row.status)]">
                  {{ row.status }}
                </span>
              </div>
            </template>
          </template>
        </el-table-column>

        <el-table-column prop="resourceGroup" label="資源分群" min-width="150" align="center">
          <template #default="{ row, $index }">
            <!-- Routine task: read-only -->
            <template v-if="row.taskType === 'routine'">
              <span class="resource-group-text">{{ row.resourceGroup || '-' }}</span>
            </template>
            <!-- Simple task: Row edit mode -->
            <template v-else-if="editingRowIndex === $index">
              <el-select
                v-model="editingRowData.resourceGroup"
                size="small"
                @keyup.enter="saveRowEdit"
                @keyup.escape="cancelRowEdit"
              >
                <el-option v-for="option in resourceGroupOptions" :key="option" :label="option" :value="option" />
              </el-select>
            </template>
            <!-- Simple task: Normal mode -->
            <template v-else>
              <EditableCell :value="row.resourceGroup" type="select" :options="resourceGroupOptions"
                @on-edit="(newValue) => handleEdit($index, 'resourceGroup', newValue)" />
            </template>
          </template>
        </el-table-column>
      </DataTable>
    </div>

    <!-- Context menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
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
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete } from '@element-plus/icons-vue'
import DataTable from './DataTable.vue'
import EditableCell from './EditableCell.vue'
import BounceLoading from './BounceLoading.vue'
import { getSimpleTasks } from '../api/simpleTasks'
import { getResourceGroups } from '../api/resourceGroups'
import { usePomodoroStore } from '../stores/pomodoro'
import { useRoutineTasksStore } from '../stores/routineTasks'

const router = useRouter()
const pomodoroStore = usePomodoroStore()
const routineTasksStore = useRoutineTasksStore()

// 編輯狀態管理（單一 cell）
const editingCell = ref({ row: null, field: null })
const editingValue = ref('')
const editInput = ref(null)

// 整行編輯狀態
const editingRowIndex = ref(null)
const editingRowData = reactive({
  title: '',
  status: '',
  resourceGroup: '',
})

// Context menu state
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  row: null,
  rowIndex: null,
})

// 一般任務資料
const simpleTasks = ref([])

// 資源分群資料
const resourceGroups = ref([])

// 資料是否已載入完成
const isReady = ref(false)

// 合併後的任務資料（例行任務在前）
const taskData = computed(() => {
  // 取得今日例行任務實例，轉換為統一格式
  const routineItems = (routineTasksStore.todayInstances || []).map(inst => ({
    id: `routine-${inst.id}`,
    originalId: inst.id,
    title: inst.routine_task?.title || '',
    status: mapRoutineStatus(inst.status),
    resourceGroup: getResourceGroupName(inst.routine_task?.resource_group_id),
    resource_group_id: inst.routine_task?.resource_group_id,
    taskType: 'routine',
    routineInstance: inst,
  }))

  // 一般任務
  const simpleItems = simpleTasks.value.map(task => ({
    ...task,
    taskType: 'simple',
  }))

  // 例行任務排在前面
  return [...routineItems, ...simpleItems]
})

// 例行任務狀態映射
const mapRoutineStatus = (status) => {
  const statusMap = {
    pending: '待處理',
    completed: '已完成',
    skipped: '已跳過',
  }
  return statusMap[status] || status
}

// 是否已有選擇中的任務
const hasExistingTask = computed(() => pomodoroStore.hasTask)

// 下拉選單選項
const statusOptions = ['待處理', '進行中', '擱置中', '已完成', '已交接', '已封存', '已取消']

// 資源分群選項（用於下拉選單）
const resourceGroupOptions = computed(() => {
  return resourceGroups.value.map(g => g.name)
})

// 載入任務列表
const loadTasks = async () => {
  try {
    const response = await getSimpleTasks()
    simpleTasks.value = response.data.tasks.map(task => ({
      ...task,
      resourceGroup: getResourceGroupName(task.resource_group_id),
    }))
  } catch (error) {
    console.error('Failed to load tasks:', error)
    ElMessage.error('載入任務失敗')
  }
}

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

// 根據 ID 獲取資源分群名稱
const getResourceGroupName = (id) => {
  if (!id) return ''
  const group = resourceGroups.value.find(g => g.id === id)
  return group ? group.name : ''
}

// 最短載入時間（毫秒）
const MIN_LOADING_TIME = 500

// 刷新資料（暴露給父組件）
const refresh = async () => {
  isReady.value = false
  const startTime = Date.now()

  // 必須先載入資源分群，再載入任務（因為 loadTasks 依賴 resourceGroups）
  await loadResourceGroups()
  await Promise.all([
    loadTasks(),
    routineTasksStore.fetchTodayInstances(),
  ])

  // 確保最短顯示 loading 0.5 秒
  const elapsed = Date.now() - startTime
  if (elapsed < MIN_LOADING_TIME) {
    await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
  }

  isReady.value = true
}

// 新增任務（不重新載入，直接加入列表）
const addTask = (task) => {
  simpleTasks.value.unshift({
    ...task,
    resourceGroup: getResourceGroupName(task.resource_group_id),
  })
}

// 任務總數
const taskCount = computed(() => taskData.value.length)

// 暴露方法給父組件
defineExpose({ refresh, addTask, taskCount })

// 開始番茄鐘
const startPomodoro = (row) => {
  if (pomodoroStore.hasTask) {
    ElMessage.warning('已有進行中的任務，請先完成或取消')
    return
  }

  // 根據任務類型設定不同的任務資訊
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

// 處理編輯事件（僅適用於一般任務）
const handleEdit = (rowIndex, field, newValue) => {
  // 找到對應的一般任務並更新
  const row = taskData.value[rowIndex]
  if (row.taskType === 'simple') {
    const simpleIndex = simpleTasks.value.findIndex(t => t.id === row.id)
    if (simpleIndex !== -1) {
      simpleTasks.value[simpleIndex][field] = newValue
    }
  }
}

// 開始編輯狀態
const startEdit = async (rowIndex, field, value) => {
  editingCell.value = { row: rowIndex, field }
  editingValue.value = value
  await nextTick()
  if (editInput.value) {
    editInput.value.focus()
  }
}

// 儲存編輯
const saveEdit = (row, field) => {
  if (editingValue.value !== row[field]) {
    row[field] = editingValue.value
  }
  editingCell.value = { row: null, field: null }
  editingValue.value = ''
}

// 任務狀態標籤 CSS 類別
const getStatusClass = (status) => {
  const classMap = {
    '待處理': 'status-pending',
    '進行中': 'status-in-progress',
    '擱置中': 'status-on-hold',
    '已完成': 'status-completed',
    '已交接': 'status-transferred',
    '已封存': 'status-archived',
    '已取消': 'status-cancelled',
  }
  return classMap[status] || 'status-pending'
}

// Context menu handling
const handleRowContextMenu = (row, column, event) => {
  // Don't show context menu if editing or for routine tasks
  if (editingRowIndex.value !== null) return
  if (row.taskType === 'routine') return

  event.preventDefault()

  // Find row index
  const rowIndex = taskData.value.findIndex(t => t.id === row.id)

  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.row = row
  contextMenu.rowIndex = rowIndex
}

// Hide context menu
const hideContextMenu = () => {
  contextMenu.visible = false
  contextMenu.row = null
  contextMenu.rowIndex = null
}

// Handle document click to close context menu
const handleDocumentClick = (event) => {
  if (!event.target.closest('.context-menu')) {
    hideContextMenu()
  }
}

// Start row edit mode
const startRowEdit = (rowIndex) => {
  const row = taskData.value[rowIndex]
  editingRowIndex.value = rowIndex
  editingRowData.title = row.title
  editingRowData.status = row.status
  editingRowData.resourceGroup = row.resourceGroup
}

// Save row edit
const saveRowEdit = async () => {
  if (editingRowIndex.value === null) return

  const row = taskData.value[editingRowIndex.value]

  // Update local data
  row.title = editingRowData.title
  row.status = editingRowData.status
  row.resourceGroup = editingRowData.resourceGroup

  // TODO: Call API to save changes

  ElMessage.success('已儲存')
  cancelRowEdit()
}

// Cancel row edit
const cancelRowEdit = () => {
  editingRowIndex.value = null
  editingRowData.title = ''
  editingRowData.status = ''
  editingRowData.resourceGroup = ''
}

// Handle context menu edit
const handleContextEdit = () => {
  if (contextMenu.rowIndex !== null) {
    startRowEdit(contextMenu.rowIndex)
  }
  hideContextMenu()
}

// Handle context menu delete
const handleContextDelete = async () => {
  if (!contextMenu.row) return

  try {
    await ElMessageBox.confirm(
      `確定要刪除「${contextMenu.row.title}」嗎？`,
      '刪除任務',
      {
        confirmButtonText: '確定刪除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    // Remove from local data
    if (contextMenu.rowIndex !== null) {
      taskData.value.splice(contextMenu.rowIndex, 1)
    }

    // TODO: Call API to delete

    ElMessage.success('已刪除')
  } catch {
    // User cancelled
  }

  hideContextMenu()
}

// Handle keyboard events for row editing
const handleKeyDown = (event) => {
  if (editingRowIndex.value !== null) {
    if (event.key === 'Enter') {
      saveRowEdit()
    } else if (event.key === 'Escape') {
      cancelRowEdit()
    }
  }
}

// 初始化載入資料
onMounted(() => {
  refresh()
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.task-table-panel {
  display: flex;
  flex-direction: column;
  max-height: 100%;
  position: relative;
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

    .el-icon {
      font-size: 16px;
    }
  }
}

.task-table-container {
  height: fit-content;
  max-height: 100%;
  overflow: hidden;
}

.empty-state {
  text-align: center;
  color: #909399;
  padding: 24px;
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
}

.status-edit-cell {
  width: 100%;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.edit-select {
  width: 100%;
}

.task-name-cell {
  display: flex;
  align-items: center;
  width: 100%;

  .routine-badge {
    margin-right: 6px;
    font-size: 12px;
    flex-shrink: 0;
  }

  .routine-title {
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

  &:hover .pomodoro-icon {
    opacity: 1;
  }
}

.resource-group-text {
  color: #606266;
  font-size: 13px;
}

.status-recurring {
  background-color: #e0f2fe;
  color: #0369a1;
}
</style>
