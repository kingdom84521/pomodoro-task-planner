import { User, IUser } from '../../models/User';
import { Configuration } from '../../models/Configuration';
import { generateTokenPair, TokenPair } from './jwtService';
import { AppError } from '../../api/middleware/errorHandler';
import bcrypt from 'bcrypt';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  timezone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    _id: string;
    email: string;
    name: string;
    timezone: string;
  };
  tokens: TokenPair;
}

/**
 * Register a new user
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, name, timezone = 'UTC' } = input;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(409, 'User with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = new User({
    email,
    passwordHash,
    name,
    timezone,
  });

  await user.save();

  // Create default configuration for user
  const config = new Configuration({
    userId: user._id,
    pomodoroDuration: 1800000, // 30 minutes
    shortBreak: 300000, // 5 minutes
    longBreak: 900000, // 15 minutes
    longBreakInterval: 4,
  });

  await config.save();

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString(), user.email);

  return {
    user: {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    },
    tokens,
  };
}

/**
 * Login user
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString(), user.email);

  return {
    user: {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    },
    tokens,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<IUser | null> {
  return await User.findById(userId).select('-passwordHash');
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  register,
  login,
  getUserById,
  validatePassword,
};
