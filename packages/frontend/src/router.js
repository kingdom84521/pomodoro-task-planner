import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
import TaskList from './views/TaskList.vue'
import WorkHistory from './views/WorkHistory.vue'
import Statistics from './views/Statistics.vue'
import Meetings from './views/Meetings.vue'
import Settings from './views/Settings.vue'
import PomodoroSettings from './views/settings/PomodoroSettings.vue'
import ResourceManagement from './views/settings/ResourceManagement.vue'
import MeetingSettings from './views/settings/MeetingSettings.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/tasks',
    name: 'TaskList',
    component: TaskList
  },
  {
    path: '/history',
    name: 'WorkHistory',
    component: WorkHistory
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: Statistics
  },
  {
    path: '/meetings',
    name: 'Meetings',
    component: Meetings
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    redirect: '/settings/pomodoro',
    children: [
      {
        path: 'pomodoro',
        name: 'PomodoroSettings',
        component: PomodoroSettings
      },
      {
        path: 'resources',
        name: 'ResourceManagement',
        component: ResourceManagement
      },
      {
        path: 'meetings',
        name: 'MeetingSettings',
        component: MeetingSettings
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
