import {
  startSession,
  completeSession,
  pauseSession,
  getActiveSession,
  getUserSessions,
  getSuggestedBreak,
} from '../../src/services/pomodoro/pomodoroService';
import { User } from '../../src/models/User';
import { Task } from '../../src/models/Task';
import { Configuration } from '../../src/models/Configuration';
import { PomodoroSession } from '../../src/models/PomodoroSession';
import bcrypt from 'bcrypt';

describe('PomodoroService', () => {
  let testUserId: string;
  let testTaskId: string;

  beforeEach(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash('Password123', 12);
    const user = new User({
      email: 'pomodoro-test@example.com',
      passwordHash,
      name: 'Pomodoro Test User',
      timezone: 'UTC',
    });
    await user.save();
    testUserId = user._id.toString();

    // Create test configuration
    const config = new Configuration({
      userId: testUserId,
      pomodoroDuration: 1500000, // 25 minutes
      shortBreak: 300000, // 5 minutes
      longBreak: 900000, // 15 minutes
      longBreakInterval: 4,
    });
    await config.save();

    // Create test task
    const task = new Task({
      userId: testUserId,
      name: 'Test Task',
      estimatedPomodoros: 4,
      actualPomodoros: 0,
      status: 'pending',
    });
    await task.save();
    testTaskId = task._id.toString();
  });

  describe('startSession', () => {
    it('should start a new Pomodoro session successfully', async () => {
      const session = await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      expect(session).toBeTruthy();
      expect(session.userId.toString()).toBe(testUserId);
      expect(session.taskId.toString()).toBe(testTaskId);
      expect(session.completed).toBe(false);
      expect(session.duration).toBe(1500000); // From configuration
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.interruptions).toHaveLength(0);
    });

    it('should use custom duration if provided', async () => {
      const customDuration = 2700000; // 45 minutes
      const session = await startSession({
        userId: testUserId,
        taskId: testTaskId,
        duration: customDuration,
      });

      expect(session.duration).toBe(customDuration);
    });

    it('should throw error if user already has active session', async () => {
      await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      await expect(
        startSession({
          userId: testUserId,
          taskId: testTaskId,
        })
      ).rejects.toThrow('You already have an active Pomodoro session');
    });

    it('should use default duration if no configuration exists', async () => {
      // Create user without configuration
      const newUser = new User({
        email: 'no-config@example.com',
        passwordHash: await bcrypt.hash('Password123', 12),
        name: 'No Config User',
        timezone: 'UTC',
      });
      await newUser.save();

      const newTask = new Task({
        userId: newUser._id,
        name: 'Test Task',
        estimatedPomodoros: 2,
      });
      await newTask.save();

      const session = await startSession({
        userId: newUser._id.toString(),
        taskId: newTask._id.toString(),
      });

      expect(session.duration).toBe(1800000); // Default 30 minutes
    });
  });

  describe('completeSession', () => {
    it('should complete a Pomodoro session successfully', async () => {
      const started = await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      const completed = await completeSession({
        sessionId: started._id.toString(),
        userId: testUserId,
      });

      expect(completed.completed).toBe(true);
      expect(completed.endTime).toBeInstanceOf(Date);

      // Check that task's actualPomodoros was incremented
      const task = await Task.findById(testTaskId);
      expect(task?.actualPomodoros).toBe(1);
    });

    it('should throw error if session not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(
        completeSession({
          sessionId: fakeId,
          userId: testUserId,
        })
      ).rejects.toThrow('Session not found');
    });

    it('should throw error if session already completed', async () => {
      const started = await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      await completeSession({
        sessionId: started._id.toString(),
        userId: testUserId,
      });

      await expect(
        completeSession({
          sessionId: started._id.toString(),
          userId: testUserId,
        })
      ).rejects.toThrow('Session already completed');
    });

    it('should throw error for invalid session ID format', async () => {
      await expect(
        completeSession({
          sessionId: 'invalid-id',
          userId: testUserId,
        })
      ).rejects.toThrow('Invalid session ID format');
    });
  });

  describe('pauseSession', () => {
    it('should pause a Pomodoro session successfully', async () => {
      const started = await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      const paused = await pauseSession({
        sessionId: started._id.toString(),
        userId: testUserId,
      });

      expect(paused.completed).toBe(false);
      expect(paused.endTime).toBeInstanceOf(Date);

      // Check that task's actualPomodoros was NOT incremented
      const task = await Task.findById(testTaskId);
      expect(task?.actualPomodoros).toBe(0);
    });

    it('should throw error if session not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(
        pauseSession({
          sessionId: fakeId,
          userId: testUserId,
        })
      ).rejects.toThrow('Session not found');
    });

    it('should throw error if session already ended', async () => {
      const started = await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      await pauseSession({
        sessionId: started._id.toString(),
        userId: testUserId,
      });

      await expect(
        pauseSession({
          sessionId: started._id.toString(),
          userId: testUserId,
        })
      ).rejects.toThrow('Session already ended');
    });
  });

  describe('getActiveSession', () => {
    it('should return active session if exists', async () => {
      const started = await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      const active = await getActiveSession(testUserId);

      expect(active).toBeTruthy();
      expect(active?._id.toString()).toBe(started._id.toString());
    });

    it('should return null if no active session', async () => {
      const active = await getActiveSession(testUserId);
      expect(active).toBeNull();
    });

    it('should return null after completing session', async () => {
      const started = await startSession({
        userId: testUserId,
        taskId: testTaskId,
      });

      await completeSession({
        sessionId: started._id.toString(),
        userId: testUserId,
      });

      const active = await getActiveSession(testUserId);
      expect(active).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    beforeEach(async () => {
      // Create multiple sessions
      for (let i = 0; i < 5; i++) {
        const session = new PomodoroSession({
          userId: testUserId,
          taskId: testTaskId,
          startTime: new Date(Date.now() - i * 3600000),
          duration: 1500000,
          completed: i % 2 === 0,
          endTime: new Date(Date.now() - i * 3600000 + 1500000),
        });
        await session.save();
      }
    });

    it('should retrieve user sessions', async () => {
      const sessions = await getUserSessions(testUserId);

      expect(sessions).toHaveLength(5);
    });

    it('should limit number of sessions returned', async () => {
      const sessions = await getUserSessions(testUserId, 3);

      expect(sessions).toHaveLength(3);
    });

    it('should return sessions in descending order by start time', async () => {
      const sessions = await getUserSessions(testUserId);

      for (let i = 0; i < sessions.length - 1; i++) {
        expect(sessions[i].startTime.getTime()).toBeGreaterThanOrEqual(
          sessions[i + 1].startTime.getTime()
        );
      }
    });
  });

  describe('getSuggestedBreak', () => {
    it('should suggest short break for first 3 Pomodoros', async () => {
      // Complete 2 Pomodoros today
      for (let i = 0; i < 2; i++) {
        const session = new PomodoroSession({
          userId: testUserId,
          taskId: testTaskId,
          startTime: new Date(),
          duration: 1500000,
          completed: true,
          endTime: new Date(),
        });
        await session.save();
      }

      const suggestion = await getSuggestedBreak(testUserId);

      expect(suggestion.breakType).toBe('short');
      expect(suggestion.duration).toBe(300000);
    });

    it('should suggest long break after 4 Pomodoros', async () => {
      // Complete 4 Pomodoros today
      for (let i = 0; i < 4; i++) {
        const session = new PomodoroSession({
          userId: testUserId,
          taskId: testTaskId,
          startTime: new Date(),
          duration: 1500000,
          completed: true,
          endTime: new Date(),
        });
        await session.save();
      }

      const suggestion = await getSuggestedBreak(testUserId);

      expect(suggestion.breakType).toBe('long');
      expect(suggestion.duration).toBe(900000);
    });

    it('should return default if no configuration exists', async () => {
      // Delete configuration
      await Configuration.deleteOne({ userId: testUserId });

      const suggestion = await getSuggestedBreak(testUserId);

      expect(suggestion.breakType).toBe('short');
      expect(suggestion.duration).toBe(300000);
    });
  });
});
