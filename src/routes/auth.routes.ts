import express from 'express';
import { register, login, refreshToken, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/register', register as express.RequestHandler);
router.post('/login', login as express.RequestHandler);
router.post('/refresh-token', refreshToken as express.RequestHandler);
router.post('/logout', logout as express.RequestHandler);

// Protected routes
router.get('/me', authenticate as express.RequestHandler, (req: express.Request, res: express.Response) => {
  res.json({ user: req.user });
});

export default router; 