import {
  createTask,
  getTaskById,
  getUserTasks,
  updateTask,
  deleteTask,
  incrementActualPomodoros,
  getTaskStats,
} from '../../src/services/tasks/taskService';
import { User } from '../../src/models/User';
import { Task } from '../../src/models/Task';
import bcrypt from 'bcrypt';

describe('TaskService', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash('Password123', 12);
    const user = new User({
      email: 'task-test@example.com',
      passwordHash,
      name: 'Task Test User',
      timezone: 'UTC',
    });
    await user.save();
    testUserId = user._id.toString();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const input = {
        userId: testUserId,
        name: 'Test Task',
        description: 'Test description',
        estimatedPomodoros: 4,
        dueDate: new Date('2025-12-31'),
        grouping: 'Work',
      };

      const task = await createTask(input);

      expect(task).toBeTruthy();
      expect(task.name).toBe(input.name);
      expect(task.description).toBe(input.description);
      expect(task.estimatedPomodoros).toBe(input.estimatedPomodoros);
      expect(task.actualPomodoros).toBe(0);
      expect(task.status).toBe('pending');
      expect(task.grouping).toBe(input.grouping);
    });

    it('should create task without optional fields', async () => {
      const input = {
        userId: testUserId,
        name: 'Minimal Task',
        estimatedPomodoros: 2,
      };

      const task = await createTask(input);

      expect(task).toBeTruthy();
      expect(task.name).toBe(input.name);
      expect(task.description).toBeUndefined();
      expect(task.dueDate).toBeUndefined();
      expect(task.grouping).toBeUndefined();
    });
  });

  describe('getTaskById', () => {
    it('should retrieve task by ID', async () => {
      const created = await createTask({
        userId: testUserId,
        name: 'Retrieve Test Task',
        estimatedPomodoros: 3,
      });

      const task = await getTaskById(created._id.toString(), testUserId);

      expect(task).toBeTruthy();
      expect(task._id.toString()).toBe(created._id.toString());
      expect(task.name).toBe(created.name);
    });

    it('should throw error if task not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(getTaskById(fakeId, testUserId)).rejects.toThrow('Task not found');
    });

    it('should throw error if task belongs to different user', async () => {
      const otherUser = new User({
        email: 'other@example.com',
        passwordHash: await bcrypt.hash('Password123', 12),
        name: 'Other User',
        timezone: 'UTC',
      });
      await otherUser.save();

      const task = await createTask({
        userId: otherUser._id.toString(),
        name: 'Other User Task',
        estimatedPomodoros: 2,
      });

      await expect(getTaskById(task._id.toString(), testUserId)).rejects.toThrow(
        'Task not found'
      );
    });
  });

  describe('getUserTasks', () => {
    beforeEach(async () => {
      await createTask({
        userId: testUserId,
        name: 'Task 1',
        estimatedPomodoros: 2,
        status: 'pending',
        grouping: 'Work',
      });
      await createTask({
        userId: testUserId,
        name: 'Task 2',
        estimatedPomodoros: 3,
        status: 'in-progress',
        grouping: 'Personal',
      });
      await createTask({
        userId: testUserId,
        name: 'Task 3',
        estimatedPomodoros: 1,
        status: 'completed',
        grouping: 'Work',
      });
    });

    it('should retrieve all user tasks', async () => {
      const tasks = await getUserTasks({ userId: testUserId });

      expect(tasks).toHaveLength(3);
    });

    it('should filter tasks by status', async () => {
      const tasks = await getUserTasks({
        userId: testUserId,
        status: 'pending',
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].status).toBe('pending');
    });

    it('should filter tasks by grouping', async () => {
      const tasks = await getUserTasks({
        userId: testUserId,
        grouping: 'Work',
      });

      expect(tasks).toHaveLength(2);
      tasks.forEach((task) => {
        expect(task.grouping).toBe('Work');
      });
    });

    it('should filter tasks by due date range', async () => {
      const futureDate = new Date('2025-12-31');
      await createTask({
        userId: testUserId,
        name: 'Future Task',
        estimatedPomodoros: 2,
        dueDate: futureDate,
      });

      const tasks = await getUserTasks({
        userId: testUserId,
        dueBefore: new Date('2026-01-01'),
      });

      const futureTask = tasks.find((t) => t.name === 'Future Task');
      expect(futureTask).toBeTruthy();
    });
  });

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const created = await createTask({
        userId: testUserId,
        name: 'Original Name',
        estimatedPomodoros: 2,
      });

      const updated = await updateTask(created._id.toString(), testUserId, {
        name: 'Updated Name',
        status: 'in-progress',
        estimatedPomodoros: 5,
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.status).toBe('in-progress');
      expect(updated.estimatedPomodoros).toBe(5);
    });

    it('should throw error for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(
        updateTask(fakeId, testUserId, { name: 'Updated' })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const created = await createTask({
        userId: testUserId,
        name: 'To Delete',
        estimatedPomodoros: 2,
      });

      await deleteTask(created._id.toString(), testUserId);

      const task = await Task.findById(created._id);
      expect(task).toBeNull();
    });

    it('should throw error for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(deleteTask(fakeId, testUserId)).rejects.toThrow('Task not found');
    });
  });

  describe('incrementActualPomodoros', () => {
    it('should increment actualPomodoros count', async () => {
      const created = await createTask({
        userId: testUserId,
        name: 'Pomodoro Test',
        estimatedPomodoros: 3,
      });

      expect(created.actualPomodoros).toBe(0);

      const updated = await incrementActualPomodoros(created._id.toString());
      expect(updated.actualPomodoros).toBe(1);

      const updated2 = await incrementActualPomodoros(created._id.toString());
      expect(updated2.actualPomodoros).toBe(2);
    });

    it('should auto-complete task when reaching estimated pomodoros', async () => {
      const created = await createTask({
        userId: testUserId,
        name: 'Auto Complete Test',
        estimatedPomodoros: 2,
      });

      await incrementActualPomodoros(created._id.toString());
      const updated = await incrementActualPomodoros(created._id.toString());

      expect(updated.actualPomodoros).toBe(2);
      expect(updated.status).toBe('completed');
    });
  });

  describe('getTaskStats', () => {
    beforeEach(async () => {
      await createTask({
        userId: testUserId,
        name: 'Task 1',
        estimatedPomodoros: 2,
        status: 'pending',
      });
      await createTask({
        userId: testUserId,
        name: 'Task 2',
        estimatedPomodoros: 3,
        status: 'in-progress',
      });
      const task3 = await createTask({
        userId: testUserId,
        name: 'Task 3',
        estimatedPomodoros: 2,
        status: 'pending',
      });
      task3.actualPomodoros = 2;
      task3.status = 'completed';
      await task3.save();
    });

    it('should return correct task statistics', async () => {
      const stats = await getTaskStats(testUserId);

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1);
      expect(stats.inProgress).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.totalPomodoros).toBeGreaterThan(0);
    });
  });
});
