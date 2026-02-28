import { Router } from 'express';
import authController from '../controllers/authController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.post('/register', asyncHandler((req, res) => authController.register(req, res)));
router.post('/login', asyncHandler((req, res) => authController.login(req, res)));
router.post('/refresh-token', authenticateToken, asyncHandler((req, res) => authController.refreshToken(req, res)));
router.get('/me', authenticateToken, asyncHandler((req, res) => authController.me(req, res)));

export default router;

