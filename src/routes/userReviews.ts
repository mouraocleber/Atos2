import { Router } from 'express';
import userReviewController from '../controllers/userReviewController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Criar avaliação de usuário
router.post('/', asyncHandler((req, res) => userReviewController.createReview(req, res)));

// Obter avaliações de um usuário (avaliações que ele recebeu)
router.get('/user/:userId', asyncHandler((req, res) => userReviewController.getUserReviews(req, res)));

// Obter avaliações feitas por um usuário
router.get('/made-by/:userId', asyncHandler((req, res) => userReviewController.getReviewsByUser(req, res)));

// Obter reputação de um usuário
router.get('/reputation/:userId', asyncHandler((req, res) => userReviewController.getUserReputation(req, res)));

// Verificar se já avaliou um usuário
router.get('/check/:reviewedUserId', asyncHandler((req, res) => userReviewController.checkReview(req, res)));

// Atualizar avaliação
router.put('/:reviewId', asyncHandler((req, res) => userReviewController.updateReview(req, res)));

// Deletar (ocultar) avaliação
router.delete('/:reviewId', asyncHandler((req, res) => userReviewController.deleteReview(req, res)));

// Reportar avaliação abusiva
router.post('/:reviewId/report', asyncHandler((req, res) => userReviewController.reportReview(req, res)));

// Top vendedores por reputação
router.get('/top-sellers', asyncHandler((req, res) => userReviewController.getTopSellers(req, res)));

export default router;
