import { query } from '../config/database';

export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: Date;
}

export class BlockService {
  async blockUser(userId: string, blockedUserId: string, reason?: string): Promise<BlockedUser> {
    try {
      // Validar que não está bloqueando a si mesmo
      if (userId === blockedUserId) {
        throw new Error('Você não pode bloquear a si mesmo');
      }

      // Verificar se já está bloqueado
      const existingBlock = await query(
        `SELECT id FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2`,
        [userId, blockedUserId]
      );

      if (existingBlock.rows.length > 0) {
        throw new Error('Usuário já está bloqueado');
      }

      // Bloquear usuário
      const result = await query(
        `INSERT INTO blocked_users (user_id, blocked_user_id, reason)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, blocked_user_id, reason, created_at`,
        [userId, blockedUserId, reason || null]
      );

      const blocked = result.rows[0];

      return {
        id: blocked.id,
        userId: blocked.user_id,
        blockedUserId: blocked.blocked_user_id,
        reason: blocked.reason,
        createdAt: blocked.created_at,
      };
    } catch (error) {
      console.error('Erro ao bloquear usuário:', error);
      throw error;
    }
  }

  async unblockUser(userId: string, blockedUserId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2`,
        [userId, blockedUserId]
      );

      return result.rowCount! > 0;
    } catch (error) {
      console.error('Erro ao desbloquear usuário:', error);
      throw error;
    }
  }

  async getBlockedUsers(userId: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT 
          bu.id, bu.blocked_user_id, bu.reason, bu.created_at,
          u.email, u.phone, u.nickname, u.name, u.profile_image, u.city, u.state
         FROM blocked_users bu
         JOIN users u ON bu.blocked_user_id = u.id
         WHERE bu.user_id = $1
         ORDER BY bu.created_at DESC`,
        [userId]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        blockedUserId: row.blocked_user_id,
        reason: row.reason,
        createdAt: row.created_at,
        user: {
          id: row.blocked_user_id,
          email: row.email,
          phone: row.phone,
          nickname: row.nickname,
          name: row.name,
          profileImage: row.profile_image,
          city: row.city,
          state: row.state,
        },
      }));
    } catch (error) {
      console.error('Erro ao obter usuários bloqueados:', error);
      throw error;
    }
  }

  async isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
    try {
      const result = await query(
        `SELECT id FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2`,
        [userId, blockedUserId]
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error('Erro ao verificar bloqueio:', error);
      throw error;
    }
  }

  async canReceiveMessage(userId: string, senderId: string): Promise<boolean> {
    try {
      // Verificar se o receptor bloqueou o remetente
      const isBlocked = await this.isUserBlocked(userId, senderId);
      return !isBlocked;
    } catch (error) {
      console.error('Erro ao verificar permissão de mensagem:', error);
      throw error;
    }
  }

  async getBlockedUsersCount(userId: string): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM blocked_users WHERE user_id = $1`,
        [userId]
      );

      return parseInt(result.rows[0]?.count || 0);
    } catch (error) {
      console.error('Erro ao contar usuários bloqueados:', error);
      throw error;
    }
  }
}

export default new BlockService();

