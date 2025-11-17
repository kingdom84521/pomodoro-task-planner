import mongoose, { Schema, Document } from 'mongoose';

interface IInterruption {
  type: 'urgent' | 'break';
  duration: number;
  timestamp: Date;
  notes?: string;
}

export interface IPomodoroSession extends Document {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  duration: number;
  completed: boolean;
  interruptions: IInterruption[];
  createdAt: Date;
  updatedAt: Date;
}

const InterruptionSchema = new Schema<IInterruption>(
  {
    type: {
      type: String,
      enum: ['urgent', 'break'],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false }
);

const PomodoroSessionSchema = new Schema<IPomodoroSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      validate: {
        validator: function (this: IPomodoroSession, value: Date) {
          return !value || value > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    duration: {
      type: Number,
      required: true,
      min: 60000, // 1 minute
      max: 7200000, // 2 hours
      default: 1800000, // 30 minutes
    },
    completed: {
      type: Boolean,
      default: false,
    },
    interruptions: {
      type: [InterruptionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PomodoroSessionSchema.index({ userId: 1, startTime: -1 });
PomodoroSessionSchema.index({ taskId: 1, startTime: -1 });
PomodoroSessionSchema.index({ userId: 1, completed: 1 });

// Virtual for actual duration (excluding interruptions)
PomodoroSessionSchema.virtual('effectiveDuration').get(function (this: IPomodoroSession) {
  const totalInterruptionTime = this.interruptions.reduce((sum, int) => sum + int.duration, 0);
  return this.duration - totalInterruptionTime;
});

// Ensure virtuals are included in JSON
PomodoroSessionSchema.set('toJSON', { virtuals: true });
PomodoroSessionSchema.set('toObject', { virtuals: true });

export const PomodoroSession = mongoose.model<IPomodoroSession>(
  'PomodoroSession',
  PomodoroSessionSchema
);
