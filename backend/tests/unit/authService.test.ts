import { register, login, getUserById } from '../../src/services/auth/authService';
import { User } from '../../src/models/User';
import { Configuration } from '../../src/models/Configuration';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  describe('register', () => {
    it('should successfully register a new user', async () => {
      const input = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
        timezone: 'America/New_York',
      };

      const result = await register(input);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(input.email);
      expect(result.user.name).toBe(input.name);
      expect(result.user.timezone).toBe(input.timezone);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      // Verify user was created in database
      const user = await User.findOne({ email: input.email });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(input.email);

      // Verify default configuration was created
      const config = await Configuration.findOne({ userId: user?._id });
      expect(config).toBeTruthy();
      expect(config?.pomodoroDuration).toBe(1800000);
      expect(config?.shortBreak).toBe(300000);
      expect(config?.longBreak).toBe(900000);
      expect(config?.longBreakInterval).toBe(4);
    });

    it('should throw error for duplicate email', async () => {
      const input = {
        email: 'duplicate@example.com',
        password: 'Password123',
        name: 'Test User',
      };

      await register(input);

      await expect(register(input)).rejects.toThrow();
    });

    it('should hash the password', async () => {
      const input = {
        email: 'hash-test@example.com',
        password: 'Password123',
        name: 'Hash Test',
      };

      await register(input);

      const user = await User.findOne({ email: input.email });
      expect(user).toBeTruthy();
      expect(user?.passwordHash).not.toBe(input.password);

      const isValid = await bcrypt.compare(input.password, user!.passwordHash);
      expect(isValid).toBe(true);
    });
  });

  describe('login', () => {
    const testUser = {
      email: 'login-test@example.com',
      password: 'Password123',
      name: 'Login Test',
    };

    beforeEach(async () => {
      await register(testUser);
    });

    it('should successfully login with correct credentials', async () => {
      const result = await login({
        email: testUser.email,
        password: testUser.password,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(testUser.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        login({
          email: 'nonexistent@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      await expect(
        login({
          email: testUser.email,
          password: 'WrongPassword123',
        })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const input = {
        email: 'getuser-test@example.com',
        password: 'Password123',
        name: 'Get User Test',
      };

      const { user } = await register(input);

      const retrieved = await getUserById(user._id.toString());

      expect(retrieved).toBeTruthy();
      expect(retrieved?._id.toString()).toBe(user._id.toString());
      expect(retrieved?.email).toBe(input.email);
    });

    it('should return null for non-existent user ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const user = await getUserById(fakeId);
      expect(user).toBeNull();
    });

    it('should throw error for invalid ID format', async () => {
      await expect(getUserById('invalid-id')).rejects.toThrow('Invalid user ID format');
    });
  });
});
