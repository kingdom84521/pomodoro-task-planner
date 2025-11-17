import request from 'supertest';
import App from '../../src/server';

describe('Tasks API Integration Tests', () => {
  let app: App;
  let server: any;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = new App();
    server = app.app;

    // Register and login to get auth token
    const response = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: 'tasks-integration@example.com',
        password: 'Password123',
        name: 'Tasks Test User',
      });

    authToken = response.body.data.token;
    userId = response.body.data.user._id;
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task successfully', async () => {
      const response = await request(server)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Task',
          description: 'Test description',
          estimatedPomodoros: 4,
          dueDate: '2025-12-31',
          grouping: 'Work',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task).toHaveProperty('name', 'Integration Test Task');
      expect(response.body.data.task).toHaveProperty('estimatedPomodoros', 4);
      expect(response.body.data.task).toHaveProperty('status', 'pending');
      expect(response.body.data.task).toHaveProperty('actualPomodoros', 0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .post('/api/v1/tasks')
        .send({
          name: 'Unauthorized Task',
          estimatedPomodoros: 2,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid task data', async () => {
      const response = await request(server)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'AB', // Too short
          estimatedPomodoros: 0, // Invalid
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks', () => {
    beforeEach(async () => {
      // Create some test tasks
      await request(server)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Task 1',
          estimatedPomodoros: 2,
          grouping: 'Work',
        });

      await request(server)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Task 2',
          estimatedPomodoros: 3,
          grouping: 'Personal',
        });
    });

    it('should retrieve all user tasks', async () => {
      const response = await request(server)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toBeInstanceOf(Array);
      expect(response.body.data.tasks.length).toBeGreaterThan(0);
      expect(response.body.data.count).toBe(response.body.data.tasks.length);
    });

    it('should filter tasks by status', async () => {
      const response = await request(server)
        .get('/api/v1/tasks?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.tasks.forEach((task: any) => {
        expect(task.status).toBe('pending');
      });
    });

    it('should filter tasks by grouping', async () => {
      const response = await request(server)
        .get('/api/v1/tasks?grouping=Work')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const workTasks = response.body.data.tasks.filter((t: any) => t.grouping === 'Work');
      expect(workTasks.length).toBeGreaterThan(0);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server).get('/api/v1/tasks').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks/stats', () => {
    it('should return task statistics', async () => {
      const response = await request(server)
        .get('/api/v1/tasks/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('total');
      expect(response.body.data.stats).toHaveProperty('pending');
      expect(response.body.data.stats).toHaveProperty('inProgress');
      expect(response.body.data.stats).toHaveProperty('completed');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server).get('/api/v1/tasks/stats').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(server)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Get Task Test',
          estimatedPomodoros: 2,
        });

      taskId = response.body.data.task._id;
    });

    it('should retrieve task by ID', async () => {
      const response = await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task).toHaveProperty('_id', taskId);
      expect(response.body.data.task).toHaveProperty('name', 'Get Task Test');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(server)
        .get(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server).get(`/api/v1/tasks/${taskId}`).expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(server)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Update Test Task',
          estimatedPomodoros: 2,
        });

      taskId = response.body.data.task._id;
    });

    it('should update task successfully', async () => {
      const response = await request(server)
        .put(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Task Name',
          status: 'in-progress',
          estimatedPomodoros: 5,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task).toHaveProperty('name', 'Updated Task Name');
      expect(response.body.data.task).toHaveProperty('status', 'in-progress');
      expect(response.body.data.task).toHaveProperty('estimatedPomodoros', 5);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(server)
        .put(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server)
        .put(`/api/v1/tasks/${taskId}`)
        .send({
          name: 'Updated Name',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(server)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Delete Test Task',
          estimatedPomodoros: 2,
        });

      taskId = response.body.data.task._id;
    });

    it('should delete task successfully', async () => {
      const response = await request(server)
        .delete(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Task deleted successfully');

      // Verify task is deleted
      await request(server)
        .get(`/api/v1/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(server)
        .delete(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(server).delete(`/api/v1/tasks/${taskId}`).expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
