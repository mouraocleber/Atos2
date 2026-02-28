import { Router } from 'express';
import backupController from '../controllers/backupController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Criar backup
router.post('/', asyncHandler((req, res) => backupController.createBackup(req, res)));

// Obter backups do usuário
router.get('/', asyncHandler((req, res) => backupController.getUserBackups(req, res)));

// Obter estatísticas
router.get('/statistics', asyncHandler((req, res) => backupController.getBackupStatistics(req, res)));

// Obter backup específico
router.get('/:backupId', asyncHandler((req, res) => backupController.getBackupById(req, res)));

// Deletar backup
router.delete('/:backupId', asyncHandler((req, res) => backupController.deleteBackup(req, res)));

export default router;

