import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import messageService from '../services/messageService';
import userService from '../services/userService';
import translationService from '../services/translationService';
import contactService from '../services/contactService';
import { AppError } from '../middleware/errorHandler';
import { Message } from '../types';

export class MessageController {
  async sendMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { recipientId, content, scheduledAt } = req.body;
      let { type } = req.body;
      let mediaUrl = req.body.mediaUrl;
      const senderId = req.userId!;
      
      // Se um arquivo foi enviado via Multer, detectar tipo por MIME
      if (req.file) {
        const mime = req.file.mimetype;
        const relPath = req.file.path.replace(/\\/g, '/').replace(process.cwd().replace(/\\/g, '/'), '');

        if (mime.startsWith('image/')) {
          type = type || 'IMAGE';
          mediaUrl = `/uploads/images/${req.file.filename}`;
        } else if (mime.startsWith('video/')) {
          type = type || 'VIDEO';
          mediaUrl = `/uploads/videos/${req.file.filename}`;
        } else {
          type = type || 'AUDIO';
          mediaUrl = `/uploads/audios/${req.file.filename}`;
        }
      }

      if (!recipientId || !type || (!content && !mediaUrl)) {
        throw new AppError(400, 'Campos obrigatórios faltando', 'MISSING_FIELDS');
      }

      if (!['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE'].includes(type)) {
        throw new AppError(400, 'Tipo de mensagem inválido', 'INVALID_MESSAGE_TYPE');
      }

      // Verificar se o receptor existe
      const recipient = await userService.getUserById(recipientId);
      if (!recipient) {
        throw new AppError(404, 'Receptor não encontrado', 'RECIPIENT_NOT_FOUND');
      }

      // Lógica de Bloqueio de Não-Contatos
      if (recipient.blockNonContacts) {
        const isContact = await contactService.isContact(recipientId, senderId);
        if (!isContact) {
          throw new AppError(403, 'O destinatário bloqueia mensagens de não-contatos', 'BLOCKED_NON_CONTACT');
        }
      }

      // Lógica de Filtragem de Palavras-Chave (apenas para texto)
      if (type === 'TEXT' && content) {
        const blockedKeywords = ['spam', 'oferta', 'promoção', 'ganhe dinheiro'];
        const lowerCaseContent = content.toLowerCase();
        const isBlocked = blockedKeywords.some(keyword => lowerCaseContent.includes(keyword));
        if (isBlocked) {
          throw new AppError(403, 'Mensagem bloqueada por conter palavras-chave proibidas', 'BLOCKED_KEYWORD');
        }
      }

