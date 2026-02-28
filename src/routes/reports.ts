import { Router } from 'express';
import reportController from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Criar denúncia
router.post('/', asyncHandler((req, res) => reportController.createReport(req, res)));

// Obter denúncias do usuário
router.get('/my-reports', asyncHandler((req, res) => reportController.getUserReports(req, res)));

// Obter denúncias pendentes (admin)
router.get('/pending', asyncHandler((req, res) => reportController.getPendingReports(req, res)));

// Obter estatísticas de denúncias
router.get('/statistics', asyncHandler((req, res) => reportController.getReportStatistics(req, res)));

// Obter denúncia específica
router.get('/:reportId', asyncHandler((req, res) => reportController.getReportById(req, res)));

// Obter denúncias sobre um usuário
router.get('/user/:userId', asyncHandler((req, res) => reportController.getReportsByUser(req, res)));

// Atualizar status da denúncia
router.put('/:reportId', asyncHandler((req, res) => reportController.updateReportStatus(req, res)));

export default router;

