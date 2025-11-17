import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  timezone: string;
  oauthProvider?: 'google';
  oauthId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: {
      type: String,
      required: function (this: IUser) {
        return !this.oauthProvider;
      },
      minlength: 60,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
    },
    oauthProvider: {
      type: String,
      enum: ['google'],
      sparse: true,
    },
    oauthId: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ oauthProvider: 1, oauthId: 1 }, { unique: true, sparse: true });
UserSchema.index({ createdAt: -1 });

// Instance method to compare password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Static method to hash password
UserSchema.statics.hashPassword = async function (password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const User = mongoose.model<IUser>('User', UserSchema);
