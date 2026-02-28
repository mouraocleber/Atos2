import { query } from '../config/database';
import { Message, MessageType, MessageStatus } from '../types';

export class MessageService {
  async createMessage(messageData: {
    senderId: string;
    recipientId: string;
    type: MessageType;
    content: string;
    mediaUrl?: string;
    scheduledAt?: Date;
  }): Promise<Message> {
    const isScheduled = !!messageData.scheduledAt;
    const status = isScheduled ? 'SCHEDULED' : 'SENT';

    const result = await query(
      `INSERT INTO messages (
        sender_id, recipient_id, type, content, media_url, status, is_scheduled, scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, sender_id, recipient_id, type, content, media_url, 
                status, created_at, read_at, is_edited, is_scheduled, scheduled_at`,
      [
        messageData.senderId,
        messageData.recipientId,
        messageData.type,
        messageData.content,
        messageData.mediaUrl || null,
        status,
        isScheduled,
        messageData.scheduledAt || null,
      ]
    );

    return result.rows[0];
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    const result = await query(
      `SELECT id, sender_id, recipient_id, type, content, media_url, 
              status, created_at, read_at
       FROM messages WHERE id = $1`,
      [messageId]
    );

    return result.rows[0] || null;
  }

  async getConversation(userId1: string, userId2: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const result = await query(
      `SELECT id, sender_id, recipient_id, type, content, media_url, 
              status, created_at, read_at
       FROM messages 
       WHERE ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))
       AND status != 'SCHEDULED'
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId1, userId2, limit, offset]
    );

    return result.rows.reverse();
  }

  async getScheduledMessages(): Promise<Message[]> {
    const result = await query(
      `SELECT id, sender_id, recipient_id, type, content, media_url, 
              status, created_at, read_at, is_edited, is_scheduled, scheduled_at
       FROM messages 
       WHERE status = 'SCHEDULED' AND scheduled_at <= CURRENT_TIMESTAMP
       ORDER BY scheduled_at ASC`,
      []
    );

    return result.rows;
  }

  async sendScheduledMessage(messageId: string): Promise<Message | null> {
    const result = await query(
      `UPDATE messages SET status = 'SENT', is_scheduled = FALSE, created_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND status = 'SCHEDULED'
       RETURNING id, sender_id, recipient_id, type, content, media_url, 
                 status, created_at, read_at, is_edited, is_scheduled, scheduled_at`,
      [messageId]
    );

    return result.rows[0] || null;
  }

  async getUserMessages(userId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const result = await query(
      `SELECT id, sender_id, recipient_id, type, content, media_url, 
              status, created_at, read_at
       FROM messages 
       WHERE recipient_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  async markAsDelivered(messageId: string): Promise<Message | null> {
    const result = await query(
      `UPDATE messages SET status = $1 WHERE id = $2
       RETURNING id, sender_id, recipient_id, type, content, media_url, 
                 status, created_at, read_at`,
      ['DELIVERED', messageId]
    );

    return result.rows[0] || null;
  }

  async editMessage(messageId: string, newContent: string): Promise<Message | null> {
    const result = await query(
      `UPDATE messages SET content = $1, is_edited = TRUE WHERE id = $2
       RETURNING id, sender_id, recipient_id, type, content, media_url, 
                 status, created_at, read_at, is_edited, is_scheduled`,
      [newContent, messageId]
    );

    return result.rows[0] || null;
  }

  async markAsRead(messageId: string): Promise<Message | null> {
    const result = await query(
      `UPDATE messages SET status = $1, read_at = CURRENT_TIMESTAMP WHERE id = $2
       RETURNING id, sender_id, recipient_id, type, content, media_url, 
                 status, created_at, read_at`,
      ['READ', messageId]
    );

    return result.rows[0] || null;
  }

  async markConversationAsRead(userId: string, otherUserId: string): Promise<void> {
    await query(
      `UPDATE messages SET status = $1, read_at = CURRENT_TIMESTAMP 
       WHERE recipient_id = $2 AND sender_id = $3 AND status != $4`,
      ['READ', userId, otherUserId, 'READ']
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM messages 
       WHERE recipient_id = $1 AND status != 'READ'`,
      [userId]
    );

    return parseInt(result.rows[0]?.count || 0);
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM messages WHERE id = $1',
      [messageId]
    );

    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getConversationList(userId: string, limit: number = 20): Promise<any[]> {
    const result = await query(
      `SELECT 
        CASE 
          WHEN sender_id = $1 THEN recipient_id 
          ELSE sender_id 
        END as other_user_id,
        MAX(created_at) as last_message_at,
        COUNT(*) FILTER (WHERE status != 'READ' AND recipient_id = $1) as unread_count
       FROM messages 
       WHERE sender_id = $1 OR recipient_id = $1
       GROUP BY other_user_id
       ORDER BY last_message_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  async getUnreadMessages(userId: string): Promise<Message[]> {
    const result = await query(
      `SELECT id, sender_id, recipient_id, type, content, media_url, 
              status, created_at, read_at, is_edited, is_scheduled
       FROM messages 
       WHERE recipient_id = $1 AND status != 'READ'
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }
}

export default new MessageService();

