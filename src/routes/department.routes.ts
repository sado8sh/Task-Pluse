import express, { Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addEmployee,
  removeEmployee
} from '../controllers/department.controller';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate as express.RequestHandler);

// Get all departments
router.get('/', getDepartments as express.RequestHandler);

// Get single department
router.get('/:id', getDepartment as express.RequestHandler);

// Create department (admin only)
router.post('/', authorize('admin') as express.RequestHandler, createDepartment as express.RequestHandler);

// Update department (admin only)
router.put('/:id', authorize('admin') as express.RequestHandler, updateDepartment as express.RequestHandler);

// Delete department (admin only)
router.delete('/:id', authorize('admin') as express.RequestHandler, deleteDepartment as express.RequestHandler);

// Add employee to department (admin and manager)
router.post('/:id/employees', authorize('admin', 'manager') as express.RequestHandler, addEmployee as express.RequestHandler);

// Remove employee from department (admin and manager)
router.delete('/:id/employees', authorize('admin', 'manager') as express.RequestHandler, removeEmployee as express.RequestHandler);

export default router; 