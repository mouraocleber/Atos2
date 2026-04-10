import messageService from './messageService';
import { Message } from '../types';
import { Server as SocketIOServer } from 'socket.io';

const SCHEDULE_INTERVAL = 60000; // 1 minuto

export class MessageScheduler {
  private io: SocketIOServer | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  public start(io?: SocketIOServer) {
    if (this.intervalId) {
      console.log('MessageScheduler já está rodando.');
      return;
    }

    if (io) this.io = io;

    console.log('Iniciando MessageScheduler...');
    this.intervalId = setInterval(this.processScheduledMessages.bind(this), SCHEDULE_INTERVAL);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('MessageScheduler parado.');
    }
  }

  private async processScheduledMessages() {
    try {
      const scheduledMessages: Message[] = await messageService.getScheduledMessages();

      if (scheduledMessages.length > 0) {
        console.log(`Processando ${scheduledMessages.length} mensagens agendadas...`);
      }

      for (const message of scheduledMessages) {
        try {
          // Simular o envio da mensagem (mudando o status de SCHEDULED para SENT)
          const sentMessage = await messageService.sendScheduledMessage(message.id);
          
          if (sentMessage) {
            console.log(`Mensagem agendada ID ${message.id} enviada com sucesso.`);
            if (this.io) {
              this.io.emit('message', sentMessage);
              this.io.emit('new_message', sentMessage);
            }
          } else {
            console.warn(`Falha ao enviar mensagem agendada ID ${message.id}. Status não era SCHEDULED.`);
          }
        } catch (error) {
          console.error(`Erro ao processar mensagem agendada ID ${message.id}:`, error);
          // TODO: Adicionar lógica para marcar como FAILED ou tentar novamente
        }
      }
    } catch (error) {
      console.error('Erro no processamento de mensagens agendadas:', error);
    }
  }
}

export default new MessageScheduler();
