import { createRouter, createWebHistory, RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

// Lazy-loaded page components (will be created in Phase 3)
const HomePage = () => import('../pages/HomePage.vue');
const LoginPage = () => import('../pages/LoginPage.vue');
const RegisterPage = () => import('../pages/RegisterPage.vue');
const TasksPage = () => import('../pages/TasksPage.vue');
const ApplyModePage = () => import('../pages/ApplyModePage.vue');
const AnalyticsPage = () => import('../pages/AnalyticsPage.vue');
const SettingsPage = () => import('../pages/SettingsPage.vue');
// Phase 2
const GroupsPage = () => import('../pages/GroupsPage.vue');
// User Story 8
const CustomFieldsPage = () => import('../pages/CustomFieldsPage.vue');

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: HomePage,
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { requiresAuth: false, guestOnly: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterPage,
    meta: { requiresAuth: false, guestOnly: true },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: TasksPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/apply',
    name: 'ApplyMode',
    component: ApplyModePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/analytics',
    name: 'Analytics',
    component: AnalyticsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/groups',
    name: 'Groups',
    component: GroupsPage,
    meta: { requiresAuth: true, phase: 2 },
  },
  {
    path: '/custom-fields',
    name: 'CustomFields',
    component: CustomFieldsPage,
    meta: { requiresAuth: true, phase: 1 }, // User Story 8
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

// Navigation guards
router.beforeEach(async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore();

  // Check if route requires authentication
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // Check if route is guest-only (e.g., login, register)
  const guestOnly = to.matched.some(record => record.meta.guestOnly);

  // Wait for auth state to be initialized
  if (!authStore.isInitialized) {
    await authStore.initialize();
  }

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login if authentication required but user not logged in
    next({
      name: 'Login',
      query: { redirect: to.fullPath },
    });
  } else if (guestOnly && authStore.isAuthenticated) {
    // Redirect authenticated users away from guest-only pages
    next({ name: 'Tasks' });
  } else {
    // Proceed to route
    next();
  }
});

export default router;
