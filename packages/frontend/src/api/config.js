import apiClient from './axios'

/**
 * Get config by module name
 * @param {string} moduleName - Config module name (camelCase)
 */
export const getConfig = (moduleName) => {
  return apiClient.get(`/config/${moduleName}`)
}

export default {
  getConfig,
}
