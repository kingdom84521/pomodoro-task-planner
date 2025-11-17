<template>
  <nav class="app-navbar">
    <div class="navbar-container">
      <router-link to="/" class="logo">
        🍅 Pomodoro Planner
      </router-link>

      <div v-if="isAuthenticated" class="nav-links">
        <router-link to="/tasks" class="nav-link">
          📋 Tasks
        </router-link>
        <router-link to="/apply" class="nav-link">
          ⏱️ Pomodoro
        </router-link>
        <router-link to="/settings" class="nav-link">
          ⚙️ Settings
        </router-link>
      </div>

      <div class="user-section">
        <span v-if="isAuthenticated && user" class="user-name">
          {{ user.name }}
        </span>
        <button v-if="isAuthenticated" @click="handleLogout" class="logout-btn">
          Logout
        </button>
        <div v-else class="auth-links">
          <router-link to="/login" class="auth-link">Login</router-link>
          <router-link to="/register" class="auth-link primary">Register</router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuth } from '../../composables/useAuth';
import { useRouter } from 'vue-router';

const { isAuthenticated, user, logout } = useAuth();
const router = useRouter();

const handleLogout = async () => {
  await logout();
  router.push('/');
};
</script>

<style scoped>
.app-navbar {
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
}

.logo {
  font-size: 1.25rem;
  font-weight: bold;
  color: #667eea;
  text-decoration: none;
  white-space: nowrap;
}

.logo:hover {
  color: #764ba2;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex: 1;
}

.nav-link {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-link:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-link.router-link-active {
  background: #667eea;
  color: white;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  color: #6b7280;
  font-size: 0.875rem;
  white-space: nowrap;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.logout-btn:hover {
  background: #dc2626;
}

.auth-links {
  display: flex;
  gap: 0.5rem;
}

.auth-link {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.auth-link:hover {
  background: #f3f4f6;
}

.auth-link.primary {
  background: #667eea;
  color: white;
}

.auth-link.primary:hover {
  background: #764ba2;
}

@media (max-width: 768px) {
  .navbar-container {
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
  }

  .nav-links {
    order: 3;
    width: 100%;
    justify-content: space-around;
    padding-top: 0.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .nav-link {
    padding: 0.5rem;
    font-size: 0.875rem;
  }

  .user-name {
    display: none;
  }
}
</style>
