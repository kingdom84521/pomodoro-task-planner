<template>
  <div class="recurrence-rule-editor">
    <!-- Frequency Selection -->
    <el-form-item label="週期類型">
      <el-radio-group v-model="form.frequency" @change="handleFrequencyChange">
        <el-radio label="daily">每天</el-radio>
        <el-radio label="weekly">每週</el-radio>
        <el-radio label="monthly">每月</el-radio>
        <el-radio label="yearly">每年</el-radio>
        <el-radio label="interval">每 N 天</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- Interval (for all except advanced mode shows every N days) -->
    <el-form-item v-if="form.frequency === 'interval'" label="間隔天數">
      <el-input-number
        v-model="form.interval"
        :min="1"
        :max="365"
        style="width: 100%"
      />
    </el-form-item>

    <!-- Weekly: Day of Week Selection -->
    <el-form-item v-if="showWeekdaySelection" label="星期">
      <WeekdaySelector v-model="form.byweekday" />
    </el-form-item>

    <!-- Weekly: Week Filter -->
    <el-form-item v-if="form.frequency === 'weekly'" label="週數篩選">
      <el-radio-group v-model="form.weekFilterType">
        <el-radio label="all">每週都執行</el-radio>
        <el-radio label="odd">隔週執行（第1、3、5...週）</el-radio>
        <el-radio label="even">隔週執行（第2、4、6...週）</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- Monthly/Yearly: Date Mode Selection -->
    <el-form-item v-if="form.frequency === 'monthly' || form.frequency === 'yearly'" label="日期模式">
      <el-radio-group v-model="form.monthlyMode">
        <el-radio label="date">指定日期</el-radio>
        <el-radio label="weekday">指定星期幾</el-radio>
      </el-radio-group>
    </el-form-item>

    <!-- Monthly/Yearly: Day of Month Selection -->
    <el-form-item
      v-if="(form.frequency === 'monthly' || form.frequency === 'yearly') && form.monthlyMode === 'date'"
      label="日期"
    >
      <el-select
        v-model="form.bymonthday"
        multiple
        placeholder="選擇日期"
        style="width: 100%"
      >
        <el-option
          v-for="day in monthdayOptions"
          :key="day.value"
          :label="day.label"
          :value="day.value"
        />
      </el-select>
    </el-form-item>

    <!-- Monthly/Yearly: Nth Weekday Selection -->
    <template v-if="(form.frequency === 'monthly' || form.frequency === 'yearly') && form.monthlyMode === 'weekday'">
      <el-form-item label="第幾個">
        <el-select v-model="form.nthWeekday.n" placeholder="選擇第幾個" style="width: 100%">
          <el-option :value="1" label="第一個" />
          <el-option :value="2" label="第二個" />
          <el-option :value="3" label="第三個" />
          <el-option :value="4" label="第四個" />
          <el-option :value="5" label="第五個" />
          <el-option :value="-1" label="最後一個" />
          <el-option :value="-2" label="倒數第二個" />
        </el-select>
      </el-form-item>

      <el-form-item label="星期">
        <WeekdaySelector v-model="form.nthWeekday.day" single />
      </el-form-item>
    </template>

    <!-- Yearly: Month Selection -->
    <el-form-item v-if="form.frequency === 'yearly'" label="月份">
      <MonthSelector v-model="form.bymonth" />
    </el-form-item>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import WeekdaySelector from './WeekdaySelector.vue'
import MonthSelector from './MonthSelector.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:modelValue'])

// Flag to prevent circular updates
let isInternalUpdate = false

// Internal form state
const form = ref({
  frequency: 'daily',
  interval: 1,
  byweekday: [],
  bymonthday: [],
  bymonth: [],
  weekFilterType: 'all',
  monthlyMode: 'date', // 'date' or 'weekday'
  nthWeekday: { day: 1, n: 1 }, // For nth weekday selection
})

