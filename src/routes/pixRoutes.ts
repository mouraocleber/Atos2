import { Router } from 'express';
import { paymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/pay', authenticateToken, paymentController.payPixExternal.bind(paymentController));

export default router;
