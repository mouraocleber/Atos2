import { Router } from 'express';
import { stripeController } from '../controllers/stripeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Endpoint chamado pelo app React Native para iniciar o Terminal
router.post('/connection_token', authenticateToken, stripeController.getConnectionToken.bind(stripeController));

// Endpoint chamado pelo App para gerar o valor da cobrança da maquininha
router.post('/create_intent', authenticateToken, stripeController.createPaymentIntent.bind(stripeController));

export default router;
