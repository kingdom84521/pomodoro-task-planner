import apiClient from './axios'

/**
 * Get all resource groups
 */
export const getResourceGroups = () => {
  return apiClient.get('/resource-groups')
}

/**
 * Create a new resource group
 * @param {Object} data - Resource group data
 * @param {string} data.name - Resource group name
 * @param {number} data.percentage_limit - Percentage limit (0-100)
 */
export const createResourceGroup = (data) => {
  return apiClient.post('/resource-groups', data)
}

/**
 * Update a resource group
 * @param {number} id - Resource group ID
 * @param {Object} data - Updated data
 * @param {string} data.name - Resource group name
 * @param {number} data.percentage_limit - Percentage limit (0-100)
 */
export const updateResourceGroup = (id, data) => {
  return apiClient.put(`/resource-groups/${id}`, data)
}

/**
 * Delete a resource group
 * @param {number} id - Resource group ID
 */
export const deleteResourceGroup = (id) => {
  return apiClient.delete(`/resource-groups/${id}`)
}

export default {
  getResourceGroups,
  createResourceGroup,
  updateResourceGroup,
  deleteResourceGroup,
}
