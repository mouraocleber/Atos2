import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Rota Privada (Gerar Pagamento no App)
router.post('/deposit/pix', authenticateToken, paymentController.generatePixDeposit.bind(paymentController));

// Rota Pública Externa (Webhook para o Mercado Pago enviar os avisos)
router.post('/webhook/mercadopago', paymentController.mercadoPagoWebhook.bind(paymentController));


// Binance Pay / Cripto
router.get('/binance/quote', paymentController.getBinanceQuote.bind(paymentController));
router.post('/deposit/binance', authenticateToken, paymentController.createBinanceDeposit.bind(paymentController));
router.get('/binance/order-status/:orderId', authenticateToken, paymentController.checkBinanceOrderStatus.bind(paymentController));

export default router;
