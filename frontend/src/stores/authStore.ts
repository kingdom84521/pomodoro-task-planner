import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  _id: string;
  email: string;
  name: string;
  timezone: string;
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const isInitialized = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value);

  // Actions
  const initialize = async (): Promise<void> => {
    // Load auth state from localStorage
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        token.value = storedToken;
        user.value = JSON.parse(storedUser);
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        logout();
      }
    }

    isInitialized.value = true;
  };

  const login = (userData: User, authToken: string): void => {
    user.value = userData;
    token.value = authToken;

    // Persist to localStorage
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = (): void => {
    user.value = null;
    token.value = null;

    // Clear localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  };

  const updateUser = (userData: Partial<User>): void => {
    if (user.value) {
      user.value = { ...user.value, ...userData };
      localStorage.setItem('user', JSON.stringify(user.value));
    }
  };

  const setLoading = (value: boolean): void => {
    loading.value = value;
  };

  const setError = (errorMessage: string | null): void => {
    error.value = errorMessage;
  };

  const clearError = (): void => {
    error.value = null;
  };

  return {
    // State
    user,
    token,
    isInitialized,
    loading,
    error,

    // Getters
    isAuthenticated,

    // Actions
    initialize,
    login,
    logout,
    updateUser,
    setLoading,
    setError,
    clearError,
  };
});
