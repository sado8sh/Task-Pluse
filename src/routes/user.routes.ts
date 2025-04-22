import express, { Request, Response, RequestHandler } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate as RequestHandler);

// Get all users (Admin gets all, Manager gets department users)
router.get('/', getUsers);

// Get single user
router.get('/:id', getUser);

// Create user (Admin only)
router.post('/', createUser);

// Update user (Admin can update anyone, Manager can update department members)
router.put('/:id', updateUser);

// Delete user (Admin only)
router.delete('/:id', deleteUser);

export default router; 