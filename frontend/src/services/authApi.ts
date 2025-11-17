import { apiClient, ApiResponse } from './api';
import { useAuthStore } from '../stores/authStore';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResponse> {
  const response = await apiClient.post<ApiResponse<AuthResponse>>(
    '/auth/register',
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Registration failed');
  }

  const { user, token } = response.data.data;

  // Update auth store
  const authStore = useAuthStore();
  authStore.login(user, token);

  return { user, token };
}

/**
 * Login an existing user
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  const response = await apiClient.post<ApiResponse<AuthResponse>>(
    '/auth/login',
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Login failed');
  }

  const { user, token } = response.data.data;

  // Update auth store
  const authStore = useAuthStore();
  authStore.login(user, token);

  return { user, token };
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post<ApiResponse<{ message: string }>>(
      '/auth/logout'
    );
  } catch (error) {
    // Even if server logout fails, clear local state
    console.error('Server logout failed:', error);
  } finally {
    // Always clear auth store
    const authStore = useAuthStore();
    authStore.logout();
  }
}

/**
 * Get current user information
 */
export async function getMe(): Promise<User> {
  const response = await apiClient.get<ApiResponse<{ user: User }>>(
    '/auth/me'
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch user information');
  }

  const { user } = response.data.data;

  // Update auth store
  const authStore = useAuthStore();
  authStore.updateUser(user);

  return user;
}

export default {
  register,
  login,
  logout,
  getMe,
};
