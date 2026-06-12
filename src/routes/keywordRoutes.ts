import { Router } from 'express';
import keywordController from '../controllers/keywordController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas as rotas de keywords requerem autenticação
router.use(authenticateToken);

// Compra de palavra-chave
router.post('/buy', keywordController.buyKeyword.bind(keywordController));
router.post('/', keywordController.buyKeyword.bind(keywordController));

// Listar minhas palavras-chave
router.get('/my-keywords', keywordController.getMyKeywords.bind(keywordController));
router.get('/', keywordController.getMyKeywords.bind(keywordController));

// Ativar/Desativar palavra-chave
router.put('/toggle', keywordController.toggleKeywordStatus.bind(keywordController));
router.put('/', keywordController.toggleKeywordStatus.bind(keywordController));

export default router;
