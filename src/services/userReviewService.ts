import { query } from '../config/database';
import { UserReview, UserReputation, ReviewStatus } from '../types';

export class UserReviewService {
  /**
   * Criar uma avaliação de usuário
   * @throws Se já existir avaliação do mesmo reviewer para o mesmo user
   */
  async createReview(
    reviewerId: string,
    reviewedUserId: string,
    rating: number,
    comment?: string,
    transactionId?: string
  ): Promise<UserReview> {
    // Validações
    if (reviewerId === reviewedUserId) {
      throw new Error('Não é possível avaliar a si mesmo');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Avaliação deve ser entre 1 e 5 estrelas');
    }

    // Verificar se já avaliou
    const existing = await this.hasUserReviewed(reviewerId, reviewedUserId);
    if (existing) {
      throw new Error('Você já avaliou este usuário');
    }

    // Verificar se usuário avaliado existe e está ativo
    const userCheck = await query(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [reviewedUserId]
    );
    if (userCheck.rows.length === 0) {
      throw new Error('Usuário não encontrado ou inativo');
    }

    try {
      const result = await query(
        `INSERT INTO user_reviews (reviewer_id, reviewed_user_id, rating, comment, transaction_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, reviewer_id, reviewed_user_id, rating, comment, is_verified, transaction_id, status, created_at, updated_at`,
        [reviewerId, reviewedUserId, rating, comment || null, transactionId || null, 'ACTIVE']
      );

      const row = result.rows[0];
      return this.mapRowToReview(row);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error('Você já avaliou este usuário');
      }
      console.error('Erro ao criar avaliação:', error);
      throw error;
    }
  }

  /**
   * Obter todas as avaliações de um usuário
   */
  async getUserReviews(
    userId: string,
    status?: ReviewStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reviews: UserReview[]; total: number }> {
    let sql = `
      SELECT id, reviewer_id, reviewed_user_id, rating, comment,
             is_verified, transaction_id, status, created_at, updated_at
      FROM user_reviews
      WHERE reviewed_user_id = $1
    `;
    const params: any[] = [userId];

    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    const reviews = result.rows.map(row => this.mapRowToReview(row));

    // Contar total
    const countSql = status
      ? 'SELECT COUNT(*) as count FROM user_reviews WHERE reviewed_user_id = $1 AND status = $2'
      : 'SELECT COUNT(*) as count FROM user_reviews WHERE reviewed_user_id = $1';
    const countParams = status ? [userId, status] : [userId];
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    return { reviews, total };
  }

  /**
   * Obter avaliações feitas por um usuário (como reviewer)
   */
  async getReviewsByUser(
    reviewerId: string,
    status?: ReviewStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reviews: UserReview[]; total: number }> {
    let sql = `
      SELECT id, reviewer_id, reviewed_user_id, rating, comment,
             is_verified, transaction_id, status, created_at, updated_at
      FROM user_reviews
      WHERE reviewer_id = $1
    `;
    const params: any[] = [reviewerId];

    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const reviews = result.rows.map(row => this.mapRowToReview(row));

    const countSql = status
      ? 'SELECT COUNT(*) as count FROM user_reviews WHERE reviewer_id = $1 AND status = $2'
      : 'SELECT COUNT(*) as count FROM user_reviews WHERE reviewer_id = $1';
    const countParams = status ? [reviewerId, status] : [reviewerId];
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    return { reviews, total };
  }

  /**
   * Obter reputação de um usuário
   */
  async getUserReputation(userId: string): Promise<UserReputation | null> {
    const result = await query(
      `SELECT user_id, total_reviews, average_rating, five_star_count,
              four_plus_count, last_review_at
       FROM user_reputation
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      totalReviews: parseInt(row.total_reviews || '0'),
      averageRating: parseFloat(row.average_rating || '0'),
      fiveStarCount: parseInt(row.five_star_count || '0'),
      fourPlusCount: parseInt(row.four_plus_count || '0'),
      lastReviewAt: row.last_review_at,
      ratingLevel: this.calculateRatingLevel(parseFloat(row.average_rating || '0'))
    };
  }

  /**
   * Atualizar uma avaliação
   */
  async updateReview(
    reviewId: string,
    userId: string,
    updates: { rating?: number; comment?: string }
  ): Promise<UserReview | null> {
    // Verificar se é o autor
    const checkResult = await query(
      'SELECT reviewer_id FROM user_reviews WHERE id = $1',
      [reviewId]
    );
    if (checkResult.rows.length === 0) {
      return null;
    }
    if (checkResult.rows[0].reviewer_id !== userId) {
      throw new Error('Apenas o autor pode editar a avaliação');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.rating !== undefined) {
      if (updates.rating < 1 || updates.rating > 5) {
        throw new Error('Avaliação deve ser entre 1 e 5');
      }
      fields.push(`rating = $${paramIndex++}`);
      values.push(updates.rating);
    }
    if (updates.comment !== undefined) {
      fields.push(`comment = $${paramIndex++}`);
      values.push(updates.comment);
    }

    if (fields.length === 0) {
      return this.getReviewById(reviewId);
    }

    values.push(reviewId);
    const result = await query(
      `UPDATE user_reviews SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, reviewer_id, reviewed_user_id, rating, comment, is_verified, transaction_id, status, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReview(result.rows[0]);
  }

  /**
   * Deletar (soft delete) uma avaliação
   */
  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    // Verificar se é o autor OU o dono da avaliação (reviewed user)
    const checkResult = await query(
      'SELECT reviewer_id, reviewed_user_id FROM user_reviews WHERE id = $1',
      [reviewId]
    );

    if (checkResult.rows.length === 0) {
      return false;
    }

    const review = checkResult.rows[0];
    if (review.reviewer_id !== userId && review.reviewed_user_id !== userId) {
      throw new Error('Apenas o autor ou o avaliado pode remover esta avaliação');
    }

    // Soft delete: marcar como HIDDEN
    const result = await query(
      "UPDATE user_reviews SET status = 'HIDDEN' WHERE id = $1",
      [reviewId]
    );

    return result.rowCount! > 0;
  }

  /**
   * Reportar uma avaliação abusiva
   */
  async reportReview(reviewId: string, reporterId: string, reason: string): Promise<boolean> {
    // Verificar se avaliação existe
    const checkResult = await query(
      'SELECT id, status FROM user_reviews WHERE id = $1',
      [reviewId]
    );
    if (checkResult.rows.length === 0) {
      throw new Error('Avaliação não encontrada');
    }

    // Registrar report (poderia ser em tabela reports existente ou nova)
    try {
      await query(
        "UPDATE user_reviews SET status = 'REPORTED' WHERE id = $1",
        [reviewId]
      );
      return true;
    } catch (error) {
      console.error('Erro ao reportar avaliação:', error);
      return false;
    }
  }

  /**
   * Verificar se um usuário já avaliou outro
   */
  async hasUserReviewed(reviewerId: string, reviewedUserId: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM user_reviews
       WHERE reviewer_id = $1 AND reviewed_user_id = $2 AND status = 'ACTIVE'`,
      [reviewerId, reviewedUserId]
    );
    return result.rows.length > 0;
  }

  /**
   * Obter top vendedores por reputação
   */
  async getTopSellers(limit: number = 10): Promise<any[]> {
    const result = await query(
      `SELECT u.id, u.nickname, u.name, u.profile_image, u.city, u.state,
              COALESCE(r.average_rating, 0) as average_rating,
              COALESCE(r.total_reviews, 0) as total_reviews,
              r.rating_level
       FROM user_reputation r
       JOIN users u ON r.user_id = u.id
       WHERE u.is_active = true AND r.total_reviews >= 3
       ORDER BY r.average_rating DESC, r.total_reviews DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      nickname: row.nickname,
      name: row.name,
      profileImage: row.profile_image,
      city: row.city,
      state: row.state,
      averageRating: parseFloat(row.average_rating),
      totalReviews: parseInt(row.total_reviews),
      ratingLevel: row.rating_level
    }));
  }

  /**
   * Calcular nível de reputação baseado na média
   */
  private calculateRatingLevel(averageRating: number): string {
    if (averageRating >= 4.8) return 'LENDÁRIO';
    if (averageRating >= 4.5) return 'EXCELENTE';
    if (averageRating >= 4.0) return 'CONFIÁVEL';
    if (averageRating >= 3.5) return 'INICIANTE';
    return 'NOVO';
  }

  /**
   * Mapear row do banco para interface UserReview
   */
  private mapRowToReview(row: any): UserReview {
    return {
      id: row.id,
      reviewerId: row.reviewer_id,
      reviewedUserId: row.reviewed_user_id,
      rating: parseInt(row.rating),
      comment: row.comment,
      isVerified: row.is_verified,
      transactionId: row.transaction_id,
      status: row.status as ReviewStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Obter uma avaliação específica por ID
   */
  async getReviewById(reviewId: string): Promise<UserReview | null> {
    const result = await query(
      `SELECT id, reviewer_id, reviewed_user_id, rating, comment,
              is_verified, transaction_id, status, created_at, updated_at
       FROM user_reviews WHERE id = $1`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReview(result.rows[0]);
  }
}

export default new UserReviewService();
