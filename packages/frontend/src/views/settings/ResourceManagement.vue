<template>
  <div class="resource-management">
    <div class="page-header">
      <h2 class="page-title">資源管理</h2>
      <el-button type="primary" @click="openCreateDialog" :disabled="totalPercentage >= 100">新增資源</el-button>
    </div>

    <el-table :data="resources" border style="width: 60%" empty-text="尚無資源分群">
      <el-table-column prop="name" label="資源名稱" min-width="35" />
      <el-table-column prop="percentage_limit" label="百分比上限 (%)" min-width="30" align="center">
        <template #default="{ row }">
          {{ row.percentage_limit }}%
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="35" align="center">
        <template #default="{ row }">
          <el-button size="small" @click="openEditDialog(row)">編輯</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row)">刪除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/編輯對話框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增資源' : '編輯資源'"
      width="500px"
    >
      <el-form :model="formData" label-width="120px">
        <el-form-item label="資源名稱">
          <el-input v-model="formData.name" placeholder="請輸入資源名稱" />
        </el-form-item>
        <el-form-item label="百分比上限 (%)" :error="exceedsLimit ? `超過上限，最多可設定 ${maxAvailablePercentage}%` : ''">
          <el-input-number
            v-model="formData.percentage_limit"
            :min="0"
            :max="100"
            :step="5"
            :class="{ 'is-error': exceedsLimit }"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :disabled="exceedsLimit">確定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getResourceGroups,
  createResourceGroup,
  updateResourceGroup,
  deleteResourceGroup,
} from '../../api/resourceGroups'

// 資源列表
const resources = ref([])

// 對話框狀態
const dialogVisible = ref(false)
const dialogMode = ref('create') // 'create' or 'edit'
const formData = ref({
  id: null,
  name: '',
  percentage_limit: 20,
})

// 計算所有資源的總百分比
const totalPercentage = computed(() => {
  return resources.value.reduce((sum, r) => sum + r.percentage_limit, 0)
})

// 計算其他資源的總百分比（排除正在編輯的資源）
const otherResourcesTotal = computed(() => {
  return resources.value
    .filter(r => r.id !== formData.value.id)
    .reduce((sum, r) => sum + r.percentage_limit, 0)
})

// 計算可用的最大百分比
const maxAvailablePercentage = computed(() => {
  return 100 - otherResourcesTotal.value
})

// 檢查是否超過 100%
const exceedsLimit = computed(() => {
  return formData.value.percentage_limit > maxAvailablePercentage.value
})

// 載入資源分群
const loadResources = async () => {
  try {
    const response = await getResourceGroups()
    resources.value = response.data.resource_groups
  } catch (error) {
    console.error('Failed to load resource groups:', error)
    ElMessage.error('載入資源分群失敗')
  }
}

// 開啟對話框
const openDialog = (mode, row = null) => {
  dialogMode.value = mode
  formData.value = row
    ? { id: row.id, name: row.name, percentage_limit: row.percentage_limit }
    : { id: null, name: '', percentage_limit: 20 }
  dialogVisible.value = true
}
const openCreateDialog = () => openDialog('create')
const openEditDialog = (row) => openDialog('edit', row)

// 儲存資源
const handleSave = async () => {
  if (!formData.value.name) {
    ElMessage.warning('請輸入資源名稱')
    return
  }

  try {
    if (dialogMode.value === 'create') {
      // 新增資源
      await createResourceGroup({
        name: formData.value.name,
        percentage_limit: formData.value.percentage_limit,
      })
      ElMessage.success('新增資源成功')
    } else {
      // 編輯資源
      await updateResourceGroup(formData.value.id, {
        name: formData.value.name,
        percentage_limit: formData.value.percentage_limit,
      })
      ElMessage.success('更新資源成功')
    }

    // 重新載入資料
    await loadResources()
    dialogVisible.value = false
  } catch (error) {
    console.error('Failed to save resource group:', error)
    ElMessage.error('儲存資源失敗')
  }
}

// 刪除資源
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `確定要刪除資源「${row.name}」嗎？`,
    '刪除確認',
    {
      confirmButtonText: '確定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await deleteResourceGroup(row.id)
      ElMessage.success('刪除資源成功')
      await loadResources()
    } catch (error) {
      console.error('Failed to delete resource group:', error)
      ElMessage.error('刪除資源失敗')
    }
  }).catch(() => {})
}

// 初始化載入資料
onMounted(() => {
  loadResources()
})
</script>

<style scoped>
.resource-management {
  background: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }
  }
}

:deep(.el-input-number.is-error) {
  --el-input-border-color: var(--el-color-danger);
  --el-input-hover-border-color: var(--el-color-danger);
  --el-input-focus-border-color: var(--el-color-danger);
}
</style>
