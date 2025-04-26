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
import { Department } from '../models/Department';

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
router.post(
  '/:id/employees',
  authorize('admin', 'manager') as express.RequestHandler,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === 'manager') {
        const department = await Department.findById(req.params.id);
        if (!department) {
          res.status(404).json({ message: 'Department not found' });
          return;
        }
        if (department.manager?.toString() !== req.user._id.toString()) {
          res.status(403).json({ message: 'Managers can only modify their own department' });
          return;
        }
      }
      next();
    } catch (error) {
      res.status(500).json({ message: 'Error checking department manager', error });
    }
  },
  addEmployee as express.RequestHandler
);

// Remove employee from department (admin and manager)
router.delete(
  '/:id/employees',
  authorize('admin', 'manager') as express.RequestHandler,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === 'manager') {
        const department = await Department.findById(req.params.id);
        if (!department) {
          res.status(404).json({ message: 'Department not found' });
          return;
        }
        if (department.manager?.toString() !== req.user._id.toString()) {
          res.status(403).json({ message: 'Managers can only modify their own department' });
          return;
        }
      }
      next();
    } catch (error) {
      res.status(500).json({ message: 'Error checking department manager', error });
    }
  },
  removeEmployee as express.RequestHandler
);

export default router;