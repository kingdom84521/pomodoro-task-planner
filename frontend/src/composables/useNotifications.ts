import { ref, onMounted } from 'vue';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationOptions {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number; // milliseconds
  icon?: string;
}

export interface Notification extends NotificationOptions {
  id: string;
  timestamp: Date;
}

/**
 * Composable for notification management
 * Handles both in-app and browser notifications
 */
export function useNotifications() {
  const notifications = ref<Notification[]>([]);
  const hasPermission = ref(false);

  /**
   * Check and request browser notification permission
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      hasPermission.value = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      hasPermission.value = permission === 'granted';
      return hasPermission.value;
    }

    return false;
  };

  /**
   * Display browser notification
   */
  const displayBrowserNotification = (options: NotificationOptions): void => {
    if (!hasPermission.value) {
      console.warn('No permission for browser notifications');
      return;
    }

    const title = options.title || 'Pomodoro Task Planner';
    const body = options.message;
    const icon = options.icon || '/favicon.ico';

    const notification = new Notification(title, {
      body,
      icon,
      badge: icon,
      tag: options.type || 'info',
      requireInteraction: false,
    });

    // Auto-close after duration
    if (options.duration) {
      setTimeout(() => {
        notification.close();
      }, options.duration);
    }
  };

  /**
   * Show in-app notification
   */
  const showNotification = (options: NotificationOptions): string => {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: options.type || 'info',
      duration: options.duration || 5000,
      ...options,
    };

    notifications.value.push(notification);

    // Auto-remove after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, notification.duration);
    }

    return notification.id;
  };

  /**
   * Remove notification by ID
   */
  const removeNotification = (id: string): void => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index !== -1) {
      notifications.value.splice(index, 1);
    }
  };

  /**
   * Clear all notifications
   */
  const clearAll = (): void => {
    notifications.value = [];
  };

  /**
   * Show success notification
   */
  const success = (message: string, title?: string): void => {
    showNotification({ message, title, type: 'success' });

    if (hasPermission.value) {
      displayBrowserNotification({ message, title, type: 'success' });
    }
  };

  /**
   * Show info notification
   */
  const info = (message: string, title?: string): void => {
    showNotification({ message, title, type: 'info' });

    if (hasPermission.value) {
      displayBrowserNotification({ message, title, type: 'info' });
    }
  };

  /**
   * Show warning notification
   */
  const warning = (message: string, title?: string): void => {
    showNotification({ message, title, type: 'warning' });

    if (hasPermission.value) {
      displayBrowserNotification({ message, title, type: 'warning' });
    }
  };

  /**
   * Show error notification
   */
  const error = (message: string, title?: string): void => {
    showNotification({ message, title, type: 'error', duration: 7000 });

    if (hasPermission.value) {
      displayBrowserNotification({ message, title, type: 'error' });
    }
  };

  /**
   * Check permission status on mount
   */
  onMounted(() => {
    if ('Notification' in window) {
      hasPermission.value = Notification.permission === 'granted';
    }
  });

  return {
    // State
    notifications,
    hasPermission,

    // Actions
    showNotification,
    removeNotification,
    clearAll,
    requestPermission,
    displayBrowserNotification,

    // Shortcuts
    success,
    info,
    warning,
    error,
  };
}