// Day of month options (1-31 and last day)
const monthdayOptions = computed(() => {
  const options = []
  for (let i = 1; i <= 31; i++) {
    options.push({ value: i, label: `${i} 日` })
  }
  options.push({ value: -1, label: '月底' })
  return options
})

// Show weekday selection for weekly frequency
const showWeekdaySelection = computed(() => {
  return form.value.frequency === 'weekly'
})

// Handle frequency change
const handleFrequencyChange = (frequency) => {
  // Reset relevant fields based on frequency
  if (frequency === 'daily' || frequency === 'interval') {
    form.value.byweekday = []
    form.value.bymonthday = []
    form.value.bymonth = []
    form.value.weekFilterType = 'all'
  } else if (frequency === 'weekly') {
    form.value.bymonthday = []
    form.value.bymonth = []
    form.value.monthlyMode = 'date'
  } else if (frequency === 'monthly') {
    form.value.byweekday = []
    form.value.bymonth = []
    form.value.weekFilterType = 'all'
  } else if (frequency === 'yearly') {
    form.value.byweekday = []
    form.value.weekFilterType = 'all'
  }
}

// Parse recurrence rule to form data
const parseRecurrenceToForm = (rule) => {
  if (!rule) {
    return {
      frequency: 'daily',
      interval: 1,
      byweekday: [],
      bymonthday: [],
      bymonth: [],
      weekFilterType: 'all',
      monthlyMode: 'date',
      nthWeekday: { day: 1, n: 1 },
    }
  }

  // Support legacy format (daysOfWeek -> byweekday)
  const byweekday = rule.byweekday ?? rule.daysOfWeek ?? []
  const bymonthday = rule.bymonthday ?? rule.daysOfMonth ?? []

  // Determine if using nth weekday mode
  const hasNthWeekday = Array.isArray(byweekday) && byweekday.some(d => typeof d === 'object' && d.n !== undefined)

  // Handle legacy 'advanced' frequency
  let frequency = rule.frequency
  if (frequency === 'advanced') {
    frequency = 'weekly'
  }

  // Parse nth weekday
  let nthWeekday = { day: 1, n: 1 }
  let monthlyMode = 'date'
  if (hasNthWeekday && byweekday.length > 0) {
    const first = byweekday[0]
    if (typeof first === 'object') {
      nthWeekday = { day: first.day, n: first.n }
      monthlyMode = 'weekday'
    }
  } else if (bymonthday.length > 0) {
    monthlyMode = 'date'
  }

  return {
    frequency,
    interval: rule.interval || 1,
    byweekday: hasNthWeekday ? [] : byweekday.map(d => typeof d === 'number' ? d : d.day),
    bymonthday: bymonthday,
    bymonth: rule.bymonth || [],
    weekFilterType: rule.weekFilter?.type || 'all',
    monthlyMode,
    nthWeekday,
  }
}

// Build recurrence rule from form data
const buildRecurrenceRule = () => {
  const f = form.value
  const rule = {
    frequency: f.frequency,
  }

  // Handle interval
  if (f.frequency === 'interval') {
    rule.frequency = 'daily'
    rule.interval = f.interval
  } else if (f.interval > 1) {
    rule.interval = f.interval
  }

  // Handle weekly
  if (f.frequency === 'weekly') {
    if (f.byweekday.length > 0) {
      rule.byweekday = [...f.byweekday].sort((a, b) => a - b)
    }
    if (f.weekFilterType !== 'all') {
      rule.weekFilter = { type: f.weekFilterType }
    }
  }

  // Handle monthly
  if (f.frequency === 'monthly') {
    if (f.monthlyMode === 'date') {
      if (f.bymonthday.length > 0) {
        rule.bymonthday = [...f.bymonthday].sort((a, b) => a - b)
      }
    } else if (f.monthlyMode === 'weekday') {
      rule.byweekday = [{ day: f.nthWeekday.day, n: f.nthWeekday.n }]
    }
  }

  // Handle yearly
  if (f.frequency === 'yearly') {
    if (f.bymonth.length > 0) {
      rule.bymonth = [...f.bymonth].sort((a, b) => a - b)
    }
    if (f.monthlyMode === 'date') {
      if (f.bymonthday.length > 0) {
        rule.bymonthday = [...f.bymonthday].sort((a, b) => a - b)
      }
    } else if (f.monthlyMode === 'weekday') {
      rule.byweekday = [{ day: f.nthWeekday.day, n: f.nthWeekday.n }]
    }
  }

  return rule
}

