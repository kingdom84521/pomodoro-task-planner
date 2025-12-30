<template>
  <div class="meetings-page">
    <div class="left-panel">
      <el-collapse v-model="activeCollapse">
        <!-- 例行會議 -->
        <el-collapse-item name="recurring" class="collapse-card">
          <template #title>
            <div class="collapse-header">
              <span class="collapse-icon">🔄</span>
              <span class="collapse-title">例行會議</span>
              <el-badge
                :value="recurringMeetings.length"
                :hidden="recurringMeetings.length === 0"
                type="info"
                class="collapse-badge"
              />
            </div>
          </template>
          <RecurringMeetingTable
            :meetings="recurringMeetings"
            :has-active-meeting="hasActiveMeeting"
            @edit="handleEdit"
            @delete="handleDelete"
            @start="handleStart"
          />
        </el-collapse-item>

        <!-- 非例行會議 -->
        <el-collapse-item name="one-time" class="collapse-card">
          <template #title>
            <div class="collapse-header">
              <span class="collapse-icon">📅</span>
              <span class="collapse-title">非例行會議</span>
              <el-badge
                :value="oneTimeMeetings.length"
                :hidden="oneTimeMeetings.length === 0"
                type="info"
                class="collapse-badge"
              />
            </div>
          </template>
          <OneTimeMeetingTable
            :meetings="oneTimeMeetings"
            :has-active-meeting="hasActiveMeeting"
            @edit="handleEdit"
            @delete="handleDelete"
            @start="handleStart"
          />
        </el-collapse-item>
      </el-collapse>
    </div>

    <div class="right-panel">
      <NewMeetingForm @created="handleMeetingCreated" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import RecurringMeetingTable from '../components/RecurringMeetingTable.vue'
import OneTimeMeetingTable from '../components/OneTimeMeetingTable.vue'
import NewMeetingForm from '../components/NewMeetingForm.vue'
import { useMeetingsStore } from '../stores/meetings'

const router = useRouter()
const meetingsStore = useMeetingsStore()

// Component active state (prevents updates during unmount)
const isActive = ref(true)

// Collapse state (recurring expanded by default)
const activeCollapse = ref(['recurring'])

// Meeting lists (guarded to prevent updates during unmount)
const recurringMeetings = computed(() => {
  if (!isActive.value) return []
  return meetingsStore.recurringMeetings || []
})
const oneTimeMeetings = computed(() => {
  if (!isActive.value) return []
  return meetingsStore.oneTimeMeetings || []
})

// Check if there's an active meeting
const hasActiveMeeting = computed(() => meetingsStore.hasActiveMeeting)

// Handle meeting created
const handleMeetingCreated = (meeting) => {
  ElMessage.success('會議已建立')
}

// Handle edit
const handleEdit = async (meeting) => {
  // TODO: Open edit dialog
  ElMessage.info('編輯功能開發中')
}

// Handle delete
const handleDelete = async (meeting) => {
  try {
    await ElMessageBox.confirm(
      `確定要刪除「${meeting.title}」嗎？`,
      '刪除會議',
      {
        confirmButtonText: '確定刪除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await meetingsStore.deleteMeeting(meeting.id)
    ElMessage.success('已刪除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to delete meeting:', error)
      ElMessage.error('刪除失敗')
    }
  }
}

// Handle start meeting
const handleStart = async (meeting) => {
  // Find today's instance for this meeting
  await meetingsStore.fetchTodayMeetings()
  const instance = (meetingsStore.todayMeetings || []).find(
    (m) => m.meeting?.id === meeting.id && m.status === 'pending'
  )

  if (instance) {
    try {
      await meetingsStore.startMeetingInstance(instance)
      router.push('/history')
    } catch (error) {
      console.error('Failed to start meeting:', error)
      ElMessage.error('開始會議失敗')
    }
  } else {
    ElMessage.warning('今日無此會議或會議已開始')
  }
}

onMounted(() => {
  meetingsStore.fetchMeetings()
})

onBeforeUnmount(() => {
  isActive.value = false
})
</script>

<style scoped>
.meetings-page {
  display: flex;
  gap: 20px;
  flex: 1;
  height: 0;
  min-height: 0;

  .left-panel {
    flex: 0 0 70%;
    max-width: 70%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    :deep(.el-collapse) {
      --el-collapse-header-height: 56px;
      --el-collapse-header-bg-color: #ffffff;
      --el-collapse-content-bg-color: #ffffff;
      border: none;
    }

    .collapse-card {
      margin-bottom: 16px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      padding: 0 20px;
    }
  }

  .right-panel {
    flex: 1;
    min-width: 0;
  }
}

.collapse-header {
  display: flex;
  align-items: center;
  gap: 8px;

  .collapse-icon {
    font-size: 18px;
  }

  .collapse-title {
    color: #303133;
  }

  .collapse-badge {
    --el-badge-font-size: 12px;
    margin-left: 4px;
  }
}
</style>
