import { PiniaPluginContext } from 'pinia';

/**
 * Pinia plugin to persist store state in localStorage
 * Specifically for auth store to maintain login state across page refreshes
 */
export function piniaPersistPlugin({ store }: PiniaPluginContext) {
  // Only persist auth store
  if (store.$id === 'auth') {
    // Restore state from localStorage on initialization
    const savedState = localStorage.getItem(`pinia-${store.$id}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        store.$patch(parsed);
      } catch (error) {
        console.error('Failed to restore Pinia state:', error);
        localStorage.removeItem(`pinia-${store.$id}`);
      }
    }

    // Subscribe to store changes and persist to localStorage
    store.$subscribe((mutation, state) => {
      try {
        // Only persist specific fields for security
        const stateToPersist = {
          user: state.user,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
        };
        localStorage.setItem(`pinia-${store.$id}`, JSON.stringify(stateToPersist));
      } catch (error) {
        console.error('Failed to persist Pinia state:', error);
      }
    });
  }
}
