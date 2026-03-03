import { Router } from 'express';
import adminController from '../controllers/adminController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = Router();

// Todas as rotas administrativas requerem autenticação e privilégios de ADMIN
router.use(authenticateToken);
router.use(isAdmin);

// Estatísticas do sistema
router.get('/stats', adminController.getStats);

// Gestão de Usuários
router.get('/users', adminController.listUsers);
router.patch('/users/:userId/status', adminController.toggleUserStatus);
router.patch('/users/:userId/role', adminController.updateUserRole);

// Gestão de Denúncias (Moderação)
router.get('/reports', adminController.listReports);
router.patch('/reports/:reportId/resolve', adminController.resolveReport);

export default router;
