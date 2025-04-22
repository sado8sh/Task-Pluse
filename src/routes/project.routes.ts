import express, { Request, Response, NextFunction } from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember
} from '../controllers/project.controller';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate as express.RequestHandler);

// Get all projects
router.get('/', getProjects as express.RequestHandler);

// Get single project
router.get('/:id', getProject as express.RequestHandler);

// Create project (admin and manager)
router.post('/', authorize('admin', 'manager') as express.RequestHandler, createProject as express.RequestHandler);

// Update project
router.put('/:id', updateProject as express.RequestHandler);

// Delete project
router.delete('/:id', deleteProject as express.RequestHandler);

// Add team member
router.post('/:id/team', addTeamMember as express.RequestHandler);

// Remove team member
router.delete('/:id/team', removeTeamMember as express.RequestHandler);

export default router; 