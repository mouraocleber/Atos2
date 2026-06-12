import { Router } from 'express';
import productController from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { upload } from '../middleware/upload';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Criar produto (suporta upload de imagem da vitrine)
router.post('/', upload.single('image'), asyncHandler((req, res) => productController.createProduct(req, res)));

// Obter produtos do marketplace (Todos os ativos)
router.get('/marketplace', asyncHandler((req, res) => productController.getMarketplaceProducts(req, res)));

// Obter produtos do usuário
router.get('/', asyncHandler((req, res) => productController.getUserProducts(req, res)));

// Obter estatísticas
router.get('/statistics', asyncHandler((req, res) => productController.getProductStatistics(req, res)));

// Obter categorias
router.get('/categories', asyncHandler((req, res) => productController.getUserCategories(req, res)));

// Obter produtos por categoria
router.get('/category/:category', asyncHandler((req, res) => productController.getProductsByCategory(req, res)));

// Obter histórico de compras (reservas)
router.get('/reservations/my-purchases', asyncHandler((req, res) => productController.getMyPurchases(req, res)));

// Obter histórico de vendas (reservas)
router.get('/reservations/my-sales', asyncHandler((req, res) => productController.getMySales(req, res)));

// Reservar um produto
router.post('/:productId/reserve', asyncHandler((req, res) => productController.reserveProduct(req, res)));

// Obter produto específico
router.get('/:productId', asyncHandler((req, res) => productController.getProductById(req, res)));

// Atualizar produto
router.put('/:productId', asyncHandler((req, res) => productController.updateProduct(req, res)));

// Deletar produto
router.delete('/:productId', asyncHandler((req, res) => productController.deleteProduct(req, res)));

// Obter estatísticas de avaliações de um produto
router.get('/:productId/review-stats', asyncHandler((req, res) => productController.getProductReviewStats(req, res)));

export default router;

