import express, { Request, Response, NextFunction } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus
} from '../controllers/task.controller';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate as express.RequestHandler);

// Get all tasks (filtered by user's role and permissions)
router.get('/', getTasks as express.RequestHandler);

// Get single task
router.get('/:id', getTask as express.RequestHandler);

// Create task (admin and manager)
router.post('/', authorize('admin', 'manager') as express.RequestHandler, createTask as express.RequestHandler);

// Update task
router.put('/:id', updateTask as express.RequestHandler);

// Delete task (admin, manager, or task creator)
router.delete('/:id', deleteTask as express.RequestHandler);

// Update task status (assigned user, admin, or manager)
router.patch('/:id/status', updateTaskStatus as express.RequestHandler);

export default router; 