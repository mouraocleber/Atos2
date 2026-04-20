import { Router } from 'express';
import authController from '../controllers/authController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { upload } from '../middleware/upload';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Limite de 10 tentativas de login/envio de código por IP
  message: { success: false, message: 'Muitas tentativas. Sua conta/IP foi temporariamente bloqueada por 15 minutos por segurança.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/register', loginLimiter, asyncHandler((req, res) => authController.register(req, res)));
router.post('/login', loginLimiter, asyncHandler((req, res) => authController.login(req, res)));
router.post('/google-signin', loginLimiter, asyncHandler((req, res) => authController.googleSignIn(req, res)));
router.post('/send-sms-code', loginLimiter, asyncHandler((req, res) => authController.sendSMSCode(req, res)));
router.post('/send-email-code', loginLimiter, asyncHandler((req, res) => authController.sendEmailCode(req, res)));
router.post('/verify-code', loginLimiter, asyncHandler((req, res) => authController.verifyCode(req, res)));
router.post('/refresh-token', authenticateToken, asyncHandler((req, res) => authController.refreshToken(req, res)));
router.post('/verify-password', authenticateToken, asyncHandler((req, res) => authController.verifyPassword(req, res)));
router.get('/me', authenticateToken, asyncHandler((req, res) => authController.me(req, res)));
router.put('/me', authenticateToken, asyncHandler((req, res) => authController.updateProfile(req, res)));
router.put('/change-password', authenticateToken, asyncHandler((req, res) => authController.changePassword(req, res)));
router.post('/profile-image', authenticateToken, upload.single('image'), asyncHandler((req, res) => authController.uploadProfileImage(req, res)));
router.post('/upgrade-plan', authenticateToken, asyncHandler((req, res) => authController.upgradePlan(req, res)));

export default router;

