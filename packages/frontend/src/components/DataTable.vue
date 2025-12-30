<template>
  <div class="data-table-wrapper">
    <el-table
      :data="data"
      border
      stripe
      class="data-table"
      @row-contextmenu="handleRowContextMenu"
    >
      <slot />
    </el-table>
  </div>
</template>

<script setup>
import '../styles/element-plus/override.css'

defineProps({
  data: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['row-contextmenu'])

const handleRowContextMenu = (row, column, event) => {
  emit('row-contextmenu', row, column, event)
}
</script>

<style scoped>
.data-table-wrapper {
  max-height: 100%;
  overflow: auto;
}

.data-table {
  --el-table-header-bg-color: #f5f7fa;
  --el-table-header-text-color: #303133;
  font-size: 14px;
}
</style>
