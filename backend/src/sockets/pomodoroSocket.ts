import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import { IPomodoroSession } from '../models/PomodoroSession';

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

/**
 * Map to store active timers for each session
 * Key: sessionId, Value: NodeJS.Timeout
 */
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Map to store userId to socketId mappings
 * Key: userId, Value: Set of socketIds
 */
const userSockets = new Map<string, Set<string>>();

/**
 * Initialize Pomodoro Socket.io event handlers
 */
export function initializePomodoroSocket(io: SocketIOServer): void {
  io.on('connection', (socket: AuthenticatedSocket) => {
    // Authenticate socket connection
    const token = socket.handshake.auth.token as string;

    if (!token) {
      logger.warn('Socket connection attempted without token', { socketId: socket.id });
      socket.disconnect(true);
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.userId = decoded.userId;
      socket.email = decoded.email;

      logger.info('Authenticated socket connection', {
        socketId: socket.id,
        userId: socket.userId,
        email: socket.email,
      });

      // Store user-socket mapping
      if (!userSockets.has(socket.userId)) {
        userSockets.set(socket.userId, new Set());
      }
      userSockets.get(socket.userId)!.add(socket.id);

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // Handle disconnection
      socket.on('disconnect', () => {
        handleDisconnect(socket);
      });

      // Handle Pomodoro events
      socket.on('pomodoro:subscribe', (data: { sessionId: string }) => {
        handlePomodoroSubscribe(socket, data);
      });

      socket.on('pomodoro:unsubscribe', (data: { sessionId: string }) => {
        handlePomodoroUnsubscribe(socket, data);
      });

    } catch (error) {
      logger.error('Socket authentication failed', {
        socketId: socket.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      socket.disconnect(true);
    }
  });

  logger.info('Pomodoro Socket.io handlers initialized');
}

/**
 * Handle socket disconnection
 */
function handleDisconnect(socket: AuthenticatedSocket): void {
  logger.info('Socket disconnected', {
    socketId: socket.id,
    userId: socket.userId,
  });

  // Remove from user-socket mapping
  if (socket.userId && userSockets.has(socket.userId)) {
    userSockets.get(socket.userId)!.delete(socket.id);
    if (userSockets.get(socket.userId)!.size === 0) {
      userSockets.delete(socket.userId);
    }
  }
}

/**
 * Handle Pomodoro subscription
 */
function handlePomodoroSubscribe(
  socket: AuthenticatedSocket,
  data: { sessionId: string }
): void {
  const { sessionId } = data;
  socket.join(`pomodoro:${sessionId}`);

  logger.info('Socket subscribed to Pomodoro session', {
    socketId: socket.id,
    userId: socket.userId,
    sessionId,
  });

  socket.emit('pomodoro:subscribed', { sessionId });
}

/**
 * Handle Pomodoro unsubscription
 */
function handlePomodoroUnsubscribe(
  socket: AuthenticatedSocket,
  data: { sessionId: string }
): void {
  const { sessionId } = data;
  socket.leave(`pomodoro:${sessionId}`);

  logger.info('Socket unsubscribed from Pomodoro session', {
    socketId: socket.id,
    userId: socket.userId,
    sessionId,
  });

  socket.emit('pomodoro:unsubscribed', { sessionId });
}

/**
 * Start server-side timer for a Pomodoro session
 * Emits tick events every second
 */
export function startPomodoroTimer(
  io: SocketIOServer,
  session: IPomodoroSession
): void {
  const sessionId = (session._id as any).toString();
  const userId = session.userId.toString();

  // Clear any existing timer for this session
  stopPomodoroTimer(sessionId);

  const startTime = new Date(session.startTime).getTime();
  const duration = session.duration;

  logger.info('Starting Pomodoro timer', {
    sessionId,
    userId,
    duration,
  });

  // Create timer that ticks every second
  const timer = setInterval(() => {
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = Math.max(0, duration - elapsed);
    const progress = Math.min(100, (elapsed / duration) * 100);

    // Emit tick event to all connected clients for this user
    io.to(`user:${userId}`).emit('pomodoro:tick', {
      sessionId,
      remaining,
      elapsed,
      progress,
    });

    // Check if timer is complete
    if (remaining <= 0) {
      stopPomodoroTimer(sessionId);

      // Emit end event
      io.to(`user:${userId}`).emit('pomodoro:end', {
        sessionId,
        taskId: session.taskId.toString(),
        completed: session.completed,
      });

      logger.info('Pomodoro timer completed', {
        sessionId,
        userId,
      });
    }
  }, 1000); // Tick every second

  activeTimers.set(sessionId, timer);
}

/**
 * Stop server-side timer for a Pomodoro session
 */
export function stopPomodoroTimer(sessionId: string): void {
  const timer = activeTimers.get(sessionId);

  if (timer) {
    clearInterval(timer);
    activeTimers.delete(sessionId);

    logger.info('Pomodoro timer stopped', { sessionId });
  }
}

/**
 * Emit pause event for a Pomodoro session
 */
export function emitPomodoroPaused(
  io: SocketIOServer,
  userId: string,
  sessionId: string
): void {
  io.to(`user:${userId}`).emit('pomodoro:paused', { sessionId });

  logger.info('Pomodoro paused event emitted', {
    userId,
    sessionId,
  });
}

/**
 * Emit resume event for a Pomodoro session
 */
export function emitPomodoroResumed(
  io: SocketIOServer,
  userId: string,
  sessionId: string
): void {
  io.to(`user:${userId}`).emit('pomodoro:resumed', { sessionId });

  logger.info('Pomodoro resumed event emitted', {
    userId,
    sessionId,
  });
}

/**
 * Get all active timers (for debugging/monitoring)
 */
export function getActiveTimers(): string[] {
  return Array.from(activeTimers.keys());
}

/**
 * Clean up all active timers (for graceful shutdown)
 */
export function cleanupAllTimers(): void {
  activeTimers.forEach((timer, sessionId) => {
    clearInterval(timer);
    logger.info('Cleaned up timer', { sessionId });
  });
  activeTimers.clear();
  userSockets.clear();

  logger.info('All Pomodoro timers cleaned up');
}

export default {
  initializePomodoroSocket,
  startPomodoroTimer,
  stopPomodoroTimer,
  emitPomodoroPaused,
  emitPomodoroResumed,
  getActiveTimers,
  cleanupAllTimers,
};
