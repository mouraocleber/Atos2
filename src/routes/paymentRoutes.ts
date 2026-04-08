import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rota Privada (Gerar Pagamento no App)
router.post('/deposit/pix', authenticateToken, paymentController.generatePixDeposit.bind(paymentController));

// Rota Pública Externa (Webhook para o Mercado Pago enviar os avisos)
router.post('/webhook/mercadopago', paymentController.mercadoPagoWebhook.bind(paymentController));

export default router;
