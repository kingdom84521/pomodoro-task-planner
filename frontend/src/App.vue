<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, computed } from 'vue';
import { useAuthStore } from './stores/authStore';
import { connectSocket, disconnectSocket } from './services/socket';
import { useRoute } from 'vue-router';
import AppNavbar from './components/common/AppNavbar.vue';

const authStore = useAuthStore();
const route = useRoute();

onMounted(async () => {
  await authStore.initialize();

  // Connect to Socket.io if authenticated
  if (authStore.isAuthenticated) {
    connectSocket();
  }
});

// Watch for authentication changes and connect/disconnect Socket.io
watch(() => authStore.isAuthenticated, (isAuthenticated) => {
  if (isAuthenticated) {
    connectSocket();
  } else {
    disconnectSocket();
  }
});

onBeforeUnmount(() => {
  disconnectSocket();
});

// Check if current route should show navbar (hide on home page)
const showNavbar = computed(() => route.path !== '/');
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <AppNavbar v-if="showNavbar" />
    <router-view />
  </div>
</template>

<style>
/* Global styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
