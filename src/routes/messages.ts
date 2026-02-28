import { Router } from 'express';
import messageController from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Middleware de autenticação obrigatória
router.use(authenticateToken);

// Enviar mensagem
router.post('/', asyncHandler((req, res) => messageController.sendMessage(req, res)));

// Obter conversa com outro usuário
router.get('/conversation/:otherUserId', asyncHandler((req, res) => messageController.getConversation(req, res)));

// Marcar mensagem como lida
router.put('/:messageId/read', asyncHandler((req, res) => messageController.markAsRead(req, res)));

// Obter contagem de mensagens não lidas
router.get('/unread/count', asyncHandler((req, res) => messageController.getUnreadCount(req, res)));

// Obter lista de conversas
router.get('/conversations/list', asyncHandler((req, res) => messageController.getConversationList(req, res)));

// Deletar mensagem
router.put('/:messageId', asyncHandler((req, res) => messageController.editMessage(req, res)));

router.delete('/:messageId', asyncHandler((req, res) => messageController.deleteMessage(req, res)));

// Transcrever áudio
router.post('/transcribe/audio', asyncHandler((req, res) => messageController.transcribeAudio(req, res)));

// Traduzir mensagem
router.post('/translate', asyncHandler((req, res) => messageController.translateMessage(req, res)));

// Obter idiomas suportados
router.get('/languages/supported', asyncHandler((req, res) => messageController.getSupportedLanguages(req, res)));

export default router;

