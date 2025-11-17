import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  estimatedPomodoros: number;
  actualPomodoros: number;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate?: Date;
  grouping?: string;
  groupId?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  customFieldValues?: Map<string, any>; // User Story 8
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
      trim: true,
    },
    estimatedPomodoros: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    actualPomodoros: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
      index: true,
    },
    dueDate: {
      type: Date,
      validate: {
        validator: function (value: Date) {
          return !value || value > new Date();
        },
        message: 'Due date must be in the future',
      },
    },
    grouping: {
      type: String,
      maxlength: 50,
      trim: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    customFieldValues: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, grouping: 1 });
TaskSchema.index({ groupId: 1, status: 1 });

// Virtual for Pomodoro accuracy
TaskSchema.virtual('pomodoroAccuracy').get(function (this: ITask) {
  if (this.estimatedPomodoros === 0) return 0;
  return ((this.actualPomodoros - this.estimatedPomodoros) / this.estimatedPomodoros) * 100;
});

// Ensure virtuals are included in JSON
TaskSchema.set('toJSON', { virtuals: true });
TaskSchema.set('toObject', { virtuals: true });

export const Task = mongoose.model<ITask>('Task', TaskSchema);
