import { Router } from 'express';
import productReviewController from '../controllers/productReviewController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Criar avaliação de produto
router.post('/', asyncHandler((req, res) => productReviewController.createReview(req, res)));

// Obter avaliações de um produto
router.get('/:productId', asyncHandler((req, res) => productReviewController.getProductReviews(req, res)));

// Obter estatísticas de avaliações de um produto
router.get('/stats/:productId', asyncHandler((req, res) => productReviewController.getProductStats(req, res)));

// Verificar se já avaliou um produto
router.get('/check/:productId', asyncHandler((req, res) => productReviewController.checkReview(req, res)));

// Atualizar avaliação de produto
router.put('/:reviewId', asyncHandler((req, res) => productReviewController.updateReview(req, res)));

// Deletar (ocultar) avaliação de produto
router.delete('/:reviewId', asyncHandler((req, res) => productReviewController.deleteReview(req, res)));

// Reportar avaliação abusiva
router.post('/:reviewId/report', asyncHandler((req, res) => productReviewController.reportReview(req, res)));

// Produtos mais bem avaliados
router.get('/top-rated', asyncHandler((req, res) => productReviewController.getTopRatedProducts(req, res)));

export default router;
