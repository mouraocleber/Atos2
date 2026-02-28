import { Router } from 'express';
import qrCodeController from '../controllers/qrCodeController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Gerar QR Code
router.post('/generate', asyncHandler((req, res) => qrCodeController.generateQRCode(req, res)));

// Escanear QR Code
router.post('/scan', asyncHandler((req, res) => qrCodeController.scanQRCode(req, res)));

// Obter histórico de QR Codes
router.get('/history', asyncHandler((req, res) => qrCodeController.getQRCodeHistory(req, res)));

// Obter QR Code específico
router.get('/:qrCodeId', asyncHandler((req, res) => qrCodeController.getQRCode(req, res)));

export default router;

