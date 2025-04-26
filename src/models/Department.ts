import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  type: string;
  description?: string;
  manager?: mongoose.Types.ObjectId;
  employees: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  manager: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async (id: mongoose.Types.ObjectId) => {
        const User = mongoose.model('User');
        return await User.exists({ _id: id });
      },
      message: 'Manager does not exist'
    }
  },
  employees: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async (id: mongoose.Types.ObjectId) => {
        const User = mongoose.model('User');
        return await User.exists({ _id: id });
      },
      message: 'Employee does not exist'
    }
  }]
}, {
  timestamps: true
});

export const Department = mongoose.model<IDepartment>('Department', departmentSchema); 