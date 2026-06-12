import { Router } from 'express';
import callController from '../controllers/callController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Obter token de acesso do Twilio Voice (exige autenticação do Atos2)
router.get('/token', authenticateToken, asyncHandler((req, res) => callController.getAccessToken(req, res)));

// Obter servidores ICE para WebRTC
router.get('/ice-servers', authenticateToken, asyncHandler((req, res) => callController.getIceServers(req, res)));

// Webhook para roteamento TwiML (Não deve usar authenticateToken padrão, pois quem acessa é o servidor do Twilio)
// Twilio manda o parâmetro "To" em um x-www-form-urlencoded POST body tipicamente.
router.post('/voice', asyncHandler((req, res) => callController.handleIncomingVoiceRequest(req, res)));

export default router;
