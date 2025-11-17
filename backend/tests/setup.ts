import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../src/utils/logger';

let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  try {
    // Disable logging during tests
    logger.transports.forEach(t => t.silent = true);

    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(mongoUri);

    console.log('MongoDB Memory Server started');
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Teardown after all tests
afterAll(async () => {
  try {
    // Disconnect mongoose
    await mongoose.disconnect();

    // Stop MongoDB Memory Server
    if (mongoServer) {
      await mongoServer.stop();
    }

    console.log('MongoDB Memory Server stopped');
  } catch (error) {
    console.error('Failed to teardown test environment:', error);
    throw error;
  }
});

// Global test utilities
export const createMockUser = () => {
  return {
    email: 'test@example.com',
    name: 'Test User',
    password: 'password123',
    timezone: 'America/New_York',
  };
};

export const createMockTask = (userId: string) => {
  return {
    userId,
    name: 'Test Task',
    estimatedPomodoros: 3,
    status: 'pending',
  };
};

export const createMockPomodoroSession = (userId: string, taskId: string) => {
  return {
    userId,
    taskId,
    startTime: new Date(),
    duration: 1800000, // 30 minutes
    completed: false,
    interruptions: [],
  };
};
