import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { piniaPersistPlugin } from './plugins/piniaPersist';
import './style.css';

const app = createApp(App);

// Install Pinia (state management) with persistence plugin
const pinia = createPinia();
pinia.use(piniaPersistPlugin);
app.use(pinia);

// Install Vue Router
app.use(router);

// Register Service Worker for background notifications
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[Service Worker] Registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[Service Worker] Registration failed:', error);
      });
  });
}

// Mount app
app.mount('#app');
