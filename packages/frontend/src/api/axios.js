import axios from 'axios'
import { ElMessage } from 'element-plus'

const isMockAuth = import.meta.env.VITE_MOCK_AUTH === 'true'
const mockUserId = import.meta.env.VITE_MOCK_USER_ID || '1'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    if (isMockAuth) {
      // Mock mode: Add mock user ID header
      config.headers['X-Mock-User-Id'] = mockUserId
    } else {
      // Production mode: Add JWT token (from OIDC context)
      const auth = window.$auth
      if (auth && auth.isAuthenticated && auth.user?.access_token) {
        config.headers.Authorization = `Bearer ${auth.user.access_token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the response: { success, data } -> return data directly in response.data
    if (response.data && response.data.success && response.data.data !== undefined) {
      response.data = response.data.data
    }
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      if (isMockAuth) {
        ElMessage.error('Mock 認證失敗')
      } else {
        // Token expired in production mode
        const auth = window.$auth
        try {
          await auth.signinSilent()
          // Retry the original request
          return apiClient.request(error.config)
        } catch (refreshError) {
          ElMessage.error('登入已過期，請重新登入')
          await auth.signinRedirect()
        }
      }
    } else if (error.response?.status === 403) {
      ElMessage.error('沒有權限訪問此資源')
    } else if (error.response?.status >= 500) {
      ElMessage.error('伺服器錯誤，請稍後再試')
    } else if (error.message.includes('timeout')) {
      ElMessage.error('請求超時，請檢查網絡連接')
    }

    return Promise.reject(error)
  }
)

// Export method to update mock user ID at runtime
export function setMockUserId(userId) {
  if (isMockAuth) {
    apiClient.defaults.headers['X-Mock-User-Id'] = userId.toString()
  }
}

export default apiClient
