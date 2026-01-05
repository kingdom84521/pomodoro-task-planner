<template>
  <div class="time-settings">
    <div class="page-header">
      <h2 class="page-title">時間設定</h2>
    </div>

    <!-- Quarter settings locked warning -->
    <el-alert
      v-if="!quarterSettingsStatus.canModify"
      type="warning"
      :closable="false"
      class="settings-locked-alert"
    >
      <template #title>
        當前時段已有工作紀錄，季度設定已鎖定
      </template>
      <template #default>
        下次可修改時間：{{ quarterSettingsStatus.nextModifiableDate }}
      </template>
    </el-alert>

    <el-form label-width="180px" style="max-width: 500px">
      <!-- 一季長度 -->
      <el-form-item label="一季長度（月）">
        <el-input-number
          v-model="formData.quarterMonths"
          :min="1"
          :max="12"
          :step="1"
          :disabled="!quarterSettingsStatus.canModify"
          @change="handleChange"
        />
      </el-form-item>

      <!-- 季度起始日 -->
      <el-form-item label="季度起始日" :error="quarterDateError">
        <div class="date-selectors">
          <el-select
            v-model="formData.quarterStartMonth"
            placeholder="月"
            style="width: 100px"
            :disabled="!quarterSettingsStatus.canModify"
            @change="handleQuarterDateChange"
          >
            <el-option
              v-for="m in 12"
              :key="m"
              :label="`${m} 月`"
              :value="m"
            />
          </el-select>
          <el-select
            v-model="formData.quarterStartDay"
            placeholder="日"
            style="width: 100px"
            :disabled="!quarterSettingsStatus.canModify"
            @change="handleQuarterDateChange"
          >
            <el-option
              v-for="d in daysInMonth"
              :key="d"
              :label="`${d} 日`"
              :value="d"
            />
          </el-select>
        </div>
      </el-form-item>

      <!-- 工作時段 -->
      <el-form-item label="每日工作時段">
        <div class="time-range">
          <el-time-picker
            v-model="formData.workStart"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="開始時間"
            @change="handleChange"
          />
          <span class="time-separator">至</span>
          <el-time-picker
            v-model="formData.workEnd"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="結束時間"
            @change="handleChange"
          />
        </div>
      </el-form-item>

      <!-- 工作日 -->
      <el-form-item label="工作日">
        <WeekdaySelector v-model="formData.workDays" @update:model-value="handleChange" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserSettingsStore } from '../../stores/userSettings'
import { getQuarterSettingsStatus } from '../../api/analytics'
import WeekdaySelector from '../../components/WeekdaySelector.vue'

const settingsStore = useUserSettingsStore()

// Form data
const formData = ref({
  quarterMonths: 3,
  quarterStartMonth: 1,
  quarterStartDay: 1,
  workStart: '09:00',
  workEnd: '18:00',
  workDays: [1, 2, 3, 4, 5],
})

// Quarter settings status
const quarterSettingsStatus = ref({
  canModify: true,
  nextModifiableDate: null,
  minAllowedDate: null,
})

// Calculate days in selected month (non-leap year for simplicity)
const daysInMonth = computed(() => {
  const month = formData.value.quarterStartMonth
  const daysPerMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 31, 31]
  return daysPerMonth[month - 1] || 31
})

// Compute quarter date error
const quarterDateError = computed(() => {
  if (!quarterSettingsStatus.value.canModify) return ''
  if (!quarterSettingsStatus.value.minAllowedDate) return ''

  const minDate = quarterSettingsStatus.value.minAllowedDate
  const selectedMonth = formData.value.quarterStartMonth
  const selectedDay = formData.value.quarterStartDay

  // Compare month/day (month is 1-based)
  if (
    selectedMonth < minDate.month ||
    (selectedMonth === minDate.month && selectedDay < minDate.day)
  ) {
    return `季度起始日不能早於 ${minDate.month}/${minDate.day}，請選擇更晚的日期`
  }

  return ''
})

// Check if quarter date is valid
const isQuarterDateValid = computed(() => quarterDateError.value === '')

// Watch for month change to adjust day if needed
watch(() => formData.value.quarterStartMonth, () => {
  if (formData.value.quarterStartDay > daysInMonth.value) {
    formData.value.quarterStartDay = daysInMonth.value
  }
})

// Load settings from store
const loadSettings = () => {
  const settings = settingsStore.timeSettings
  formData.value = {
    quarterMonths: settings.quarterMonths,
    quarterStartMonth: settings.quarterStartDate.month,
    quarterStartDay: settings.quarterStartDate.day,
    workStart: settings.workHours.start,
    workEnd: settings.workHours.end,
    workDays: [...settings.workDays],
  }
}

// Fetch quarter settings status from API
const fetchQuarterSettingsStatus = async () => {
  try {
    const settings = settingsStore.timeSettings
    const response = await getQuarterSettingsStatus({
      quarterStartMonth: settings.quarterStartDate.month,
      quarterStartDay: settings.quarterStartDate.day,
      quarterMonths: settings.quarterMonths,
    })
    quarterSettingsStatus.value = response
  } catch (error) {
    console.error('Failed to fetch quarter settings status:', error)
    // Default to allowing modification if API fails
    quarterSettingsStatus.value = {
      canModify: true,
      nextModifiableDate: null,
      minAllowedDate: null,
    }
  }
}

// Handle quarter date change - only save if valid
const handleQuarterDateChange = () => {
  if (isQuarterDateValid.value) {
    handleChange()
  }
}

// Handle any change - auto save
const handleChange = () => {
  settingsStore.updateTimeSettings({
    quarterMonths: formData.value.quarterMonths,
    quarterStartDate: {
      month: formData.value.quarterStartMonth,
      day: formData.value.quarterStartDay,
    },
    workHours: {
      start: formData.value.workStart,
      end: formData.value.workEnd,
    },
    workDays: formData.value.workDays,
  })
}

onMounted(async () => {
  loadSettings()
  await fetchQuarterSettingsStatus()
})
</script>

<style scoped>
.time-settings {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .page-header {
    margin-bottom: 24px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
  }

  .settings-locked-alert {
    margin-bottom: 24px;
  }

  .date-selectors {
    display: flex;
    gap: 8px;
  }

  .time-range {
    display: flex;
    align-items: center;
    gap: 8px;

    .time-separator {
      color: #909399;
    }
  }
}
</style>
