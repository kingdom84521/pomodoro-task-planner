<template>
  <div class="meetings-page">
    <div class="left-panel">
      <!-- Edit mode hint -->
      <div v-if="editingRowId !== null || editingCell !== null" class="edit-hint">
        按 Enter 儲存，按 Escape 取消
      </div>

      <BounceLoading v-if="!isReady" />
      <CardTable
        v-else
        :columns="columns"
        :data="allMeetings"
        empty-text="尚無會議"
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
          <div class="name-cell">
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
              <span class="meeting-title">{{ row.title }}</span>
              <span
                class="stopwatch-icon"
                :class="{ disabled: isIconDisabled(row) }"
                @click.stop="handleStart(row)"
              >
                ⏱️
              </span>
            </template>
          </div>
        </template>

        <!-- Date column -->
        <template #scheduled_date="{ row }">
          <!-- Edit mode -->
          <template v-if="isCellEditing(row.id, 'scheduled_date')">
            <el-date-picker
              v-model="editingRowData.scheduled_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="選擇日期"
              style="width: 100%"
              popper-class="picker-with-offset"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
          </template>
          <!-- Normal mode -->
          <template v-else>
            <span v-if="row.scheduled_date" class="date-text">{{ row.scheduled_date }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </template>

        <!-- Time column -->
        <template #scheduled_time="{ row }">
          <!-- Edit mode -->
          <template v-if="isCellEditing(row.id, 'scheduled_time')">
            <el-time-picker
              v-model="editingRowData.scheduled_time"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="選擇時間"
              style="width: 100%"
              popper-class="picker-with-offset"
              @keyup.enter="saveEdit"
              @keyup.escape="cancelEdit"
            />
          </template>
          <!-- Normal mode -->
          <template v-else>
            <span class="time-text">{{ row.scheduled_time }}</span>
          </template>
        </template>

        <!-- Recurrence column -->
        <template #recurrence="{ row }">
          <span v-if="row.recurrence_rule" class="recurrence-text">
            {{ formatRecurrence(row.recurrence_rule) }}
          </span>
          <span v-else class="no-data">-</span>
        </template>

        <!-- Duration column -->
        <template #duration="{ row }">
          <div v-if="row.completed_count > 0" class="duration-stats">
            <span class="duration-total">總計 {{ formatDuration(row.total_duration) }}</span>
            <span v-if="row.meeting_type === 'recurring'" class="duration-avg">
              平均 {{ formatDuration(row.avg_duration) }}
            </span>
          </div>
          <span v-else class="no-data">-</span>
        </template>
      </CardTable>

      <!-- Context menu -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <div
          v-if="contextMenu.meeting && canConvertToRecurring(contextMenu.meeting)"
          class="context-menu-item"
          @click="handleConvertToRecurring"
        >
          <el-icon><Refresh /></el-icon>
          <span>轉為例行會議</span>
        </div>
        <div
          v-if="contextMenu.meeting && canStartNow(contextMenu.meeting)"
          class="context-menu-item"
          :class="{ disabled: hasActiveMeeting }"
          @click="handleStartNow"
        >
          <el-icon><VideoPlay /></el-icon>
          <span>臨時開會</span>
        </div>
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

    <!-- Recurrence Edit Dialog -->
    <el-dialog
      v-model="recurrenceDialog.visible"
      title="編輯週期"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="recurrence-dialog-content">
        <div class="meeting-title-display">{{ recurrenceDialog.meetingTitle }}</div>
        <RecurrenceRuleEditor v-model="recurrenceDialog.recurrenceRule" />
      </div>

      <template #footer>
        <el-button @click="recurrenceDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveRecurrenceEdit" :loading="recurrenceDialog.saving">
          儲存
        </el-button>
      </template>
    </el-dialog>

    <div class="right-panel">
      <NewMeetingForm @created="handleMeetingCreated" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, Delete, VideoPlay, Refresh } from '@element-plus/icons-vue'
