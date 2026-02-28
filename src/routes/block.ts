import { Router } from 'express';
import blockController from '../controllers/blockController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Bloquear usuário
router.post('/', asyncHandler((req, res) => blockController.blockUser(req, res)));

// Desbloquear usuário
router.delete('/', asyncHandler((req, res) => blockController.unblockUser(req, res)));

// Obter lista de usuários bloqueados
router.get('/', asyncHandler((req, res) => blockController.getBlockedUsers(req, res)));

// Verificar se um usuário está bloqueado
router.get('/:blockedUserId', asyncHandler((req, res) => blockController.isUserBlocked(req, res)));

// Contar usuários bloqueados
router.get('/count', asyncHandler((req, res) => blockController.getBlockedUsersCount(req, res)));

export default router;

