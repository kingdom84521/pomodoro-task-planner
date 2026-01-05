<template>
  <div class="new-meeting-form">
    <div class="form-header">
      <h3 class="form-title">新增會議</h3>
    </div>

    <el-form :model="form" label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="會議名稱" required>
        <el-input
          v-model="form.title"
          placeholder="請輸入會議名稱"
          :maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="類型">
        <el-radio-group v-model="form.meeting_type">
          <el-radio label="recurring">例行</el-radio>
          <el-radio label="one-time">一次性</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="開始時間" required>
        <el-time-picker
          v-model="form.scheduled_time"
          placeholder="選擇時間"
          format="HH:mm"
          value-format="HH:mm"
        />
      </el-form-item>

      <!-- Recurrence options (for recurring meetings) -->
      <RecurrenceRuleEditor
        v-if="form.meeting_type === 'recurring'"
        v-model="recurrenceRule"
        class="recurrence-editor-spacing"
      />

      <!-- Date picker (for one-time meetings) -->
      <el-form-item v-if="form.meeting_type === 'one-time'" label="日期" required>
        <el-date-picker
          v-model="form.scheduled_date"
          type="date"
          placeholder="選擇日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%">
          新增會議
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useMeetingsStore } from '../stores/meetings'
import RecurrenceRuleEditor from './RecurrenceRuleEditor.vue'

const emit = defineEmits(['created'])
const meetingsStore = useMeetingsStore()

const loading = ref(false)

// localStorage keys
const STORAGE_KEY_FORM = 'newMeetingForm:formData'
const STORAGE_KEY_RECURRENCE = 'newMeetingForm:recurrenceRule'

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
  return { title: '', meeting_type: 'recurring', scheduled_time: '', scheduled_date: '' }
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

// Form data - initialized from localStorage
const form = ref(loadSavedFormData())

// Recurrence rule (for recurring meetings) - initialized from localStorage
const recurrenceRule = ref(loadSavedRecurrenceRule())

// Watch and save form data to localStorage
watch(form, (newValue) => {
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

// Reset form (also clears localStorage)
const resetForm = () => {
  form.value = {
    title: '',
    meeting_type: 'recurring',
    scheduled_time: '',
    scheduled_date: '',
  }
  recurrenceRule.value = { frequency: 'daily' }
  // Clear localStorage
  localStorage.removeItem(STORAGE_KEY_FORM)
  localStorage.removeItem(STORAGE_KEY_RECURRENCE)
}

// Handle submit
const handleSubmit = async () => {
  if (!form.value.title.trim()) {
    ElMessage.warning('請輸入會議名稱')
    return
  }

  if (!form.value.scheduled_time) {
    ElMessage.warning('請選擇開始時間')
    return
  }

  if (form.value.meeting_type === 'one-time' && !form.value.scheduled_date) {
    ElMessage.warning('請選擇日期')
    return
  }

  // Validate recurrence rule for recurring meetings
  if (form.value.meeting_type === 'recurring') {
    const rule = recurrenceRule.value
    if (rule.frequency === 'weekly' && (!rule.byweekday || rule.byweekday.length === 0)) {
      ElMessage.warning('請至少選擇一天')
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
  }

  loading.value = true

  try {
    const data = {
      title: form.value.title.trim(),
      meeting_type: form.value.meeting_type,
      scheduled_time: form.value.scheduled_time,
      recurrence_rule: form.value.meeting_type === 'recurring' ? recurrenceRule.value : null,
      scheduled_date: form.value.meeting_type === 'one-time' ? form.value.scheduled_date : null,
      is_active: true,
    }

    const meeting = await meetingsStore.createMeeting(data)
    emit('created', meeting)

    // Reset form and clear localStorage
    resetForm()
  } catch (error) {
    console.error('Failed to create meeting:', error)
    ElMessage.error('建立會議失敗')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.new-meeting-form {
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

  .recurrence-editor-spacing {
    margin-bottom: 18px;
  }

  :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }
}
</style>
