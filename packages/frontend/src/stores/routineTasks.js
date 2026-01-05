import { defineStore } from 'pinia'
import {
  getRoutineTasks,
  getTodayInstances,
  createRoutineTask,
  updateRoutineTask,
  deleteRoutineTask,
  completeInstance,
  skipInstance,
  uncompleteInstance,
  executeInstanceNow,
} from '../api/routineTasks.js'

export const useRoutineTasksStore = defineStore('routineTasks', {
  state: () => ({
    // All routine task definitions
    routineTasks: [],

    // Today's instances with task info
    todayInstances: [],

    // Loading states
    loading: false,
    loadingToday: false,
  }),

  getters: {
    /**
     * Get active routine tasks only
     */
    activeRoutineTasks: (state) => {
      return (state.routineTasks || []).filter((task) => task.is_active)
    },

    /**
     * Get pending instances for today
     */
    pendingToday: (state) => {
      return (state.todayInstances || []).filter((inst) => inst.status === 'pending')
    },

    /**
     * Get completed instances for today
     */
    completedToday: (state) => {
      return (state.todayInstances || []).filter((inst) => inst.status === 'completed')
    },

    /**
     * Get skipped instances for today
     */
    skippedToday: (state) => {
      return (state.todayInstances || []).filter((inst) => inst.status === 'skipped')
    },

    /**
     * Count of pending + completed today
     */
    todayProgress: (state) => {
      const instances = state.todayInstances || []
      const total = instances.length
      const completed = instances.filter((inst) => inst.status === 'completed').length
      return { completed, total }
    },
  },

  actions: {
    /**
     * Fetch all routine task definitions
     */
    async fetchRoutineTasks() {
      this.loading = true
      try {
        const response = await getRoutineTasks()
        this.routineTasks = response.data.routine_tasks
      } catch (error) {
        console.error('Failed to fetch routine tasks:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Fetch today's instances
     */
    async fetchTodayInstances() {
      this.loadingToday = true
      try {
        const response = await getTodayInstances()
        this.todayInstances = response.data.instances
      } catch (error) {
        console.error('Failed to fetch today instances:', error)
        throw error
      } finally {
        this.loadingToday = false
      }
    },

    /**
     * Create a new routine task
     * @param {Object} data - Routine task data
     */
    async createRoutineTask(data) {
      try {
        const response = await createRoutineTask(data)
        this.routineTasks.push(response.data.routine_task)

        // Refresh today's instances in case the new task should run today
        this.fetchTodayInstances()

        return response.data.routine_task
      } catch (error) {
        console.error('Failed to create routine task:', error)
        throw error
      }
    },

    /**
     * Update a routine task
     * @param {number} id - Routine task ID
     * @param {Object} data - Updated data
     */
    async updateRoutineTask(id, data) {
      try {
        const response = await updateRoutineTask(id, data)
        const index = this.routineTasks.findIndex((t) => t.id === id)
        if (index !== -1) {
          this.routineTasks[index] = response.data.routine_task
        }

        // Refresh today's instances to sync updated task info
        this.fetchTodayInstances()

        return response.data.routine_task
      } catch (error) {
        console.error('Failed to update routine task:', error)
        throw error
      }
    },

    /**
     * Delete a routine task
     * @param {number} id - Routine task ID
     */
    async deleteRoutineTask(id) {
      try {
        await deleteRoutineTask(id)
        this.routineTasks = this.routineTasks.filter((t) => t.id !== id)
        // Also remove from today's instances
        this.todayInstances = this.todayInstances.filter(
          (inst) => inst.routine_task?.id !== id
        )
      } catch (error) {
        console.error('Failed to delete routine task:', error)
        throw error
      }
    },

    /**
     * Complete an instance
     * @param {number} instanceId - Instance ID
     */
    async completeInstance(instanceId) {
      try {
        const response = await completeInstance(instanceId)
        const index = this.todayInstances.findIndex((inst) => inst.id === instanceId)
        if (index !== -1) {
          this.todayInstances[index] = {
            ...this.todayInstances[index],
            ...response.data.instance,
          }
        }
        return response.data.instance
      } catch (error) {
        console.error('Failed to complete instance:', error)
        throw error
      }
    },

    /**
     * Skip an instance
     * @param {number} instanceId - Instance ID
     */
    async skipInstance(instanceId) {
      try {
        const response = await skipInstance(instanceId)
        const index = this.todayInstances.findIndex((inst) => inst.id === instanceId)
        if (index !== -1) {
          this.todayInstances[index] = {
            ...this.todayInstances[index],
            ...response.data.instance,
          }
        }
        return response.data.instance
      } catch (error) {
        console.error('Failed to skip instance:', error)
        throw error
      }
    },

    /**
     * Uncomplete an instance (set back to pending)
     * @param {number} instanceId - Instance ID
     */
    async uncompleteInstance(instanceId) {
      try {
        const response = await uncompleteInstance(instanceId)
        const index = this.todayInstances.findIndex((inst) => inst.id === instanceId)
        if (index !== -1) {
          this.todayInstances[index] = {
            ...this.todayInstances[index],
            ...response.data.instance,
          }
        }
        return response.data.instance
      } catch (error) {
        console.error('Failed to uncomplete instance:', error)
        throw error
      }
    },

    /**
     * Execute an instance now (clear scheduled_at)
     * @param {number} instanceId - Instance ID
     */
    async executeInstanceNow(instanceId) {
      try {
        const response = await executeInstanceNow(instanceId)
        const index = this.todayInstances.findIndex((inst) => inst.id === instanceId)
        if (index !== -1) {
          this.todayInstances[index] = {
            ...this.todayInstances[index],
            ...response.data.instance,
          }
        }
        return response.data.instance
      } catch (error) {
        console.error('Failed to execute instance now:', error)
        throw error
      }
    },
  },
})
