import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  matricule: string;
  phoneNumber: string;
  department?: Types.ObjectId;
  position?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee'],
    default: 'employee'
  },
  matricule: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: Schema.Types.ObjectId,
    ref: 'Department'
  },
  position: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', userSchema); 