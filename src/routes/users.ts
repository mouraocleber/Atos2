import { Router } from 'express';
import userSearchController from '../controllers/userSearchController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Busca geral de usuários
router.get('/search', asyncHandler((req, res) => userSearchController.searchUsers(req, res)));

// Buscar por nickname
router.get('/search/nickname', asyncHandler((req, res) => userSearchController.searchByNickname(req, res)));

// Buscar por nome
router.get('/search/name', asyncHandler((req, res) => userSearchController.searchByName(req, res)));

// Buscar por cidade
router.get('/search/city', asyncHandler((req, res) => userSearchController.searchByCity(req, res)));

// Buscar por estado
router.get('/search/state', asyncHandler((req, res) => userSearchController.searchByState(req, res)));

// Busca avançada
router.get('/search/advanced', asyncHandler((req, res) => userSearchController.advancedSearch(req, res)));

// Usuários populares (mais recentes)
router.get('/popular', asyncHandler((req, res) => userSearchController.getPopularUsers(req, res)));

// Contagem total de usuários
router.get('/count', asyncHandler((req, res) => userSearchController.getUsersCount(req, res)));

// Alternar visibilidade global do usuário (Ocultar Perfil)
router.put('/search-visibility', asyncHandler((req, res) => userSearchController.updateSearchVisibility(req, res)));

// Atualizar localização GPS do usuário (para busca por proximidade)
router.put('/location', asyncHandler((req, res) => userSearchController.updateLocation(req, res)));

export default router;
