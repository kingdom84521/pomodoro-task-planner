<template>
  <div class="card-table">
    <!-- Header row -->
    <div class="card-table-header">
      <div
        v-for="col in columns"
        :key="col.prop"
        class="card-table-cell"
        :style="getCellStyle(col)"
      >
        {{ col.label }}
      </div>
    </div>

    <!-- Body -->
    <div class="card-table-body">
      <!-- Empty state -->
      <div v-if="!data || data.length === 0" class="card-table-empty">
        {{ emptyText }}
      </div>

      <!-- Data rows -->
      <div
        v-else
        v-for="(row, index) in data"
        :key="row.id || index"
        class="card-table-row"
        @contextmenu.prevent="handleContextMenu(row, $event)"
      >
        <slot name="row" :row="row" :columns="columns" :index="index">
          <!-- Default rendering -->
          <div
            v-for="col in columns"
            :key="col.prop"
            class="card-table-cell"
            :style="getCellStyle(col)"
            @dblclick="handleCellDblClick(row, col.prop, $event)"
          >
            <slot :name="col.prop" :row="row" :value="row[col.prop]">
              {{ row[col.prop] }}
            </slot>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  // Column definitions: [{ prop: 'name', label: '名稱', width: '80px', flex: 1 }]
  columns: {
    type: Array,
    required: true,
  },
  // Data array
  data: {
    type: Array,
    default: () => [],
  },
  // Empty text
  emptyText: {
    type: String,
    default: '暫無資料',
  },
})

const emit = defineEmits(['row-contextmenu', 'row-dblclick', 'row-click', 'cell-dblclick'])

// Get cell style based on column definition
const getCellStyle = (col) => {
  const style = {}
  if (col.width) {
    style.width = col.width
    style.minWidth = col.width
    style.maxWidth = col.width
  }
  if (col.flex) {
    style.flex = col.flex
  }
  if (col.align) {
    style.justifyContent = col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start'
  }
  return style
}

// Handle context menu
const handleContextMenu = (row, event) => {
  emit('row-contextmenu', row, event)
}

// Handle cell double click
const handleCellDblClick = (row, columnProp, event) => {
  emit('cell-dblclick', row, columnProp, event)
}
</script>

<style scoped>
.card-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow: hidden;
}

.card-table-header {
  display: flex;
  padding: 8px 16px;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.card-table-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.card-table-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.2s;
  flex-shrink: 0;
}

.card-table-row:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.card-table-cell {
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-table-cell:first-child {
  padding-left: 0;
}

.card-table-cell:last-child {
  padding-right: 0;
}

.card-table-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #909399;
  font-size: 14px;
}
</style>
