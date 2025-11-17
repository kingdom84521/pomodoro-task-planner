import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { usePomodoroStore } from '../stores/pomodoroStore';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Socket.io event types
 */
export interface PomodoroTickEvent {
  sessionId: string;
  remaining: number;
  elapsed: number;
  progress: number;
}

export interface PomodoroEndEvent {
  sessionId: string;
  taskId: string;
  completed: boolean;
}

export interface NotificationEvent {
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
  title?: string;
  timestamp: string;
}

/**
 * Initialize and connect to Socket.io server
 */
export function connectSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const authStore = useAuthStore();
  const token = authStore.token;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('[Socket.io] Connected to server');
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket.io] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket.io] Connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket.io] Reconnected after', attemptNumber, 'attempts');
  });

  // Pomodoro event handlers
  setupPomodoroEventHandlers();

  // Notification event handlers
  setupNotificationEventHandlers();

  return socket;
}

/**
 * Set up Pomodoro-related event handlers
 */
function setupPomodoroEventHandlers(): void {
  if (!socket) return;

  const pomodoroStore = usePomodoroStore();

  // Timer tick event (server-side timer sync)
  socket.on('pomodoro:tick', (data: PomodoroTickEvent) => {
    console.log('[Socket.io] Pomodoro tick:', data);
    pomodoroStore.updateTimerState({
      remaining: data.remaining,
      elapsed: data.elapsed,
      progress: data.progress,
    });
  });

  // Pomodoro session ended
  socket.on('pomodoro:end', (data: PomodoroEndEvent) => {
    console.log('[Socket.io] Pomodoro ended:', data);
    pomodoroStore.setActiveSession(null);
    pomodoroStore.updateTimerState({
      remaining: 0,
      elapsed: 0,
      progress: 100,
      isRunning: false,
      isPaused: false,
    });

    // Show notification
    if (data.completed) {
      showNotification('Pomodoro Complete!', 'Great work! Time for a break.');
    }
  });

  // Pomodoro session paused
  socket.on('pomodoro:paused', (data: { sessionId: string }) => {
    console.log('[Socket.io] Pomodoro paused:', data);
    pomodoroStore.pauseTimer();
  });

  // Pomodoro session resumed
  socket.on('pomodoro:resumed', (data: { sessionId: string }) => {
    console.log('[Socket.io] Pomodoro resumed:', data);
    pomodoroStore.resumeTimer();
  });
}

/**
 * Set up notification event handlers
 */
function setupNotificationEventHandlers(): void {
  if (!socket) return;

  socket.on('notification', (data: NotificationEvent) => {
    console.log('[Socket.io] Notification:', data);
    showNotification(data.title || 'Notification', data.message, data.type);
  });
}

/**
 * Show browser notification (Web Notifications API)
 */
function showNotification(
  title: string,
  body: string,
  type: 'success' | 'info' | 'warning' | 'error' = 'info'
): void {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return;
  }

  // Request permission if not granted
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: type,
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: type,
        });
      }
    });
  }
}

/**
 * Disconnect from Socket.io server
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket.io] Disconnected');
  }
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Emit a custom event to the server
 */
export function emit(event: string, data?: any): void {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.warn('[Socket.io] Cannot emit event - socket not connected');
  }
}

/**
 * Listen to a custom event from the server
 */
export function on(event: string, callback: (...args: any[]) => void): void {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * Remove event listener
 */
export function off(event: string, callback?: (...args: any[]) => void): void {
  if (socket) {
    socket.off(event, callback);
  }
}

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  emit,
  on,
  off,
};
