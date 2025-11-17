import { apiClient, ApiResponse } from './api';
import { usePomodoroStore, PomodoroSession, Interruption } from '../stores/pomodoroStore';

export interface StartPomodoroInput {
  taskId: string;
  duration?: number; // Optional custom duration in milliseconds
}

export interface CompletePomodoroInput {
  sessionId: string;
}

export interface PausePomodoroInput {
  sessionId: string;
}

export interface AddInterruptionInput {
  sessionId: string;
  type: 'urgent' | 'break';
  duration: number; // milliseconds
  notes?: string;
}

export interface SuggestedBreak {
  type: 'short' | 'long';
  duration: number;
  message: string;
}

/**
 * Start a new Pomodoro session
 */
export async function startPomodoro(input: StartPomodoroInput): Promise<PomodoroSession> {
  const response = await apiClient.post<ApiResponse<{ session: PomodoroSession }>>(
    '/pomodoro/start',
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to start Pomodoro session');
  }

  const { session } = response.data.data;

  // Update pomodoro store
  const pomodoroStore = usePomodoroStore();
  pomodoroStore.setActiveSession(session);
  pomodoroStore.addSession(session);

  return session;
}

/**
 * Complete the current Pomodoro session
 */
export async function completePomodoro(input: CompletePomodoroInput): Promise<PomodoroSession> {
  const response = await apiClient.post<ApiResponse<{ session: PomodoroSession }>>(
    '/pomodoro/complete',
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to complete Pomodoro session');
  }

  const { session } = response.data.data;

  // Update pomodoro store
  const pomodoroStore = usePomodoroStore();
  pomodoroStore.setActiveSession(null);
  pomodoroStore.updateSession(session._id, session);

  return session;
}

/**
 * Pause/abort the current Pomodoro session
 */
export async function pausePomodoro(input: PausePomodoroInput): Promise<PomodoroSession> {
  const response = await apiClient.post<ApiResponse<{ session: PomodoroSession }>>(
    '/pomodoro/pause',
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to pause Pomodoro session');
  }

  const { session } = response.data.data;

  // Update pomodoro store
  const pomodoroStore = usePomodoroStore();
  pomodoroStore.setActiveSession(null);
  pomodoroStore.updateSession(session._id, session);

  return session;
}

/**
 * Get the currently active Pomodoro session
 */
export async function getActiveSession(): Promise<PomodoroSession | null> {
  const response = await apiClient.get<ApiResponse<{ session: PomodoroSession | null }>>(
    '/pomodoro/active'
  );

  if (!response.data.success) {
    throw new Error('Failed to fetch active session');
  }

  const { session } = response.data.data || { session: null };

  // Update pomodoro store
  const pomodoroStore = usePomodoroStore();
  pomodoroStore.setActiveSession(session);

  return session;
}

/**
 * Get all Pomodoro sessions for the current user
 */
export async function getPomodoroSessions(params?: {
  taskId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
}): Promise<PomodoroSession[]> {
  const response = await apiClient.get<ApiResponse<{ sessions: PomodoroSession[]; count: number }>>(
    '/pomodoro/sessions',
    { params }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to fetch Pomodoro sessions');
  }

  const { sessions } = response.data.data;

  // Update pomodoro store
  const pomodoroStore = usePomodoroStore();
  pomodoroStore.setSessions(sessions);

  return sessions;
}

/**
 * Add an interruption to a Pomodoro session
 */
export async function addInterruption(input: AddInterruptionInput): Promise<PomodoroSession> {
  const response = await apiClient.post<ApiResponse<{ session: PomodoroSession }>>(
    '/pomodoro/interruption',
    input
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to add interruption');
  }

  const { session } = response.data.data;

  // Update pomodoro store
  const pomodoroStore = usePomodoroStore();
  pomodoroStore.updateSession(session._id, session);

  return session;
}

/**
 * Get suggested break based on completed Pomodoros
 */
export async function getSuggestedBreak(): Promise<SuggestedBreak> {
  const response = await apiClient.get<ApiResponse<{ suggestion: SuggestedBreak }>>(
    '/pomodoro/suggested-break'
  );

  if (!response.data.success || !response.data.data) {
    throw new Error('Failed to get suggested break');
  }

  return response.data.data.suggestion;
}

export default {
  startPomodoro,
  completePomodoro,
  pausePomodoro,
  getActiveSession,
  getPomodoroSessions,
  addInterruption,
  getSuggestedBreak,
};
