import request from 'supertest';
import App from '../../src/server';

describe('Pomodoro API Integration Tests', () => {
  let app: App;
  let server: any;
  let authToken: string;
  let userId: string;
  let taskId: string;

  beforeAll(async () => {
    app = new App();
    server = app.app;

    // Register and login to get auth token
    const response = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'pomodoro-integration@example.com',
        password: 'Password123',
        name: 'Pomodoro Test User',
      });

    authToken = response.body.data.token;
    userId = response.body.data.user._id;

    // Create a task for Pomodoro sessions
    const taskResponse = await request(server)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Pomodoro Test Task',
        estimatedPomodoros: 4,
      });

    taskId = taskResponse.body.data.task._id;
  });

  describe('POST /api/v1/pomodoro/start', () => {
    it('should start a new Pomodoro session successfully', async () => {
      const response = await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId,
          duration: 1500000, // 25 minutes in milliseconds
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toHaveProperty('taskId', taskId);
      expect(response.body.data.session).toHaveProperty('userId', userId);
      expect(response.body.data.session).toHaveProperty('duration', 1500000);
      expect(response.body.data.session).toHaveProperty('completed', false);
      expect(response.body.data.session).toHaveProperty('startTime');
      expect(response.body.data.session.endTime).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .post('/api/v1/pomodoro/start')
        .send({
          taskId,
          duration: 1500000,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid taskId', async () => {
      const response = await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId: 'invalid-task-id',
          duration: 1500000,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when user already has an active session', async () => {
      // Start first session
      await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId,
          duration: 1500000,
        })
        .expect(201);

      // Try to start second session
      const response = await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId,
          duration: 1500000,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active session');
    });

    it('should return 400 for invalid duration', async () => {
      const response = await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId,
          duration: 100, // Too short (less than 1 minute)
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/pomodoro/complete', () => {
    let sessionId: string;

    beforeEach(async () => {
      const response = await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId,
          duration: 1500000,
        });

      sessionId = response.body.data.session._id;
    });

    it('should complete a Pomodoro session successfully', async () => {
      const response = await request(server)
        .post('/api/v1/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toHaveProperty('_id', sessionId);
      expect(response.body.data.session).toHaveProperty('completed', true);
      expect(response.body.data.session.endTime).toBeDefined();

      // Verify task actualPomodoros incremented
      const taskResponse = await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(taskResponse.body.data.task.actualPomodoros).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .post('/api/v1/pomodoro/complete')
        .send({
          sessionId,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '507f1f77bcf86cd799439011';
      const response = await request(server)
        .post('/api/v1/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId: fakeSessionId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when completing already completed session', async () => {
      // Complete session first time
      await request(server)
        .post('/api/v1/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
        })
        .expect(200);

      // Try to complete again
      const response = await request(server)
        .post('/api/v1/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already completed');
    });
  });

  describe('GET /api/v1/pomodoro/active', () => {
    it('should return active session if exists', async () => {
      // Start a session
      const startResponse = await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId,
          duration: 1500000,
        });

      const sessionId = startResponse.body.data.session._id;

      const response = await request(server)
        .get('/api/v1/pomodoro/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toHaveProperty('_id', sessionId);
      expect(response.body.data.session).toHaveProperty('completed', false);
    });

    it('should return null when no active session', async () => {
      const response = await request(server)
        .get('/api/v1/pomodoro/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server).get('/api/v1/pomodoro/active').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/pomodoro/history', () => {
    beforeEach(async () => {
      // Create and complete multiple sessions
      for (let i = 0; i < 3; i++) {
        const startResponse = await request(server)
          .post('/api/v1/pomodoro/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            taskId,
            duration: 1500000,
          });

        await request(server)
          .post('/api/v1/pomodoro/complete')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            sessionId: startResponse.body.data.session._id,
          });
      }
    });

    it('should return session history', async () => {
      const response = await request(server)
        .get('/api/v1/pomodoro/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toBeInstanceOf(Array);
      expect(response.body.data.sessions.length).toBeGreaterThan(0);
      expect(response.body.data.count).toBe(response.body.data.sessions.length);
    });

    it('should filter history by taskId', async () => {
      const response = await request(server)
        .get(`/api/v1/pomodoro/history?taskId=${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.sessions.forEach((session: any) => {
        expect(session.taskId).toBe(taskId);
      });
    });

    it('should filter history by completed status', async () => {
      const response = await request(server)
        .get('/api/v1/pomodoro/history?completed=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.sessions.forEach((session: any) => {
        expect(session.completed).toBe(true);
      });
    });

    it('should paginate history results', async () => {
      const response = await request(server)
        .get('/api/v1/pomodoro/history?limit=2&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions.length).toBeLessThanOrEqual(2);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server).get('/api/v1/pomodoro/history').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Pomodoro Session Lifecycle', () => {
    it('should complete full session lifecycle: start -> complete -> verify task updated', async () => {
      // Get initial task state
      const initialTaskResponse = await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const initialActualPomodoros = initialTaskResponse.body.data.task.actualPomodoros;

      // Start session
      const startResponse = await request(server)
        .post('/api/v1/pomodoro/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskId,
          duration: 1500000,
        })
        .expect(201);

      const sessionId = startResponse.body.data.session._id;
      expect(startResponse.body.data.session.completed).toBe(false);

      // Verify active session
      const activeResponse = await request(server)
        .get('/api/v1/pomodoro/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(activeResponse.body.data.session._id).toBe(sessionId);

      // Complete session
      const completeResponse = await request(server)
        .post('/api/v1/pomodoro/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sessionId,
        })
        .expect(200);

      expect(completeResponse.body.data.session.completed).toBe(true);
      expect(completeResponse.body.data.session.endTime).toBeDefined();

      // Verify no active session
      const noActiveResponse = await request(server)
        .get('/api/v1/pomodoro/active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(noActiveResponse.body.data.session).toBeNull();

      // Verify task actualPomodoros incremented
      const finalTaskResponse = await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalTaskResponse.body.data.task.actualPomodoros).toBe(
        initialActualPomodoros + 1
      );

      // Verify session appears in history
      const historyResponse = await request(server)
        .get('/api/v1/pomodoro/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const completedSession = historyResponse.body.data.sessions.find(
        (s: any) => s._id === sessionId
      );
      expect(completedSession).toBeDefined();
      expect(completedSession.completed).toBe(true);
    });
  });
});
