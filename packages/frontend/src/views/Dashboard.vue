<template>
  <div class="dashboard-page">
    <div class="dashboard-content">
      <TodayRoutineList />
      <TodayMeetingList />
    </div>
  </div>
</template>

<script setup>
import TodayRoutineList from '../components/TodayRoutineList.vue'
import TodayMeetingList from '../components/TodayMeetingList.vue'
</script>

<style scoped>
.dashboard-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>
