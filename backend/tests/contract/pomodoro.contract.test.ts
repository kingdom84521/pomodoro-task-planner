import request from 'supertest';
import { app } from '../../src/server';
import { connectDB, disconnectDB } from '../../src/config/database';

/**
 * Contract Tests for Pomodoro Endpoints
 * Test: T029
 *
 * Verifies API contracts for:
 * - POST /api/pomodoro/start
 * - POST /api/pomodoro/pause
 * - POST /api/pomodoro/resume
 * - POST /api/pomodoro/complete
 * - POST /api/pomodoro/cancel
 * - GET /api/pomodoro/suggested-break
 */

describe('Pomodoro API Contract Tests', () => {
  let authToken: string;
  let userId: string;
  let taskId: string;

  beforeAll(async () => {
    await connectDB();

    // Register and login a test user
    const authResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Pomodoro Test User',
        email: `pomodoro-test-${Date.now()}@example.com`,
        password: 'PomodoroPass123',
        timezone: 'UTC',
      });

    authToken = authResponse.body.data.token;
    userId = authResponse.body.data.user.id;

    // Create a test task
    const taskResponse = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Pomodoro Task',
        estimatedPomodoros: 3,
      });

    taskId = taskResponse.body.data.task.id;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('POST /api/pomodoro/start', () => {
    it('should start a Pomodoro session with valid task', async () => {
      const response = await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          session: {
            id: expect.any(String),
            userId,
            taskId,
            startTime: expect.any(String),
            duration: expect.any(Number),
            status: 'active',
            completed: false,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        },
      });

      // Duration should default to 25 minutes (1500000 ms) or custom configuration
      expect(response.body.data.session.duration).toBeGreaterThan(0);
    });

    it('should reject starting Pomodoro without authentication', async () => {
      const response = await request(app)
        .post('/api/pomodoro/start')
        .send({ taskId })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject starting Pomodoro without taskId', async () => {
      const response = await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject starting Pomodoro with non-existent task', async () => {
      const response = await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId: 'nonexistent-task-id' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject starting new Pomodoro when one is already active', async () => {
      // Start first Pomodoro
      await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });

      // Try to start another
      const response = await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/active session|already running/i);
    });
  });

  describe('POST /api/pomodoro/pause', () => {
    let sessionId: string;

    beforeEach(async () => {
      // Start a Pomodoro session
      const response = await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });
      sessionId = response.body.data.session.id;
    });

    afterEach(async () => {
      // Cancel the session to clean up
      try {
        await request(app)
          .post('/api/pomodoro/cancel')
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        // Ignore errors during cleanup
      }
    });

    it('should pause active Pomodoro session', async () => {
      const response = await request(app)
        .post('/api/pomodoro/pause')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          session: {
            id: sessionId,
            status: 'paused',
            pausedAt: expect.any(String),
          },
        },
      });
    });

    it('should reject pause without authentication', async () => {
      const response = await request(app)
        .post('/api/pomodoro/pause')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject pause when no active session', async () => {
      // Cancel current session first
      await request(app)
        .post('/api/pomodoro/cancel')
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app)
        .post('/api/pomodoro/pause')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/no active session/i);
    });
  });

  describe('POST /api/pomodoro/resume', () => {
    beforeEach(async () => {
      // Start and pause a session
      await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });

      await request(app)
        .post('/api/pomodoro/pause')
        .set('Authorization', `Bearer ${authToken}`);
    });

    afterEach(async () => {
      // Clean up
      try {
        await request(app)
          .post('/api/pomodoro/cancel')
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should resume paused Pomodoro session', async () => {
      const response = await request(app)
        .post('/api/pomodoro/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          session: {
            status: 'active',
            resumedAt: expect.any(String),
          },
        },
      });
    });

    it('should reject resume without authentication', async () => {
      const response = await request(app)
        .post('/api/pomodoro/resume')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/pomodoro/complete', () => {
    beforeEach(async () => {
      // Start a session
      await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });
    });

    it('should complete Pomodoro session successfully', async () => {
      const response = await request(app)
        .post('/api/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          session: {
            status: 'completed',
            completed: true,
            endTime: expect.any(String),
          },
          task: {
            id: taskId,
            actualPomodoros: expect.any(Number),
          },
        },
      });

      // Verify task actualPomodoros was incremented
      expect(response.body.data.task.actualPomodoros).toBeGreaterThan(0);
    });

    it('should reject complete without authentication', async () => {
      const response = await request(app)
        .post('/api/pomodoro/complete')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject complete when no active session', async () => {
      // Complete the current session
      await request(app)
        .post('/api/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`);

      // Try to complete again
      const response = await request(app)
        .post('/api/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/pomodoro/cancel', () => {
    beforeEach(async () => {
      // Start a session
      await request(app)
        .post('/api/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ taskId });
    });

    it('should cancel Pomodoro session successfully', async () => {
      const response = await request(app)
        .post('/api/pomodoro/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          session: {
            status: 'cancelled',
            completed: false,
            endTime: expect.any(String),
          },
        },
      });
    });

    it('should reject cancel without authentication', async () => {
      const response = await request(app)
        .post('/api/pomodoro/cancel')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/pomodoro/suggested-break', () => {
    it('should return suggested break for authenticated user', async () => {
      const response = await request(app)
        .get('/api/pomodoro/suggested-break')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          break: {
            type: expect.stringMatching(/^(short|long)$/),
            duration: expect.any(Number),
            message: expect.any(String),
          },
        },
      });
    });

    it('should return short break by default', async () => {
      const response = await request(app)
        .get('/api/pomodoro/suggested-break')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Default should be short break (5 minutes = 300000 ms)
      expect(response.body.data.break.type).toBe('short');
      expect(response.body.data.break.duration).toBeGreaterThan(0);
    });

    it('should suggest long break after multiple Pomodoros', async () => {
      // Complete 4 Pomodoros (threshold for long break)
      for (let i = 0; i < 4; i++) {
        await request(app)
          .post('/api/pomodoro/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ taskId });

        await request(app)
          .post('/api/pomodoro/complete')
          .set('Authorization', `Bearer ${authToken}`);
      }

      const response = await request(app)
        .get('/api/pomodoro/suggested-break')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // After 4 Pomodoros, should suggest long break
      expect(response.body.data.break.type).toBe('long');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/pomodoro/suggested-break')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
