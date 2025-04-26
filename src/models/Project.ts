import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  manager: mongoose.Types.ObjectId;
  team: mongoose.Types.ObjectId[];
  tasks: mongoose.Types.ObjectId[];
  department: mongoose.Types.ObjectId;
  priority: 'low' | 'medium' | 'high';
  budget?: number;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: async function (id: mongoose.Types.ObjectId): Promise<boolean> {
        const User = mongoose.model('User');
        const user = await User.exists({ _id: id });
        return !!user; // Convert to boolean
      },
      message: 'Manager does not exist'
    }
  },
  team: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function (id: mongoose.Types.ObjectId): Promise<boolean> {
        const User = mongoose.model('User');
        const user = await User.exists({ _id: id });
        return !!user;
      },
      message: 'Team member does not exist'
    }
  }],
  tasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
    validate: {
      validator: async function (id: mongoose.Types.ObjectId): Promise<boolean> {
        const Task = mongoose.model('Task');
        const task = await Task.exists({ _id: id });
        return !!task;
      },
      message: 'Task does not exist'
    }
  }],
  department: {
    type: Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
    validate: {
      validator: async function (id: mongoose.Types.ObjectId): Promise<boolean> {
        const Department = mongoose.model('Department');
        const dept = await Department.exists({ _id: id });
        return !!dept;
      },
      message: 'Department does not exist'
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  budget: {
    type: Number
  }
}, {
  timestamps: true
});

projectSchema.pre('validate', function (next) {
  if (this.endDate <= this.startDate) {
    next(new Error('endDate must be after startDate'));
  } else {
    next();
  }
});

export const Project = mongoose.model<IProject>('Project', projectSchema); 