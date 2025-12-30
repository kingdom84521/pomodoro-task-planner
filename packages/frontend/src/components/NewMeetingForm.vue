<template>
  <div class="new-meeting-form">
    <h3 class="form-title">新增會議</h3>

    <el-form :model="form" label-position="top" @submit.prevent="handleSubmit">
      <el-form-item label="會議名稱" required>
        <el-input v-model="form.title" placeholder="輸入會議名稱" />
      </el-form-item>

      <el-form-item label="類型">
        <el-radio-group v-model="form.meeting_type">
          <el-radio label="recurring">例行</el-radio>
          <el-radio label="one-time">一次性</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="開始時間" required>
        <el-time-select
          v-model="form.scheduled_time"
          start="06:00"
          step="00:15"
          end="23:45"
          placeholder="選擇時間"
          style="width: 100%"
        />
      </el-form-item>

      <!-- Recurrence options (for recurring meetings) -->
      <template v-if="form.meeting_type === 'recurring'">
        <div class="recurrence-section">
          <el-form-item label="週期類型">
            <el-radio-group v-model="recurrenceType">
              <el-radio label="daily">每天</el-radio>
              <el-radio label="weekly">每週</el-radio>
              <el-radio label="interval">每 N 天</el-radio>
              <el-radio label="advanced">進階</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item
            v-if="recurrenceType === 'weekly' || recurrenceType === 'advanced'"
            label="星期"
          >
            <el-checkbox-group v-model="selectedDays">
              <el-checkbox :label="1">一</el-checkbox>
              <el-checkbox :label="2">二</el-checkbox>
              <el-checkbox :label="3">三</el-checkbox>
              <el-checkbox :label="4">四</el-checkbox>
              <el-checkbox :label="5">五</el-checkbox>
              <el-checkbox :label="6">六</el-checkbox>
              <el-checkbox :label="0">日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item v-if="recurrenceType === 'interval'" label="間隔天數">
            <el-input-number
              v-model="intervalDays"
              :min="1"
              :max="365"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item v-if="recurrenceType === 'advanced'" label="週數篩選">
            <el-radio-group v-model="weekFilterType">
              <el-radio label="all">全部</el-radio>
              <el-radio label="odd">奇數週</el-radio>
              <el-radio label="even">偶數週</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
      </template>

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
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { useMeetingsStore } from '../stores/meetings'

const emit = defineEmits(['created'])
const meetingsStore = useMeetingsStore()

const loading = ref(false)

// Form data
const form = reactive({
  title: '',
  meeting_type: 'recurring',
  scheduled_time: '',
  scheduled_date: '',
})

// Recurrence options
const recurrenceType = ref('daily')
const selectedDays = ref([1, 2, 3, 4, 5]) // Default: weekdays
const intervalDays = ref(1)
const weekFilterType = ref('all')

// Build recurrence rule
const buildRecurrenceRule = () => {
  if (form.meeting_type === 'one-time') return null

  const rule = {
    frequency: recurrenceType.value === 'advanced' ? 'weekly' : recurrenceType.value,
  }

  if (recurrenceType.value === 'weekly' || recurrenceType.value === 'advanced') {
    if (selectedDays.value.length > 0) {
      rule.daysOfWeek = [...selectedDays.value].sort((a, b) => a - b)
    }
  }

  if (recurrenceType.value === 'interval') {
    rule.interval = intervalDays.value
  }

  if (recurrenceType.value === 'advanced' && weekFilterType.value !== 'all') {
    rule.weekFilter = {
      type: weekFilterType.value,
    }
  }

  return rule
}

// Handle submit
const handleSubmit = async () => {
  if (!form.title.trim()) {
    ElMessage.warning('請輸入會議名稱')
    return
  }

  if (!form.scheduled_time) {
    ElMessage.warning('請選擇開始時間')
    return
  }

  if (form.meeting_type === 'one-time' && !form.scheduled_date) {
    ElMessage.warning('請選擇日期')
    return
  }

  if (form.meeting_type === 'recurring' &&
      (recurrenceType.value === 'weekly' || recurrenceType.value === 'advanced') &&
      selectedDays.value.length === 0) {
    ElMessage.warning('請至少選擇一天')
    return
  }

  loading.value = true

  try {
    const data = {
      title: form.title.trim(),
      meeting_type: form.meeting_type,
      scheduled_time: form.scheduled_time,
      recurrence_rule: buildRecurrenceRule(),
      scheduled_date: form.meeting_type === 'one-time' ? form.scheduled_date : null,
      is_active: true,
    }

    const meeting = await meetingsStore.createMeeting(data)
    emit('created', meeting)

    // Reset form
    form.title = ''
    form.scheduled_time = ''
    form.scheduled_date = ''
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
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.form-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.new-meeting-form {
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
