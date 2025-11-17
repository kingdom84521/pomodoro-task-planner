<template>
  <div class="home-page">
    <div class="hero">
      <h1 class="title">🍅 Pomodoro Task Planner</h1>
      <p class="subtitle">Master your time with focused work sessions</p>

      <div v-if="!isAuthenticated" class="cta-buttons">
        <router-link to="/register">
          <AppButton variant="primary" size="lg">Get Started</AppButton>
        </router-link>
        <router-link to="/login">
          <AppButton variant="ghost" size="lg">Login</AppButton>
        </router-link>
      </div>

      <div v-else class="dashboard-link">
        <router-link to="/tasks">
          <AppButton variant="primary" size="lg">Go to Dashboard</AppButton>
        </router-link>
      </div>
    </div>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">📋</div>
        <h3>Task Management</h3>
        <p>Organize your work with simple, effective task lists</p>
      </div>
      <div class="feature">
        <div class="feature-icon">⏱️</div>
        <h3>Pomodoro Timer</h3>
        <p>Focus for 25 minutes, break for 5 - proven productivity technique</p>
      </div>
      <div class="feature">
        <div class="feature-icon">📊</div>
        <h3>Track Progress</h3>
        <p>Monitor your productivity and estimate accuracy</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuth } from '../composables/useAuth';
import AppButton from '../components/common/AppButton.vue';

const { isAuthenticated } = useAuth();
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.hero {
  text-align: center;
  color: white;
  padding: 4rem 2rem;
}

.title {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-buttons, .dashboard-link {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 4rem auto;
}

.feature {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
}

.feature p {
  color: #6b7280;
}
</style>
