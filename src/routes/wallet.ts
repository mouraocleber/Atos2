import { Router } from 'express';
import { WalletController } from '../controllers/walletController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const controller = new WalletController();

// Middleware de autenticação
router.use(authenticateToken);

// Rotas de Carteira
router.get('/', (req, res) => controller.getWallet(req, res));
router.get('/balance', (req, res) => controller.getBalance(req, res));
router.post('/add-balance', (req, res) => controller.addBalance(req, res));

// Rotas de Transações
router.post('/transactions', (req, res) => controller.createTransaction(req, res));
router.get('/transactions', (req, res) => controller.getTransactionHistory(req, res));
router.get('/transactions/:transactionId', (req, res) => controller.getTransaction(req, res));
router.post('/transactions/:transactionId/refund', (req, res) => controller.refundTransaction(req, res));

// Rotas de Estatísticas
router.get('/statistics', (req, res) => controller.getStatistics(req, res));

// Rotas de cambio
router.post('/convert', (req, res) => controller.convertCurrency(req, res));
router.get('/exchange-rates', (req, res) => controller.getExchangeRates(req, res));
router.get('/currencies', (req, res) => controller.getSupportedCurrencies(req, res));
router.get('/currencies/:code', (req, res) => controller.getCurrencyInfo(req, res));

export default router;

