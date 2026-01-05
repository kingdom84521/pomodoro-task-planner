<template>
  <div class="weekday-selector">
    <div
      v-for="day in weekdays"
      :key="day.value"
      class="weekday-item"
      :class="{ active: isActive(day.value) }"
      @click="toggle(day.value)"
    >
      {{ day.label }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: [Array, Number],
    default: () => [],
  },
  single: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const weekdays = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
]

const isActive = (value) => {
  if (props.single) {
    return props.modelValue === value
  }
  return Array.isArray(props.modelValue) && props.modelValue.includes(value)
}

const toggle = (value) => {
  if (props.single) {
    // 單選模式：直接設定值
    emit('update:modelValue', value)
  } else {
    // 多選模式：切換
    const current = [...(props.modelValue || [])]
    const index = current.indexOf(value)
    if (index === -1) {
      current.push(value)
    } else {
      current.splice(index, 1)
    }
    emit('update:modelValue', current)
  }
}
</script>

<style scoped>
.weekday-selector {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.weekday-item {
  width: 36px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
  background: #fff;
  color: #606266;
  border-right: 1px solid #dcdfe6;

  &:last-child {
    border-right: none;
  }

  &:hover:not(.active) {
    background: #f5f7fa;
  }

  &.active {
    background: #409eff;
    color: #fff;
  }
}
</style>
