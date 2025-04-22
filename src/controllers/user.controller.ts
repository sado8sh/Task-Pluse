import { Request, Response } from 'express';
import User from '../models/user.model';
import { isValidObjectId } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Department } from '../models/Department';

// Get all users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, department } = req.user!;
    
    // Admin can see all users
    if (role === 'admin') {
      const users = await User.find().select('-password');
      res.json(users);
      return;
    }
    
    // Manager can only see users in their department
    if (role === 'manager') {
      const users = await User.find({ department }).select('-password');
      res.json(users);
      return;
    }
    
    // Regular users can only see themselves
    const users = await User.find({ _id: req.user!._id }).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// Get single user
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }
    
    const user = await User.findById(id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Check permissions
    const { role, department } = req.user!;
    if (role !== 'admin' && 
        (role !== 'manager' || !user.department || !department || 
         user.department.toString() !== department.toString()) && 
        user._id.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Not authorized to view this user' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error in getUser:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
};

// Create user (Admin only)
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Only admins can create users' });
      return;
    }
    
    const { email, password, firstName, lastName, position, department, role, matricule, phoneNumber } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }
    
    const user = new User({
      email,
      password,
      name: `${firstName} ${lastName}`,
      role: role || 'employee',
      matricule,
      phoneNumber
    });
    
    await user.save();
    
    const userWithoutPassword = await User.findById(user._id).select('-password');
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }
    
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    // Check permissions
    const { role, department } = req.user!;
    if (role !== 'admin' && 
        (role !== 'manager' || !user.department || !department || 
         user.department.toString() !== department.toString()) && 
        user._id.toString() !== req.user!._id.toString()) {
      res.status(403).json({ message: 'Not authorized to update this user' });
      return;
    }
    
    const { firstName, lastName, position, department: newDepartment, role: newRole } = req.body;
    
    // Only admin can change roles
    if (newRole && newRole !== user.role && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Only admins can change user roles' });
      return;
    }
    
    // Update user
    const updates: any = {};
    if (firstName && lastName) updates.name = `${firstName} ${lastName}`;
    if (position) updates.position = position;
    if (newDepartment) updates.department = newDepartment;
    if (newRole) updates.role = newRole;
    
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).select('-password');
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// Delete user (Admin only)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Only admins can delete users' });
      return;
    }
    
    const { id } = req.params;
    
    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid user ID' });
      return;
    }
    
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
}; 