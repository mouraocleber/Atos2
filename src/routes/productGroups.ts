import { Router } from 'express';
import { ProductGroupController } from '../controllers/productGroupController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new ProductGroupController();

// Middleware de autenticação
router.use(authenticateToken);

// Rotas de Grupos
router.post('/groups', (req, res) => controller.createGroup(req, res));
router.get('/groups', (req, res) => controller.getGroups(req, res));
router.get('/groups/with-products', (req, res) => controller.getGroupsWithProducts(req, res));
router.put('/groups/:groupId', (req, res) => controller.updateGroup(req, res));
router.delete('/groups/:groupId', (req, res) => controller.deleteGroup(req, res));
router.post('/groups/reorder', (req, res) => controller.reorderGroups(req, res));

// Rotas de Produtos
router.post('/products', (req, res) => controller.createProduct(req, res));
router.get('/products', (req, res) => controller.getProducts(req, res));
router.get('/products/active', (req, res) => controller.getActiveProducts(req, res));
router.get('/products/statistics', (req, res) => controller.getStatistics(req, res));
router.get('/groups/:groupId/products', (req, res) => controller.getProductsByGroup(req, res));
router.put('/products/:productId', (req, res) => controller.updateProduct(req, res));
router.delete('/products/:productId', (req, res) => controller.deleteProduct(req, res));

export default router;