import CardTable from '../components/CardTable.vue'
import NewMeetingForm from '../components/NewMeetingForm.vue'
import BounceLoading from '../components/BounceLoading.vue'
import RecurrenceRuleEditor from '../components/RecurrenceRuleEditor.vue'
import { useMeetingsStore } from '../stores/meetings'

const router = useRouter()
const meetingsStore = useMeetingsStore()

// Minimum loading time for BounceLoading
const MIN_LOADING_TIME = 500

// Component active state (prevents updates during unmount)
const isActive = ref(true)

// Loading state
const isReady = ref(false)

// Column definitions
const columns = [
  { prop: 'type', label: '類型', width: '80px' },
  { prop: 'title', label: '名稱', flex: 1 },
  { prop: 'scheduled_date', label: '日期', width: '110px', align: 'center' },
  { prop: 'scheduled_time', label: '時間', width: '100px', align: 'center' },
  { prop: 'recurrence', label: '週期', width: '120px', align: 'center' },
  { prop: 'duration', label: '耗時', width: '140px', align: 'center' },
]

// Merged meeting list
const allMeetings = computed(() => {
  if (!isActive.value) return []

  const recurring = (meetingsStore.recurringMeetings || []).map(m => ({
    ...m,
    typeLabel: '例行',
    typeColor: 'primary',
  }))

  const oneTime = (meetingsStore.oneTimeMeetings || []).map(m => ({
    ...m,
    typeLabel: '一次性',
    typeColor: 'success',
  }))

  // Sort by scheduled_time
  return [...recurring, ...oneTime].sort((a, b) =>
    (a.scheduled_time || '').localeCompare(b.scheduled_time || '')
  )
})

// Check if there's an active meeting
const hasActiveMeeting = computed(() => meetingsStore.hasActiveMeeting)

// Check if meeting can be started (one-time only on its scheduled date)
const canStartMeeting = (row) => {
  if (row.meeting_type === 'recurring') return true
  if (row.meeting_type === 'one-time') {
    const today = new Date().toISOString().split('T')[0]
    return row.scheduled_date === today
  }
  return false
}

// Check if icon should be disabled (grayed out)
const isIconDisabled = (row) => {
  // Disabled if there's already an active meeting
  if (hasActiveMeeting.value) return true

  // Check if this meeting has a pending instance for today
  const hasPendingInstance = (meetingsStore.todayMeetings || []).some(
    (inst) => inst.meeting?.id === row.id && inst.status === 'pending'
  )

  // Disabled if no pending instance for today
  return !hasPendingInstance
}

// Check if "臨時開會" should be shown in context menu
const canStartNow = (row) => {
  if (row.meeting_type === 'recurring') return true
  if (row.meeting_type === 'one-time') {
    const today = new Date().toISOString().split('T')[0]
    return row.scheduled_date === today
  }
  return false
}

// Check if "轉為例行會議" should be shown (all one-time meetings)
const canConvertToRecurring = (row) => {
  return row.meeting_type === 'one-time'
}

// Format recurrence rule
const formatRecurrence = (rule) => {
  if (!rule) return '-'

  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  const { frequency, byweekday, daysOfWeek } = rule
  const weekdays = byweekday ?? daysOfWeek ?? []

  if (frequency === 'daily') return '每天'

  if (frequency === 'weekly' && weekdays.length > 0) {
    const days = weekdays
      .filter(d => typeof d === 'number')
      .map(d => dayNames[d])
      .join('')
    return `週${days}`
  }

  if (frequency === 'monthly') {
    const monthdays = rule.bymonthday ?? rule.daysOfMonth ?? []
    if (monthdays.length > 0) {
      return `每月 ${monthdays.map(d => d === -1 ? '月底' : `${d}日`).join('、')}`
    }
  }

  return '-'
}

// Format duration in seconds to readable string
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '-'
  const minutes = (seconds / 60).toFixed(2)
  return `${minutes} 分鐘`
}

// Context menu state
const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  meeting: null,
})

// Edit state
const editingRowId = ref(null) // Row ID for row edit mode (context menu)
const editingCell = ref(null) // { rowId, prop } for single cell edit mode (dblclick)
const editingRowData = reactive({
  title: '',
  scheduled_date: '',
  scheduled_time: '',
})

