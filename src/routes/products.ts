import { Router } from 'express';
import productController from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Criar produto
router.post('/', asyncHandler((req, res) => productController.createProduct(req, res)));

// Obter produtos do usuário
router.get('/', asyncHandler((req, res) => productController.getUserProducts(req, res)));

// Obter estatísticas
router.get('/statistics', asyncHandler((req, res) => productController.getProductStatistics(req, res)));

// Obter categorias
router.get('/categories', asyncHandler((req, res) => productController.getUserCategories(req, res)));

// Obter produtos por categoria
router.get('/category/:category', asyncHandler((req, res) => productController.getProductsByCategory(req, res)));

// Obter produto específico
router.get('/:productId', asyncHandler((req, res) => productController.getProductById(req, res)));

// Atualizar produto
router.put('/:productId', asyncHandler((req, res) => productController.updateProduct(req, res)));

// Deletar produto
router.delete('/:productId', asyncHandler((req, res) => productController.deleteProduct(req, res)));

export default router;

