import request from 'supertest';
import { app } from '../../src/server';
import { connectDB, disconnectDB } from '../../src/config/database';

/**
 * Contract Tests for Tasks Endpoints
 * Tests: T027, T028
 *
 * Verifies API contracts for:
 * - POST /api/tasks
 * - GET /api/tasks
 * - PUT /api/tasks/:id
 * - DELETE /api/tasks/:id
 */

describe('Tasks API Contract Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectDB();

    // Register and login a test user
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Task Test User',
        email: `task-test-${Date.now()}@example.com`,
        password: 'TaskPass123',
        timezone: 'UTC',
      });

    authToken = response.body.data.token;
    userId = response.body.data.user.id;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('POST /api/tasks', () => {
    const validTask = {
      name: 'Write Documentation',
      description: 'Create comprehensive API documentation',
      estimatedPomodoros: 3,
      dueDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      grouping: 'Work',
    };

    it('should create a task with all valid fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTask)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          task: {
            id: expect.any(String),
            userId,
            name: validTask.name,
            description: validTask.description,
            estimatedPomodoros: validTask.estimatedPomodoros,
            actualPomodoros: 0,
            status: 'pending',
            dueDate: expect.any(String),
            grouping: validTask.grouping,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          },
        },
      });
    });

    it('should create a task with only required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Simple Task',
          estimatedPomodoros: 1,
        })
        .expect(201);

      expect(response.body.data.task).toMatchObject({
        id: expect.any(String),
        name: 'Simple Task',
        estimatedPomodoros: 1,
        actualPomodoros: 0,
        status: 'pending',
      });

      expect(response.body.data.task.description).toBeUndefined();
      expect(response.body.data.task.dueDate).toBeUndefined();
    });

    it('should reject task without authentication', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send(validTask)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject task without required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Missing name and estimatedPomodoros' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject task with invalid estimatedPomodoros', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Task',
          estimatedPomodoros: -1, // Negative value
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject task with past due date', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Past Due Task',
          estimatedPomodoros: 1,
          dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    let createdTaskIds: string[] = [];

    beforeAll(async () => {
      // Create multiple test tasks
      const tasks = [
        { name: 'Task 1', estimatedPomodoros: 1, status: 'pending' },
        { name: 'Task 2', estimatedPomodoros: 2, status: 'in-progress' },
        { name: 'Task 3', estimatedPomodoros: 3, status: 'completed' },
      ];

      for (const task of tasks) {
        const response = await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${authToken}`)
          .send(task);
        createdTaskIds.push(response.body.data.task.id);
      }
    });

    it('should return all tasks for authenticated user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          tasks: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              userId,
              name: expect.any(String),
              estimatedPomodoros: expect.any(Number),
              actualPomodoros: expect.any(Number),
              status: expect.stringMatching(/^(pending|in-progress|completed)$/),
            }),
          ]),
        },
      });

      expect(response.body.data.tasks.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.tasks.every((task: any) => task.status === 'pending')).toBe(true);
    });

    it('should filter tasks by grouping', async () => {
      // First create a task with specific grouping
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Work Task',
          estimatedPomodoros: 1,
          grouping: 'Work',
        });

      const response = await request(app)
        .get('/api/tasks?grouping=Work')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.tasks.every((task: any) => task.grouping === 'Work')).toBe(true);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a task to update
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Task to Update',
          estimatedPomodoros: 2,
        });
      taskId = response.body.data.task.id;
    });

    it('should update task with valid data', async () => {
      const updates = {
        name: 'Updated Task Name',
        description: 'Updated description',
        estimatedPomodoros: 3,
        status: 'in-progress',
      };

      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data.task).toMatchObject({
        id: taskId,
        ...updates,
      });
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ name: 'Updated Name' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject update of non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/nonexistent-id-12345')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject update with invalid status', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      // Create a task to delete
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Task to Delete',
          estimatedPomodoros: 1,
        });
      taskId = response.body.data.task.id;
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: expect.any(String),
      });

      // Verify task is deleted
      const getResponse = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.data.tasks.find((t: any) => t.id === taskId)).toBeUndefined();
    });

    it('should reject delete without authentication', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject delete of non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/nonexistent-id-12345')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