// Format recurrence rule for display
const formatRecurrence = (rule) => {
  if (!rule) return '-'

  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  const monthNames = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const nthNames = { 1: '第一個', 2: '第二個', 3: '第三個', 4: '第四個', 5: '第五個', '-1': '最後一個', '-2': '倒數第二個' }

  const { frequency, interval, weekFilter } = rule
  const byweekday = rule.byweekday ?? rule.daysOfWeek ?? []
  const bymonthday = rule.bymonthday ?? rule.daysOfMonth ?? []
  const bymonth = rule.bymonth ?? []

  let result = ''

  // Base frequency
  switch (frequency) {
    case 'daily':
      result = interval && interval > 1 ? `每 ${interval} 天` : '每天'
      break

    case 'weekly': {
      // Check for week filter
      let suffix = ''
      if (weekFilter?.type === 'odd') suffix = '（隔週）'
      else if (weekFilter?.type === 'even') suffix = '（隔週）'

      if (byweekday.length > 0) {
        const days = byweekday
          .filter(d => typeof d === 'number')
          .map(d => dayNames[d])
          .join('')
        result = `週${days}${suffix}`
      } else {
        result = `每週${suffix}`
      }
      break
    }

    case 'monthly': {
      // Check for nth weekday
      const hasNthWeekday = byweekday.some(d => typeof d === 'object' && d.n !== undefined)
      if (hasNthWeekday && byweekday.length > 0) {
        const { day, n } = byweekday[0]
        result = `每月${nthNames[n]}週${dayNames[day]}`
      } else if (bymonthday.length > 0) {
        const days = bymonthday.map(d => d === -1 ? '月底' : `${d}日`).join('、')
        result = `每月 ${days}`
      } else {
        result = '每月'
      }
      break
    }

    case 'yearly': {
      const months = bymonth.map(m => monthNames[m]).join('、')
      const hasNthWeekday = byweekday.some(d => typeof d === 'object' && d.n !== undefined)

      if (hasNthWeekday && byweekday.length > 0) {
        const { day, n } = byweekday[0]
        result = `每年 ${months} ${nthNames[n]}週${dayNames[day]}`
      } else if (bymonthday.length > 0) {
        const days = bymonthday.map(d => d === -1 ? '月底' : `${d}日`).join('、')
        result = `每年 ${months} ${days}`
      } else if (months) {
        result = `每年 ${months}`
      } else {
        result = '每年'
      }
      break
    }

    case 'interval':
      result = `每 ${interval || 1} 天`
      break

    default:
      result = '-'
  }

  return result
}

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && !isInternalUpdate) {
      const parsed = parseRecurrenceToForm(newValue)
      // Replace the entire form value to ensure reactivity
      form.value = parsed
    }
  },
  { immediate: true, deep: true }
)

// Emit changes when form changes
watch(
  form,
  () => {
    isInternalUpdate = true
    emit('update:modelValue', buildRecurrenceRule())
    nextTick(() => {
      isInternalUpdate = false
    })
  },
  { deep: true }
)

// Expose helper functions for external use
defineExpose({
  parseRecurrenceToForm,
  buildRecurrenceRule,
  formatRecurrence,
})
</script>

<style scoped>
.recurrence-rule-editor {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;

  :deep(.el-form-item) {
    margin-bottom: 0;
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