// Recurrence edit dialog
const recurrenceDialog = reactive({
  visible: false,
  meetingId: null,
  meetingTitle: '',
  recurrenceRule: { frequency: 'daily' },
  saving: false,
})

// Check if a cell is in edit mode
const isCellEditing = (rowId, prop) => {
  // Row edit mode: all editable cells are in edit mode
  if (editingRowId.value === rowId) {
    return ['title', 'scheduled_date', 'scheduled_time'].includes(prop)
  }
  // Single cell edit mode
  if (editingCell.value && editingCell.value.rowId === rowId && editingCell.value.prop === prop) {
    return true
  }
  return false
}

// Handle row context menu
const handleRowContextMenu = (row, event) => {
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

// Document click handler
const handleDocumentClick = (event) => {
  if (!event.target.closest('.context-menu')) {
    hideContextMenu()
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

// Handle meeting created
const handleMeetingCreated = (meeting) => {
  ElMessage.success('會議已建立')
}

// Start row edit mode (from context menu)
const startRowEdit = (meeting) => {
  editingRowId.value = meeting.id
  editingCell.value = null
  editingRowData.title = meeting.title
  editingRowData.scheduled_date = meeting.scheduled_date || ''
  editingRowData.scheduled_time = meeting.scheduled_time || ''
}

// Start single cell edit mode (from dblclick)
const startCellEdit = (meeting, prop) => {
  // For recurrence, open dialog instead
  if (prop === 'recurrence') {
    openRecurrenceDialog(meeting)
    return
  }

  editingCell.value = { rowId: meeting.id, prop }
  editingRowId.value = null
  editingRowData.title = meeting.title
  editingRowData.scheduled_date = meeting.scheduled_date || ''
  editingRowData.scheduled_time = meeting.scheduled_time || ''
}

// Handle cell dblclick
const handleCellDblClick = (row, prop, event) => {
  // Skip if type or duration column (not editable)
  if (prop === 'type' || prop === 'duration') return
  startCellEdit(row, prop)
}

// Open recurrence dialog
const openRecurrenceDialog = (meeting) => {
  if (meeting.meeting_type !== 'recurring') {
    ElMessage.info('一次性會議沒有週期設定')
    return
  }
  recurrenceDialog.meetingId = meeting.id
  recurrenceDialog.meetingTitle = meeting.title
  recurrenceDialog.recurrenceRule = meeting.recurrence_rule ? { ...meeting.recurrence_rule } : { frequency: 'daily' }
  recurrenceDialog.visible = true
}

// Save edit
const saveEdit = async () => {
  const meetingId = editingRowId.value || editingCell.value?.rowId
  if (!meetingId) return

  const meeting = allMeetings.value.find(m => m.id === meetingId)
  if (!meeting) return

  const updateData = {}

  // Only update changed fields
  if (editingRowId.value || editingCell.value?.prop === 'title') {
    if (editingRowData.title !== meeting.title) {
      updateData.title = editingRowData.title
    }
  }
  if (editingRowId.value || editingCell.value?.prop === 'scheduled_date') {
    if (editingRowData.scheduled_date !== (meeting.scheduled_date || '')) {
      updateData.scheduled_date = editingRowData.scheduled_date || null
    }
  }
  if (editingRowId.value || editingCell.value?.prop === 'scheduled_time') {
    if (editingRowData.scheduled_time !== (meeting.scheduled_time || '')) {
      updateData.scheduled_time = editingRowData.scheduled_time
    }
  }

  // If no changes, just cancel
  if (Object.keys(updateData).length === 0) {
    cancelEdit()
    return
  }

  try {
    await meetingsStore.updateMeeting(meetingId, updateData)
    ElMessage.success('已儲存')
  } catch (error) {
    console.error('Failed to update meeting:', error)
    ElMessage.error('儲存失敗')
  }

  cancelEdit()
}

// Cancel edit
const cancelEdit = () => {
  editingRowId.value = null
  editingCell.value = null
  editingRowData.title = ''
  editingRowData.scheduled_date = ''
  editingRowData.scheduled_time = ''
}

// Save recurrence dialog
const saveRecurrenceEdit = async () => {
  if (!recurrenceDialog.meetingId) return

  const rule = recurrenceDialog.recurrenceRule
  if (rule.frequency === 'weekly' && (!rule.byweekday || rule.byweekday.length === 0)) {
    ElMessage.warning('請選擇至少一個星期')
    return
  }

  recurrenceDialog.saving = true
  try {
    await meetingsStore.updateMeeting(recurrenceDialog.meetingId, {
      recurrence_rule: rule,
    })
    ElMessage.success('週期已更新')
    recurrenceDialog.visible = false
  } catch (error) {
    console.error('Failed to update recurrence:', error)
    ElMessage.error('更新失敗')
  } finally {
    recurrenceDialog.saving = false
  }
}

// Handle edit from context menu
const handleEdit = async () => {
  if (contextMenu.meeting) {
    startRowEdit(contextMenu.meeting)
  }
  hideContextMenu()
}

// Handle delete
const handleDelete = async () => {
  if (!contextMenu.meeting) return

  try {
    await ElMessageBox.confirm(
      `確定要刪除「${contextMenu.meeting.title}」嗎？`,
      '刪除會議',
      {
        confirmButtonText: '確定刪除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await meetingsStore.deleteMeeting(contextMenu.meeting.id)
    ElMessage.success('已刪除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete meeting:', error)
      ElMessage.error('刪除失敗')
    }
  }

  hideContextMenu()
}

// Handle start meeting
const handleStart = async (meeting) => {
  if (isIconDisabled(meeting)) return

  // Find today's instance for this meeting
  await meetingsStore.fetchTodayMeetings()
  const instance = (meetingsStore.todayMeetings || []).find(
    (m) => m.meeting?.id === meeting.id && m.status === 'pending'
  )

  if (instance) {
    try {
      await meetingsStore.startMeetingInstance(instance)
      router.push('/history')
    } catch (error) {
      console.error('Failed to start meeting:', error)
      ElMessage.error('開始會議失敗')
    }
  } else {
    ElMessage.warning('今日無此會議或會議已開始')
  }
}

// Handle start meeting now (ad-hoc)
const handleStartNow = async () => {
  if (!contextMenu.meeting) return
  if (hasActiveMeeting.value) {
    hideContextMenu()
    return
  }

  try {
    await meetingsStore.startMeetingNow(contextMenu.meeting.id)
    router.push('/history')
  } catch (error) {
    console.error('Failed to start meeting now:', error)
    ElMessage.error('臨時開會失敗')
  }

  hideContextMenu()
}

// Handle convert to recurring
const handleConvertToRecurring = async () => {
  if (!contextMenu.meeting) return

  try {
    await meetingsStore.convertToRecurring(contextMenu.meeting.id)
    ElMessage.success('已轉為例行會議（預設每天）')
  } catch (error) {
    console.error('Failed to convert to recurring:', error)
    ElMessage.error('轉換失敗')
  }

  hideContextMenu()
}


onMounted(async () => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeyDown)

  const startTime = Date.now()

  // Fetch both meetings and today's instances (for icon disable check)
  await Promise.all([
    meetingsStore.fetchMeetings(),
    meetingsStore.fetchTodayMeetings(),
  ])

  // Ensure minimum loading time
  const elapsed = Date.now() - startTime
  if (elapsed < MIN_LOADING_TIME) {
    await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
  }

  isReady.value = true
})

onBeforeUnmount(() => {
  isActive.value = false
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<style scoped>
.meetings-page {
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

.recurrence-dialog-content {
  .meeting-title-display {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }
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
}

:deep(.card-table-row):hover .stopwatch-icon {
  opacity: 1;
}

.date-text {
  font-size: 13px;
  color: #606266;
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

    &.disabled {
      color: #c0c4cc;
      cursor: not-allowed;

      &:hover {
        background: transparent;
      }
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
