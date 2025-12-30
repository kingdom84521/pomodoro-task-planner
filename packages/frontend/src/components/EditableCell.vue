<template>
  <div class="editable-cell" :class="{ centered: centered }">
    <!-- 編輯模式：文字輸入 -->
    <el-input
      v-if="isEditing && type === 'text'"
      v-model="editValue"
      @blur="saveEdit"
      @keyup.enter="saveEdit"
      @keyup.esc="cancelEdit"
      ref="inputRef"
      class="edit-input"
    />

    <!-- 編輯模式：下拉選單 -->
    <el-select
      v-else-if="isEditing && type === 'select'"
      v-model="editValue"
      @blur="saveEdit"
      @change="saveEdit"
      ref="inputRef"
      class="edit-select"
    >
      <el-option
        v-for="option in options"
        :key="option"
        :label="option"
        :value="option"
      />
    </el-select>

    <!-- 顯示模式：帶標籤的值 -->
    <div v-else-if="tagType" @dblclick="startEdit" class="cell-content">
      <el-tag :type="tagType" size="small">
        {{ value }}
      </el-tag>
    </div>

    <!-- 顯示模式：普通文字 -->
    <div v-else @dblclick="startEdit" class="cell-content">
      {{ value }}
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({
  value: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    validator: (value) => ['text', 'select'].includes(value),
  },
  options: {
    type: Array,
    default: () => [],
  },
  tagType: {
    type: String,
    default: '',
  },
  centered: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['onEdit'])

const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref(null)

// 開始編輯
const startEdit = async () => {
  isEditing.value = true
  editValue.value = props.value

  await nextTick()
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

// 保存編輯
const saveEdit = () => {
  if (editValue.value !== props.value) {
    emit('onEdit', editValue.value)
  }
  isEditing.value = false
}

// 取消編輯
const cancelEdit = () => {
  isEditing.value = false
  editValue.value = ''
}
</script>

<style scoped>
.editable-cell {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  &.centered {
    justify-content: center;
  }

  .cell-content {
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    user-select: none;

    &:hover {
      background-color: #f5f7fa;
    }
  }

  .edit-input,
  .edit-select {
    --el-input-height: 28px;
    width: 100%;
  }
}
</style>
