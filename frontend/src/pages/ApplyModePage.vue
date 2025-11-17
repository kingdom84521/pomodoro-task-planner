<template>
  <div class="apply-mode-page">
    <div class="content">
      <div v-if="!selectedTask" class="task-selection">
        <h2 class="section-title">Select a Task</h2>
        <TaskList
          :tasks="pendingTasks"
          :is-loading="isTasksLoading"
          :error="tasksError"
          @select="selectTask"
        />
      </div>

      <div v-else class="pomodoro-section">
        <div class="task-info">
          <h2 class="task-name">{{ selectedTask.name }}</h2>
          <p v-if="selectedTask.description" class="task-description">
            {{ selectedTask.description }}
          </p>
          <div class="task-stats">
            <span>📝 {{ selectedTask.estimatedPomodoros }} estimated</span>
            <span>✅ {{ selectedTask.actualPomodoros }} completed</span>
          </div>
          <button @click="selectedTask = null" class="change-task-btn">
            Change Task
          </button>
        </div>

        <PomodoroTimer
          v-if="hasActiveSession"
          :remaining="timerState.remaining"
          :elapsed="timerState.elapsed"
          :progress="timerState.progress"
          :is-running="isTimerRunning"
          :is-paused="timerState.isPaused"
          :task-name="selectedTask.name"
        />

        <TimerControls
          :has-active-session="hasActiveSession"
          :is-paused="timerState.isPaused"
          :is-loading="isPomodoroLoading"
          :completed-today="completedSessionsToday"
          @start="handleStart"
          @pause="handlePause"
          @resume="handleResume"
          @complete="handleComplete"
          @cancel="handleCancel"
        />

        <BreakNotification
          :show="showBreakNotification"
          :suggested-break="suggestedBreak"
          @close="showBreakNotification = false"
          @start-break="handleStartBreak"
          @continue-working="showBreakNotification = false"
        />

        <BreakTimer
          v-if="hasActiveBreak"
          :type="breakTimerState.type"
          :remaining="breakTimerState.remaining"
          @stop="handleStopBreak"
          @extend="handleExtendBreak"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useTasks } from '../composables/useTasks';
import { usePomodoro } from '../composables/usePomodoro';
import { useNotifications } from '../composables/useNotifications';
import TaskList from '../components/tasks/TaskList.vue';
import PomodoroTimer from '../components/pomodoro/PomodoroTimer.vue';
import TimerControls from '../components/pomodoro/TimerControls.vue';
import BreakNotification from '../components/pomodoro/BreakNotification.vue';
import BreakTimer from '../components/pomodoro/BreakTimer.vue';
import type { Task } from '../stores/taskStore';

const route = useRoute();

const {
  pendingTasks,
  fetchTasks,
  getTaskById,
  isLoading: isTasksLoading,
  error: tasksError
} = useTasks();

const {
  hasActiveSession,
  timerState,
  breakTimerState,
  hasActiveBreak,
  formattedBreakRemaining,
  isTimerRunning,
  completedSessionsToday,
  startPomodoro,
  completePomodoro,
  pausePomodoro,
  resumePomodoro,
  fetchSuggestedBreak,
  startBreak,
  stopBreak,
  extendBreak,
  isLoading: isPomodoroLoading,
} = usePomodoro();

const { requestPermission } = useNotifications();

const selectedTask = ref<Task | null>(null);
const showBreakNotification = ref(false);
const suggestedBreak = ref<any>(null);

const selectTask = (task: Task) => {
  selectedTask.value = task;
};

const handleStart = async () => {
  if (!selectedTask.value) return;

  // Request notification permission on first start
  await requestPermission();

  try {
    await startPomodoro({
      taskId: selectedTask.value._id,
    });
  } catch (err) {
    console.error('Failed to start Pomodoro:', err);
  }
};

const handlePause = async () => {
  try {
    await pausePomodoro();
  } catch (err) {
    console.error('Failed to pause Pomodoro:', err);
  }
};

const handleResume = () => {
  resumePomodoro();
};

const handleComplete = async () => {
  try {
    await completePomodoro();

    // Fetch suggested break
    const breakSuggestion = await fetchSuggestedBreak();
    suggestedBreak.value = breakSuggestion;
    showBreakNotification.value = true;

    // Refresh task to show updated actual pomodoros
    await fetchTasks();
    if (selectedTask.value) {
      const updated = getTaskById(selectedTask.value._id);
      if (updated) {
        selectedTask.value = updated;
      }
    }
  } catch (err) {
    console.error('Failed to complete Pomodoro:', err);
  }
};

const handleCancel = async () => {
  if (confirm('Are you sure you want to cancel this Pomodoro?')) {
    try {
      await pausePomodoro();
    } catch (err) {
      console.error('Failed to cancel Pomodoro:', err);
    }
  }
};

const handleStartBreak = () => {
  showBreakNotification.value = false;
  if (!suggestedBreak.value) return;

  // Convert duration from minutes to milliseconds
  const durationMs = suggestedBreak.value.duration * 60 * 1000;
  startBreak(suggestedBreak.value.type, durationMs);
};

const handleStopBreak = () => {
  stopBreak();
};

const handleExtendBreak = () => {
  // Extend by 5 minutes
  extendBreak(5 * 60 * 1000);
};

onMounted(async () => {
  await fetchTasks();

  // If taskId in query params, select that task
  const taskId = route.query.taskId as string;
  if (taskId) {
    const task = getTaskById(taskId);
    if (task) {
      selectedTask.value = task;
    }
  }
});
</script>

<style scoped>
.apply-mode-page {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 2rem;
}

.content {
  max-width: 800px;
  margin: 0 auto;
}

.task-selection {
  background: white;
  border-radius: 12px;
  padding: 2rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #111827;
  margin-bottom: 1.5rem;
}

.pomodoro-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
}

.task-info {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #e5e7eb;
}

.task-name {
  font-size: 2rem;
  font-weight: bold;
  color: #111827;
  margin-bottom: 0.5rem;
}

.task-description {
  color: #6b7280;
  margin-bottom: 1rem;
}

.task-stats {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-bottom: 1rem;
  color: #6b7280;
}

.change-task-btn {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.change-task-btn:hover {
  background: #e5e7eb;
}
</style>