      // Interceptar Áudio para Transcrição Automática (Whisper)
      let finalContent = content || '';
      if (type === 'AUDIO' && mediaUrl) {
        try {
          const path = require('path');
          let localPath = mediaUrl;
          if (localPath.startsWith('/uploads')) {
             localPath = path.join(process.cwd(), localPath.replace(/^\//, ''));
          } else if (localPath.startsWith('http')) {
             const url = new URL(localPath);
             localPath = path.join(process.cwd(), url.pathname.replace(/^\//, ''));
          } else {
             localPath = path.join(process.cwd(), localPath.replace(/^\//, ''));
          }
          console.log('[Audio Pipeline] Transcrevendo áudio via Whisper:', localPath);
          finalContent = await translationService.transcribeAudio(localPath);
        } catch (err) {
          console.error('[Audio Pipeline] Falha na transcrição Whisper, pulando:', err);
          finalContent = content || '[Áudio]';
        }
      }

      // Criar mensagem original no BD com a Transcrição atachada
      const message = await messageService.createMessage({
        senderId,
        recipientId,
        type,
        content: finalContent,
        mediaUrl,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });

      // Traduzir mensagem se necessário
      let translatedMessage: any = { ...message };
      try {
        if (type === 'TEXT' || type === 'AUDIO') {
          const senderLanguage = (await userService.getUserById(senderId))?.preferredLanguage || 'pt-BR';
          const recipientLanguage = recipient.preferredLanguage;

          if (senderLanguage !== recipientLanguage && finalContent) {
            console.log(`[Translate Pipeline] Traduzindo "${finalContent}" de ${senderLanguage} para ${recipientLanguage}`);
            const translatedContent = await translationService.translateText(
              finalContent,
              senderLanguage,
              recipientLanguage
            );

            // Salvar tradução
            await translationService.saveTranslation(
              message.id,
              finalContent,
              senderLanguage,
              translatedContent,
              recipientLanguage
            );

            // Atualizar mensagem com tradução
            await translationService.updateMessageWithTranslation(
              message.id,
              translatedContent,
              recipientLanguage,
              senderLanguage
            );

            translatedMessage = {
              ...message,
              translatedContent,
              translatedLanguage: recipientLanguage,
              originalLanguage: senderLanguage,
            };
          }
        }
      } catch (translationError) {
        console.error('Erro ao traduzir mensagem:', translationError);
        // Continuar mesmo se a tradução falhar
      }

      res.status(201).json({
        success: true,
        message: scheduledAt ? 'Mensagem agendada com sucesso' : 'Mensagem enviada com sucesso',
        data: translatedMessage,
      });
    } catch (error) {
      throw error;
    }
  }

  async getConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const { otherUserId } = req.params;
      const userId = req.userId!;
      const { limit = 50, offset = 0 } = req.query;

      if (!otherUserId) {
        throw new AppError(400, 'ID do outro usuário é obrigatório', 'MISSING_FIELDS');
      }

      const messages = await messageService.getConversation(
        userId,
        otherUserId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      // O usuário abriu a conversa, portanto as mensagens foram lidas
      await messageService.markConversationAsRead(userId, otherUserId);

      res.json({
        success: true,
        message: 'Conversa recuperada com sucesso',
        data: messages,
      });
    } catch (error) {
      throw error;
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        throw new AppError(400, 'ID da mensagem é obrigatório', 'MISSING_FIELDS');
      }

      const message = await messageService.markAsRead(messageId);

      res.json({
        success: true,
        message: 'Mensagem marcada como lida',
        data: message,
      });
    } catch (error) {
      throw error;
    }
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const count = await messageService.getUnreadCount(userId);

      res.json({
        success: true,
        message: 'Contagem de mensagens não lidas',
        data: { unreadCount: count },
      });
    } catch (error) {
      throw error;
    }
  }

  async editMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const { newContent } = req.body;
      const userId = req.userId!;

      if (!messageId || !newContent) {
        throw new AppError(400, 'ID da mensagem e novo conteúdo são obrigatórios', 'MISSING_FIELDS');
      }

      const message = await messageService.getMessageById(messageId);

      if (!message) {
        throw new AppError(404, 'Mensagem não encontrada', 'MESSAGE_NOT_FOUND');
      }

      if (message.senderId !== userId) {
        throw new AppError(403, 'Você só pode editar suas próprias mensagens', 'UNAUTHORIZED_ACTION');
      }

      const editedMessage = await messageService.editMessage(messageId, newContent);

      res.json({
        success: true,
        message: 'Mensagem editada com sucesso',
        data: editedMessage,
      });
    } catch (error) {
      throw error;
    }
  }

  async getConversationList(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { limit = 20 } = req.query;

      const conversations = await messageService.getConversationList(
        userId,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        message: 'Lista de conversas',
        data: conversations,
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;

      if (!messageId) {
        throw new AppError(400, 'ID da mensagem é obrigatório', 'MISSING_FIELDS');
      }

      const deleted = await messageService.deleteMessage(messageId);

      if (!deleted) {
        throw new AppError(404, 'Mensagem não encontrada', 'MESSAGE_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Mensagem deletada com sucesso',
      });
    } catch (error) {
      throw error;
    }
  }

  async transcribeAudio(req: AuthenticatedRequest, res: Response) {
    try {
      const { audioPath } = req.body;

      if (!audioPath) {
        throw new AppError(400, 'Caminho do áudio é obrigatório', 'MISSING_FIELDS');
      }

      const transcription = await translationService.transcribeAudio(audioPath);
      const userId = req.userId!;
      const user = await userService.getUserById(userId);

      res.json({
        success: true,
        message: 'Áudio transcrito com sucesso',
        data: {
          transcription,
          language: user?.preferredLanguage || 'pt-BR',
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async translateMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId, targetLanguage } = req.body;

      if (!messageId || !targetLanguage) {
        throw new AppError(400, 'ID da mensagem e idioma alvo são obrigatórios', 'MISSING_FIELDS');
      }

      const message = await messageService.getMessageById(messageId);
      if (!message) {
        throw new AppError(404, 'Mensagem não encontrada', 'MESSAGE_NOT_FOUND');
      }

      // Verificar se já existe tradução em cache
      let translation = await translationService.getTranslation(messageId, targetLanguage);

      if (!translation) {
        const originalLanguage = message.originalLanguage || 'pt-BR';
        const translatedContent = await translationService.translateText(
          message.content,
          originalLanguage,
          targetLanguage
        );

        translation = await translationService.saveTranslation(
          messageId,
          message.content,
          originalLanguage,
          translatedContent,
          targetLanguage
        );
      }

      res.json({
        success: true,
        message: 'Mensagem traduzida com sucesso',
        data: translation,
      });
    } catch (error) {
      throw error;
    }
  }

  async getSupportedLanguages(req: AuthenticatedRequest, res: Response) {
    try {
      const languages = translationService.getSupportedLanguages();

      res.json({
        success: true,
        message: 'Idiomas suportados',
        data: languages,
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new MessageController();

