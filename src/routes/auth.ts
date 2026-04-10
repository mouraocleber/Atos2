import { Router } from 'express';
import authController from '../controllers/authController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/register', asyncHandler((req, res) => authController.register(req, res)));
router.post('/login', asyncHandler((req, res) => authController.login(req, res)));
router.post('/send-sms-code', asyncHandler((req, res) => authController.sendSMSCode(req, res)));
router.post('/send-email-code', asyncHandler((req, res) => authController.sendEmailCode(req, res)));
router.post('/verify-code', asyncHandler((req, res) => authController.verifyCode(req, res)));
router.post('/refresh-token', authenticateToken, asyncHandler((req, res) => authController.refreshToken(req, res)));
router.get('/me', authenticateToken, asyncHandler((req, res) => authController.me(req, res)));
router.put('/me', authenticateToken, asyncHandler((req, res) => authController.updateProfile(req, res)));
router.put('/change-password', authenticateToken, asyncHandler((req, res) => authController.changePassword(req, res)));
router.post('/profile-image', authenticateToken, upload.single('image'), asyncHandler((req, res) => authController.uploadProfileImage(req, res)));

export default router;

