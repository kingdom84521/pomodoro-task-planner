import mongoose, { Schema, Document } from 'mongoose';

export interface IConfiguration extends Document {
  userId: mongoose.Types.ObjectId;
  pomodoroDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  dailyUsageStart?: string;
  dailyUsageEnd?: string;
  createdAt: Date;
  updatedAt: Date;
  calculateNextBreakType(completedPomodoros: number): 'short' | 'long';
}

const ConfigurationSchema = new Schema<IConfiguration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    pomodoroDuration: {
      type: Number,
      required: true,
      min: 300000, // 5 minutes
      max: 7200000, // 2 hours
      default: 1800000, // 30 minutes
    },
    shortBreak: {
      type: Number,
      required: true,
      min: 60000, // 1 minute
      max: 1800000, // 30 minutes
      default: 300000, // 5 minutes
    },
    longBreak: {
      type: Number,
      required: true,
      min: 300000, // 5 minutes
      max: 3600000, // 1 hour
      default: 900000, // 15 minutes
    },
    longBreakInterval: {
      type: Number,
      required: true,
      min: 2,
      max: 10,
      default: 4,
    },
    dailyUsageStart: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    dailyUsageEnd: {
      type: String,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
      validate: {
        validator: function (this: IConfiguration, value: string) {
          if (!this.dailyUsageStart || !value) return true;
          return value > this.dailyUsageStart;
        },
        message: 'Daily usage end must be after start',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Unique index
ConfigurationSchema.index({ userId: 1 }, { unique: true });

// Method to calculate next break type
ConfigurationSchema.methods.calculateNextBreakType = function (
  completedPomodoros: number
): 'short' | 'long' {
  // After every longBreakInterval Pomodoros, take a long break
  if (completedPomodoros > 0 && completedPomodoros % this.longBreakInterval === 0) {
    return 'long';
  }
  return 'short';
};

export const Configuration = mongoose.model<IConfiguration>(
  'Configuration',
  ConfigurationSchema
);
