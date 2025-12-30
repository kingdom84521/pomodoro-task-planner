<template>
  <div class="pomodoro-clock">
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
    </div>
    <div v-else-if="loading" class="loading">
      <p>載入中...</p>
    </div>
    <!-- 可折疊的任務區塊 -->
    <div v-else class="task-panel" :class="{ 'expanded': taskExpanded, 'has-task': currentTask }">
      <div class="task-header" @click="toggleTaskPanel">
        <div class="task-header-content">
          <h3 class="task-title">
            {{ taskExpanded ? '當前任務' : (currentTask ? '查看當前任務' : '尚未選擇任務') }}
          </h3>
          <el-icon v-if="currentTask" class="expand-icon">
            <ArrowDown />
          </el-icon>
        </div>
      </div>
      <div class="task-content">
        <div class="task-content-inner" v-if="currentTask">
          <table class="task-table">
            <tbody>
              <tr>
                <th>任務名稱</th>
                <td>{{ currentTask.title }}</td>
              </tr>
              <tr>
                <th>任務狀態</th>
                <td>
                  <span :class="['status-tag', getStatusClass(currentTask.status)]">
                    {{ currentTask.status }}
                  </span>
                </td>
              </tr>
              <tr>
                <th>資源分群</th>
                <td>{{ currentTask.resourceGroup || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 計時器區域 -->
    <div v-show="isTimerReady" class="timer-section">
      <!-- 計時器顯示區（環 + 數字） -->
      <div class="timer-display-area">
        <!-- 計時器環（收起時顯示） -->
        <div class="timer-ring-wrapper" :class="{ 'collapsed': ringCollapsed }">
          <svg class="timer-ring" viewBox="0 0 200 200">
            <!-- 背景環 -->
            <circle
              class="timer-ring-bg"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke-width="8"
            />
            <!-- 進度環 -->
            <circle
              class="timer-ring-progress"
              :class="{ 'running': timerStatus === 'running', 'paused': timerStatus === 'paused', 'break-mode': timerMode !== 'focus', 'no-transition': isRestoring }"
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke-width="8"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="progressOffset"
              stroke-linecap="round"
            />
            <!-- 尾端白點：用 g 包起來做 rotate -->
            <g
              class="glow-group"
              :class="{ 'no-transition': isRestoring, 'idle': timerStatus === 'idle' }"
              :style="{ transform: `rotate(${dotAngle}deg)` }"
            >
              <circle
                class="glow-dot"
                :class="{ 'paused': timerStatus === 'paused', 'break-mode': timerMode !== 'focus' }"
                cx="100"
                cy="10"
                r="5"
                fill="white"
              />
            </g>
          </svg>
        </div>

        <!-- 模式標籤 -->
        <div class="mode-indicator" :class="timerMode">
          {{ modeDisplayText }}
        </div>

        <!-- 時間顯示（始終可見） -->
        <div class="timer-display" :class="{ 'timer-running': timerStatus === 'running', 'timer-paused': timerStatus === 'paused', 'break-mode': timerMode !== 'focus' }">
          {{ formattedTime }}
        </div>

        <!-- 進度條（展開時從數字下方長出來） -->
        <div class="progress-bar-container" :class="{ 'visible': taskExpanded }">
          <div class="progress-bar">
            <div
              class="progress-bar-fill"
              :class="{ 'running': timerStatus === 'running', 'paused': timerStatus === 'paused', 'break-mode': timerMode !== 'focus' }"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <div class="timer-actions">
        <el-button
          type="primary"
          :disabled="timerStatus === 'running' || !currentTask"
          @click="startTimer"
        >
          開始
        </el-button>
        <el-button
          type="warning"
          :disabled="timerStatus !== 'running'"
          @click="pauseTimer"
        >
          暫停
        </el-button>
        <el-button
          type="danger"
          :disabled="timerStatus === 'idle'"
          @click="handleStopClick"
        >
          {{ stopConfirming ? '結束計時?' : '停止' }}
        </el-button>
        <el-button
          class="btn-cancel"
          :disabled="timerStatus === 'idle'"
          @click="handleCancelClick"
        >
          {{ cancelConfirming ? '清除任務?' : '取消' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { getSimpleTasks } from '../api/simpleTasks'
import { createWorkRecord } from '../api/workRecords'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { usePomodoroStore } from '../stores/pomodoro'
import { useUserSettingsStore } from '../stores/userSettings'

// Stores
const pomodoroStore = usePomodoroStore()
const settingsStore = useUserSettingsStore()

// Apply pending settings on mount
settingsStore.applyPendingIfReady()
pomodoroStore.checkAndResetSession()

// Emits
const emit = defineEmits(['start', 'pause', 'stop', 'cancel', 'complete', 'record-created'])

// Current task from store
const currentTask = computed(() => pomodoroStore.currentTask)
const loading = ref(false)
const error = ref(null)
const taskExpanded = ref(false)

// Timer mode
const timerMode = computed(() => pomodoroStore.timer.mode)

// Mode display text
const modeDisplayText = computed(() => {
  switch (timerMode.value) {
    case 'focus': return '專注'
    case 'short-break': return '短休息'
    case 'long-break': return '長休息'
    default: return '專注'
  }
})

// 動畫狀態控制
const ringCollapsed = ref(false)

// 切換任務面板展開/收起
const toggleTaskPanel = () => {
  if (currentTask.value) {
    taskExpanded.value = !taskExpanded.value
    // 進度環跟隨展開狀態
    ringCollapsed.value = taskExpanded.value
  }
}

// Total time based on current mode
const totalTime = computed(() => pomodoroStore.currentModeDuration)

// 計時器狀態
const remainingTime = ref(totalTime.value) // 剩餘時間（秒）
const timerStatus = ref('idle') // 'idle' | 'running' | 'paused'
const isRestoring = ref(false) // 恢復狀態時禁用動畫
const isTimerReady = ref(false) // 計時器是否已初始化完成
let timerInterval = null

// Watch for mode changes to update remaining time
watch(timerMode, () => {
  if (timerStatus.value === 'idle') {
    remainingTime.value = totalTime.value
  }
})

// 儲存計時器狀態到 Pinia
const saveTimerState = (status, duration = 0, startedAt = null) => {
  pomodoroStore.restoreTimer(status, duration, totalTime.value, startedAt, timerMode.value)
}

// 清除計時器狀態
const clearTimerState = () => {
  pomodoroStore.resetTimer()
}

// 確認狀態
const stopConfirming = ref(false)
const cancelConfirming = ref(false)
let confirmTimeout = null

// 格式化時間顯示 (MM:SS)
const formattedTime = computed(() => {
  const minutes = Math.floor(remainingTime.value / 60)
  const seconds = remainingTime.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

// 進度環計算
const circumference = 2 * Math.PI * 90

// 進度百分比 (0-100)
const progressPercent = computed(() => {
  if (timerStatus.value === 'idle') return 0
  return (remainingTime.value / totalTime.value) * 100
})

// 進度環偏移量
const progressOffset = computed(() => {
  if (timerStatus.value === 'idle') {
    return circumference // 空環
  }
  const progress = remainingTime.value / totalTime.value
  return circumference * (1 - progress)
})

// 白點角度（根據 progressOffset 同步）
const dotAngle = computed(() => {
  // offset 從 circumference（空）到 0（滿）再到 circumference（空）
  // 角度從 0° 到 360° 再到 0°
  const fillProgress = 1 - (progressOffset.value / circumference)
  return fillProgress * 360
})

// 開始計時
const startTimer = () => {
  const wasIdle = timerStatus.value === 'idle'
  const baseDuration = wasIdle ? 0 : totalTime.value - remainingTime.value

  if (wasIdle) {
    remainingTime.value = totalTime.value
  }

  timerStatus.value = 'running'

  // 儲存狀態：timing, 已累計時間, 開始時間戳
  saveTimerState('timing', baseDuration, Date.now())

  emit('start', { task: currentTask.value, remainingTime: remainingTime.value, mode: timerMode.value })

  timerInterval = setInterval(() => {
    if (remainingTime.value > 0) {
      remainingTime.value--
    } else {
      completeTimer()
    }
  }, 1000)
}

// 暫停計時
const pauseTimer = () => {
  timerStatus.value = 'paused'
  clearInterval(timerInterval)
  timerInterval = null

  // 儲存狀態：paused, 已累計時間
  const duration = totalTime.value - remainingTime.value
  saveTimerState('paused', duration, null)

  emit('pause', { task: currentTask.value, remainingTime: remainingTime.value })
}

// 最小記錄時間（0.5 分鐘 = 30 秒）
const MIN_RECORD_TIME = 30

// 共用：儲存工作紀錄
const saveWorkRecord = async (duration, successMsg) => {
  if (!currentTask.value) return

  try {
    const response = await createWorkRecord({
      task_id: currentTask.value.id,
      task_name: currentTask.value.title,
      resource_group_id: currentTask.value.resource_group_id,
      duration,
    })
    emit('record-created', response.data.work_record)
    ElMessage.success(successMsg)
  } catch (err) {
    console.error('儲存工作紀錄失敗:', err)
    ElMessage.warning('工作紀錄儲存失敗')
  }
}

// 停止計時（手動停止，不計入完成次數）
const stopTimer = async () => {
  clearInterval(timerInterval)
  timerInterval = null
  const elapsed = totalTime.value - remainingTime.value
  const currentMode = timerMode.value
  timerStatus.value = 'idle'
  remainingTime.value = totalTime.value
  clearTimerState()

  // 只有專注模式才記錄工作紀錄（休息不記錄）
  if (currentMode === 'focus' && elapsed >= MIN_RECORD_TIME) {
    await saveWorkRecord(elapsed, '工作紀錄已儲存')
  } else if (currentMode === 'focus' && currentTask.value) {
    ElMessage.warning('計時少於 0.5 分鐘，不做紀錄')
  }

  emit('stop', { task: currentTask.value, elapsedTime: elapsed })
}

// 取消計時
const cancelTimer = () => {
  clearInterval(timerInterval)
  timerInterval = null
  timerStatus.value = 'idle'
  remainingTime.value = totalTime.value
  clearTimerState()
  clearStoredTask()
  emit('cancel', { task: currentTask.value })
  ElMessage.info('已清除任務')
}

// 建立確認點擊處理器（雙擊確認模式）
const createConfirmHandler = (confirmingRef, action) => () => {
  if (confirmingRef.value) {
    action()
    stopConfirming.value = false
    cancelConfirming.value = false
  } else {
    stopConfirming.value = false
    cancelConfirming.value = false
    confirmingRef.value = true
    if (confirmTimeout) clearTimeout(confirmTimeout)
    confirmTimeout = setTimeout(() => { confirmingRef.value = false }, 3000)
  }
}

const handleStopClick = createConfirmHandler(stopConfirming, stopTimer)
const handleCancelClick = createConfirmHandler(cancelConfirming, cancelTimer)

// 計時完成
const completeTimer = async () => {
  clearInterval(timerInterval)
  timerInterval = null
  const currentMode = timerMode.value
  timerStatus.value = 'idle'

  if (currentMode === 'focus') {
    // Focus completed - save work record and switch to break
    if (currentTask.value) {
      await saveWorkRecord(totalTime.value, '番茄鐘完成！工作紀錄已儲存')
    } else {
      ElMessage.success('番茄鐘完成！')
    }

    // Complete focus and switch to break mode
    pomodoroStore.completeFocus()
    remainingTime.value = pomodoroStore.currentModeDuration

    const breakMode = pomodoroStore.timer.mode
    ElMessage.info(breakMode === 'long-break' ? '進入長休息' : '進入短休息')

    // Auto-start break timer
    startTimer()
  } else {
    // Break completed - switch back to focus mode
    pomodoroStore.completeBreak()
    remainingTime.value = pomodoroStore.currentModeDuration
    ElMessage.success('休息結束，準備開始專注！')
  }

  emit('complete', { task: currentTask.value, elapsedTime: totalTime.value, mode: currentMode })
}

// 當分頁重新可見時，立即重算時間
const handleVisibilityChange = () => {
  const { startedAt, duration } = pomodoroStore.timer
  if (document.visibilityState === 'visible' && timerStatus.value === 'running' && startedAt) {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    const totalElapsed = duration + elapsed
    const remaining = totalTime.value - totalElapsed

    if (remaining > 0) {
      remainingTime.value = remaining
    } else {
      // 計時已完成，觸發完成邏輯
      remainingTime.value = 0
      completeTimer()
    }
  }
}

// 註冊 visibilitychange 事件
document.addEventListener('visibilitychange', handleVisibilityChange)

// 清理
onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  if (confirmTimeout) {
    clearTimeout(confirmTimeout)
  }
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

const clearStoredTask = () => {
  pomodoroStore.clearCurrentTask()
  taskExpanded.value = false
  ringCollapsed.value = false
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

const validateTask = async (storedTask) => {
  try {
    const response = await getSimpleTasks()
    const tasks = response.data?.data?.tasks || []

    // 檢查儲存的任務是否存在於系統中
    const taskExists = tasks.some(task => task.id === storedTask.id)

    if (!taskExists) {
      ElMessage.error('任務已不存在，已清除選擇')
      clearStoredTask()
      return false
    }

    return true
  } catch (err) {
    console.error('驗證任務時發生錯誤:', err)
    ElMessage.error('無法驗證任務是否存在')
    clearStoredTask()
    return false
  }
}

// 等待下一個動畫幀
const waitForPaint = () => new Promise(resolve => requestAnimationFrame(resolve))

// 恢復計時器狀態
const restoreTimerState = async () => {
  const storedState = pomodoroStore.timer
  if (storedState.status === 'idle') return

  const { status, duration, total, startedAt, mode } = storedState

  // 先禁用動畫，等待 DOM 更新 + 瀏覽器 paint
  isRestoring.value = true
  await nextTick()
  await waitForPaint()

  if (status === 'timing' && startedAt) {
    // 計算經過的時間
    const elapsed = Math.floor((Date.now() - startedAt) / 1000)
    const totalElapsed = duration + elapsed
    let remaining = total - totalElapsed
    let currentMode = mode

    // 處理背景完成的情況（可能跨越多個階段）
    while (remaining <= 0) {
      if (currentMode === 'focus') {
        // Focus 在背景完成
        if (currentTask.value) {
          await saveWorkRecord(total, '番茄鐘已完成！工作紀錄已儲存')
        } else {
          ElMessage.success('番茄鐘已完成！')
        }
        pomodoroStore.completeFocus()
        emit('complete', { task: currentTask.value, elapsedTime: total, mode: currentMode })

        // 計算休息是否也已完成
        const breakDuration = pomodoroStore.currentModeDuration
        const overTime = -remaining // 超過 focus 的時間
        remaining = breakDuration - overTime
        currentMode = pomodoroStore.timer.mode
      } else {
        // Break 在背景完成
        pomodoroStore.completeBreak()
        ElMessage.success('休息結束，準備開始專注！')
        emit('complete', { task: currentTask.value, elapsedTime: pomodoroStore.currentModeDuration, mode: currentMode })

        // 回到 focus，等待使用者按開始
        remainingTime.value = pomodoroStore.currentModeDuration

        // 恢復動畫後返回
        await nextTick()
        await waitForPaint()
        isRestoring.value = false
        return // 不自動開始，等使用者按開始
      }
    }

    // 還有剩餘時間，繼續計時
    remainingTime.value = remaining
    timerStatus.value = 'running'

    // 更新儲存的開始時間（重新計算 baseDuration）
    const baseDuration = pomodoroStore.currentModeDuration - remaining
    saveTimerState('timing', baseDuration, Date.now())

    timerInterval = setInterval(() => {
      if (remainingTime.value > 0) {
        remainingTime.value--
      } else {
        completeTimer()
      }
    }, 1000)
  } else if (status === 'paused') {
    // 恢復暫停狀態
    remainingTime.value = total - duration
    timerStatus.value = 'paused'
  }

  // 等待狀態更新到 DOM + paint 後再恢復動畫
  await nextTick()
  await waitForPaint()
  isRestoring.value = false
}

onMounted(async () => {
  // Check if there's a task in the store
  if (pomodoroStore.currentTask) {
    loading.value = true
    error.value = null

    try {
      const isValid = await validateTask(pomodoroStore.currentTask)
      if (isValid) {
        // 恢復計時器狀態
        await restoreTimerState()
      }
    } catch (err) {
      console.error('驗證任務時發生錯誤:', err)
      error.value = '驗證任務時發生錯誤'
      clearStoredTask()
    } finally {
      loading.value = false
    }
  }

  // Initialize remaining time only if timer is idle (not restored from running/paused state)
  if (timerStatus.value === 'idle') {
    remainingTime.value = totalTime.value
  }

  // 初始化完成，顯示計時器
  isTimerReady.value = true
})
</script>

<style scoped>
.pomodoro-clock {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  color: #606266;
  height: 100%;
  display: flex;
  flex-direction: column;

  .task-panel {
    background: #f5f7fa;
    border-radius: 8px;
    overflow: hidden;

    .task-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: default;
      user-select: none;

      .task-header-content {
        display: flex;
        align-items: center;
        width: 100%;
        justify-content: center;
        transition: transform 0.15s ease;
      }

      .task-title {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #909399;
        transition: color 0.15s ease;
      }

      .expand-icon {
        margin-left: 8px;
        color: #909399;
        transition: transform 0.15s ease, color 0.15s ease;
      }
    }

    &.has-task .task-header {
      cursor: pointer;

      &:hover {
        .task-title {
          color: #409eff;
        }
        .expand-icon {
          color: #409eff;
        }
      }
    }

    .task-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.15s ease;
    }

    .task-content-inner {
      padding: 0 16px 12px;
    }

    &.expanded {
      .task-header {
        .task-header-content {
          transform: translateX(calc(-50% + 45px));
        }

        .task-title {
          color: #303133;
        }

        .expand-icon {
          transform: rotate(180deg);
          color: #303133;
        }
      }

      .task-content {
        max-height: 250px;
      }
    }
  }

  .task-table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 6px 0;
      text-align: left;
      border-bottom: 1px solid #e4e7ed;
    }

    th {
      width: 70px;
      color: #909399;
      font-weight: 500;
      font-size: 12px;
    }

    td {
      color: #303133;
      font-size: 13px;
    }

    tr:last-child th,
    tr:last-child td {
      border-bottom: none;
    }
  }

  .status-tag {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;

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

  .error-message {
    color: #f56c6c;
    background: #fef0f0;
    padding: 12px;
    border-radius: 4px;
    border: 1px solid #fbc4c4;
  }

  .loading {
    color: #909399;
    text-align: center;
    padding: 20px;
  }

  .timer-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0;
    min-height: 0;
  }

  .timer-display-area {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 280px;
  }

  .timer-ring-wrapper {
    position: absolute;
    width: 280px;
    height: 280px;
    transition: transform 0.15s ease, opacity 0.08s ease-in;

    &.collapsed {
      transform: scale(0);
      opacity: 0;
      pointer-events: none;
    }
  }

  .timer-ring {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .progress-bar-container {
    width: 200px;
    height: 0;
    overflow: clip;
    transition: height 0.15s ease, margin 0.15s ease;

    &.visible {
      height: 20px; /* 留空間給發光點 */
      margin-top: 6px;
      overflow: visible;
    }
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #ebeef5;
    border-radius: 4px;
    margin-top: 6px; /* 讓進度條置中 */
  }

  .progress-bar-fill {
    height: 100%;
    background: #909399;
    border-radius: 4px;
    transition: width 0.5s ease;
    position: relative;

    &.running {
      background: #409eff;

      /* 尾端發光點 */
      &::after {
        content: '';
        position: absolute;
        right: -4px;
        top: 50%;
        transform: translateY(-50%);
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        box-shadow:
          0 0 6px 2px rgba(64, 158, 255, 0.8),
          0 0 12px 4px rgba(64, 158, 255, 0.5);
        animation: breathe-bar-glow 2s ease-in-out infinite;
      }
    }

    &.running.break-mode {
      background: #8b5cf6;

      &::after {
        box-shadow:
          0 0 6px 2px rgba(139, 92, 246, 0.8),
          0 0 12px 4px rgba(139, 92, 246, 0.5);
      }
    }

    &.paused {
      background: #e6a23c;
    }
  }

  @keyframes breathe-bar-glow {
    0%, 100% {
      opacity: 0.6;
      transform: translateY(-50%) scale(0.8);
    }
    50% {
      opacity: 1;
      transform: translateY(-50%) scale(1.2);
    }
  }

  .timer-ring-bg {
    stroke: #ebeef5;
  }

  .timer-ring-progress {
    stroke: #909399;
    transform: rotate(-90deg);
    transform-origin: 100px 100px;
    transition: stroke-dashoffset 0.5s ease-out;

    &.running {
      stroke: #409eff;
    }

    &.running.break-mode {
      stroke: #8b5cf6;
    }

    &.paused {
      stroke: #e6a23c;
    }

    &.no-transition {
      transition: none;
    }
  }

  /* 白點群組：用 rotate 繞圓心轉 */
  :deep(.glow-group) {
    transform-origin: 100px 100px;
    transition: transform 0.5s ease-out;

    &.idle {
      opacity: 0;
    }

    &.no-transition {
      transition: none;
    }
  }

  /* 白點樣式 */
  :deep(.glow-dot) {
    filter: drop-shadow(0 0 6px white) drop-shadow(0 0 10px rgba(64, 158, 255, 0.8));

    &.break-mode {
      filter: drop-shadow(0 0 6px white) drop-shadow(0 0 10px rgba(139, 92, 246, 0.8));
    }

    &.paused {
      filter: drop-shadow(0 0 6px white) drop-shadow(0 0 10px rgba(230, 162, 60, 0.8));
    }
  }

  .mode-indicator {
    font-size: 14px;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 12px;
    margin-bottom: 8px;
    user-select: none;

    &.focus {
      background: #ecf5ff;
      color: #409eff;
    }

    &.short-break,
    &.long-break {
      background: #f3e8ff;
      color: #8b5cf6;
    }
  }

  .timer-display {
    font-size: 40px;
    font-weight: 700;
    font-family: 'Courier New', Courier, monospace;
    text-align: center;
    color: #303133;
    letter-spacing: 2px;
    user-select: none;

    &.timer-running {
      color: #409eff;
    }

    &.timer-paused {
      color: #e6a23c;
    }

    &.break-mode.timer-running {
      color: #8b5cf6;
    }
  }

  .timer-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    width: 180px;
    margin-top: 32px;
    flex-shrink: 0;

    .el-button {
      width: 100%;
      margin: 0;
    }

    .btn-cancel {
      --el-button-bg-color: #606266;
      --el-button-border-color: #606266;
      --el-button-text-color: #fff;
      --el-button-hover-bg-color: #73767a;
      --el-button-hover-border-color: #73767a;
      --el-button-hover-text-color: #fff;
      --el-button-active-bg-color: #535659;
      --el-button-active-border-color: #535659;
      --el-button-disabled-bg-color: #a3a6ad;
      --el-button-disabled-border-color: #a3a6ad;
      --el-button-disabled-text-color: #fff;
    }
  }
}

</style>
