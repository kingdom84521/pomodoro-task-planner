import apiClient from './axios'

/**
 * Get user settings
 * @returns {Promise<{settings_data: string|null}>}
 */
export const getUserSettings = async () => {
  const response = await apiClient.get('/user-settings')
  return response.data.data
}

/**
 * Update user settings
 * @param {string} settingsData - Base64 encoded settings data
 */
export const updateUserSettings = async (settingsData) => {
  return apiClient.put('/user-settings', { settings_data: settingsData })
}

export default {
  getUserSettings,
  updateUserSettings,
}
