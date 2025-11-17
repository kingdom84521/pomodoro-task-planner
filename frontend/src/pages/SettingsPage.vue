<template>
  <div class="settings-page">
    <div class="container">
      <h1 class="page-title">Settings</h1>

      <div v-if="loading" class="loading">Loading configuration...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>

      <div v-else class="settings-form">
        <div class="section">
          <h2 class="section-title">Pomodoro Timer</h2>
          <p class="section-description">Configure your work and break durations</p>

          <div class="form-group">
            <label for="pomodoroDuration">Pomodoro Duration (minutes)</label>
            <input
              id="pomodoroDuration"
              v-model.number="formData.pomodoroDuration"
              type="number"
              min="5"
              max="120"
              class="form-input"
            />
            <p class="help-text">
              Current: {{ formatDuration(formData.pomodoroDuration) }}
            </p>
          </div>

          <div class="form-group">
            <label for="shortBreak">Short Break (minutes)</label>
            <input
              id="shortBreak"
              v-model.number="formData.shortBreak"
              type="number"
              min="1"
              max="30"
              class="form-input"
            />
            <p class="help-text">
              Current: {{ formatDuration(formData.shortBreak) }}
            </p>
          </div>

          <div class="form-group">
            <label for="longBreak">Long Break (minutes)</label>
            <input
              id="longBreak"
              v-model.number="formData.longBreak"
              type="number"
              min="5"
              max="60"
              class="form-input"
            />
            <p class="help-text">
              Current: {{ formatDuration(formData.longBreak) }}
            </p>
          </div>

          <div class="form-group">
            <label for="longBreakInterval">Long Break Interval</label>
            <input
              id="longBreakInterval"
              v-model.number="formData.longBreakInterval"
              type="number"
              min="2"
              max="10"
              class="form-input"
            />
            <p class="help-text">
              Take a long break after {{ formData.longBreakInterval }} pomodoros
            </p>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Daily Usage Window (Optional)</h2>
          <p class="section-description">Set working hours to limit timer usage</p>

          <div class="form-group">
            <label for="dailyUsageStart">Start Time (HH:MM)</label>
            <input
              id="dailyUsageStart"
              v-model="formData.dailyUsageStart"
              type="time"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="dailyUsageEnd">End Time (HH:MM)</label>
            <input
              id="dailyUsageEnd"
              v-model="formData.dailyUsageEnd"
              type="time"
              class="form-input"
            />
          </div>
        </div>

        <div class="form-actions">
          <button
            @click="handleSave"
            :disabled="saving"
            class="btn btn-primary"
          >
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
          <button
            @click="handleReset"
            :disabled="saving"
            class="btn btn-secondary"
          >
            Reset to Defaults
          </button>
          <button
            @click="handleCancel"
            :disabled="saving"
            class="btn btn-ghost"
          >
            Cancel
          </button>
        </div>

        <div v-if="saveSuccess" class="success-message">
          Settings saved successfully!
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  fetchConfiguration,
  updateConfiguration,
  resetConfiguration,
  type Configuration
} from '../services/configurationApi';

const loading = ref(true);
const saving = ref(false);
const saveSuccess = ref(false);
const error = ref<string | null>(null);

interface FormData {
  pomodoroDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  dailyUsageStart: string;
  dailyUsageEnd: string;
}

const formData = ref<FormData>({
  pomodoroDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  dailyUsageStart: '',
  dailyUsageEnd: '',
});

const originalData = ref<Configuration | null>(null);

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} minutes`;
};

const loadConfiguration = async () => {
  try {
    loading.value = true;
    error.value = null;
    const config = await fetchConfiguration();
    originalData.value = config;

    // Convert milliseconds to minutes
    formData.value = {
      pomodoroDuration: Math.floor(config.pomodoroDuration / 60000),
      shortBreak: Math.floor(config.shortBreak / 60000),
      longBreak: Math.floor(config.longBreak / 60000),
      longBreakInterval: config.longBreakInterval,
      dailyUsageStart: config.dailyUsageStart || '',
      dailyUsageEnd: config.dailyUsageEnd || '',
    };
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to load configuration';
  } finally {
    loading.value = false;
  }
};

const handleSave = async () => {
  try {
    saving.value = true;
    error.value = null;
    saveSuccess.value = false;

    // Convert minutes to milliseconds
    const updates = {
      pomodoroDuration: formData.value.pomodoroDuration * 60000,
      shortBreak: formData.value.shortBreak * 60000,
      longBreak: formData.value.longBreak * 60000,
      longBreakInterval: formData.value.longBreakInterval,
      dailyUsageStart: formData.value.dailyUsageStart || undefined,
      dailyUsageEnd: formData.value.dailyUsageEnd || undefined,
    };

    const config = await updateConfiguration(updates);
    originalData.value = config;
    saveSuccess.value = true;

    // Hide success message after 3 seconds
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to save configuration';
  } finally {
    saving.value = false;
  }
};

const handleReset = async () => {
  if (!confirm('Are you sure you want to reset to default settings?')) {
    return;
  }

  try {
    saving.value = true;
    error.value = null;
    saveSuccess.value = false;

    const config = await resetConfiguration();
    originalData.value = config;

    // Update form data
    formData.value = {
      pomodoroDuration: Math.floor(config.pomodoroDuration / 60000),
      shortBreak: Math.floor(config.shortBreak / 60000),
      longBreak: Math.floor(config.longBreak / 60000),
      longBreakInterval: config.longBreakInterval,
      dailyUsageStart: config.dailyUsageStart || '',
      dailyUsageEnd: config.dailyUsageEnd || '',
    };

    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err: any) {
    error.value = err.response?.data?.error?.message || 'Failed to reset configuration';
  } finally {
    saving.value = false;
  }
};

const handleCancel = () => {
  if (originalData.value) {
    formData.value = {
      pomodoroDuration: Math.floor(originalData.value.pomodoroDuration / 60000),
      shortBreak: Math.floor(originalData.value.shortBreak / 60000),
      longBreak: Math.floor(originalData.value.longBreak / 60000),
      longBreakInterval: originalData.value.longBreakInterval,
      dailyUsageStart: originalData.value.dailyUsageStart || '',
      dailyUsageEnd: originalData.value.dailyUsageEnd || '',
    };
  }
};

onMounted(() => {
  loadConfiguration();
});
</script>

<style scoped>
.settings-page {
  min-height: calc(100vh - 60px);
  background: #f9fafb;
  padding: 2rem 1rem;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  color: #111827;
  margin-bottom: 2rem;
}

.loading,
.error-message {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.error-message {
  color: #ef4444;
  background: #fee2e2;
  border-radius: 8px;
}

.settings-form {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
}

.section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.section-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.help-text {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.form-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5568d3;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-ghost {
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-ghost:hover:not(:disabled) {
  background: #f9fafb;
}

.success-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #d1fae5;
  color: #065f46;
  border-radius: 6px;
  font-weight: 500;
}

@media (max-width: 640px) {
  .settings-page {
    padding: 1rem 0.5rem;
  }

  .settings-form {
    padding: 1.5rem 1rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
