import apiClient from './axios'

export const authApi = {
  /**
   * Get current user information
   * Automatically syncs user to backend on first call
   */
  getCurrentUser() {
    return apiClient.get('/auth/me')
  },

  /**
   * Manually sync user data to backend
   */
  syncUser() {
    return apiClient.post('/auth/sync')
  },
}

export default authApi
