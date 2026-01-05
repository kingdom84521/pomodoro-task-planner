<template>
  <div class="month-selector">
    <div
      v-for="month in months"
      :key="month.value"
      class="month-item"
      :class="{ active: isActive(month.value) }"
      @click="toggle(month.value)"
    >
      {{ month.label }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue'])

const months = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 9, label: '9' },
  { value: 10, label: '10' },
  { value: 11, label: '11' },
  { value: 12, label: '12' },
]

const isActive = (value) => {
  return Array.isArray(props.modelValue) && props.modelValue.includes(value)
}

const toggle = (value) => {
  const current = [...(props.modelValue || [])]
  const index = current.indexOf(value)
  if (index === -1) {
    current.push(value)
  } else {
    current.splice(index, 1)
  }
  emit('update:modelValue', current)
}
</script>

<style scoped>
.month-selector {
  display: inline-flex;
  flex-wrap: wrap;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
  width: fit-content;
}

.month-item {
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
  border-bottom: 1px solid #dcdfe6;

  &:nth-child(6n) {
    border-right: none;
  }

  &:nth-child(n+7) {
    border-bottom: none;
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
