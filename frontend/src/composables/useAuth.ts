import { computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useRouter } from 'vue-router';
import { register as registerApi, login as loginApi, logout as logoutApi } from '../services/authApi';
import type { RegisterInput, LoginInput } from '../services/authApi';

/**
 * Composable for authentication operations
 * Provides reactive auth state and authentication methods
 */
export function useAuth() {
  const authStore = useAuthStore();
  const router = useRouter();

  // Computed properties
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const currentUser = computed(() => authStore.user);
  const isLoading = computed(() => authStore.loading);

  /**
   * Register a new user
   */
  const register = async (input: RegisterInput): Promise<void> => {
    authStore.setLoading(true);
    authStore.clearError();

    try {
      await registerApi(input);
      // Redirect to tasks page after successful registration
      await router.push({ name: 'Tasks' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      authStore.setError(errorMessage);
      throw error;
    } finally {
      authStore.setLoading(false);
    }
  };

  /**
   * Login an existing user
   */
  const login = async (input: LoginInput): Promise<void> => {
    authStore.setLoading(true);
    authStore.clearError();

    try {
      await loginApi(input);
      // Redirect to tasks page after successful login
      await router.push({ name: 'Tasks' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      authStore.setError(errorMessage);
      throw error;
    } finally {
      authStore.setLoading(false);
    }
  };

  /**
   * Logout the current user
   */
  const logout = async (): Promise<void> => {
    authStore.setLoading(true);

    try {
      await logoutApi();
      // Redirect to login page after logout
      await router.push({ name: 'Login' });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state
      authStore.logout();
      await router.push({ name: 'Login' });
    } finally {
      authStore.setLoading(false);
    }
  };

  /**
   * Initialize auth state (check for existing session)
   */
  const initialize = async (): Promise<void> => {
    await authStore.initialize();
  };

  return {
    // State
    isAuthenticated,
    currentUser,
    isLoading,
    error: computed(() => authStore.error),

    // Actions
    register,
    login,
    logout,
    initialize,
  };
}
