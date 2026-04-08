import { query } from '../config/database';
import { ProductReview, ProductStats, ReviewStatus } from '../types';

export class ProductReviewService {
  /**
   * Criar uma avaliação de produto
   * @throws Se já existir avaliação do mesmo user para o produto
   */
  async createReview(
    reviewerId: string,
    productId: string,
    rating: number,
    comment?: string,
    transactionId?: string
  ): Promise<ProductReview> {
    // Validações
    if (rating < 1 || rating > 5) {
      throw new Error('Avaliação deve ser entre 1 e 5 estrelas');
    }

    // Verificar se produto existe
    const productCheck = await query(
      'SELECT id FROM products WHERE id = $1',
      [productId]
    );
    if (productCheck.rows.length === 0) {
      throw new Error('Produto não encontrado');
    }

    // Verificar se já avaliou
    const existing = await this.hasUserReviewedProduct(reviewerId, productId);
    if (existing) {
      throw new Error('Você já avaliou este produto');
    }

    try {
      const result = await query(
        `INSERT INTO product_reviews (reviewer_id, product_id, rating, comment, transaction_id, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, reviewer_id, product_id, rating, comment, is_verified, transaction_id, status, created_at, updated_at`,
        [reviewerId, productId, rating, comment || null, transactionId || null, 'ACTIVE']
      );

      const row = result.rows[0];
      return this.mapRowToReview(row);
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error('Você já avaliou este produto');
      }
      console.error('Erro ao criar avaliação de produto:', error);
      throw error;
    }
  }

  /**
   * Obter todas as avaliações de um produto
   */
  async getProductReviews(
    productId: string,
    status?: ReviewStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    let sql = `
      SELECT id, reviewer_id, product_id, rating, comment,
             is_verified, transaction_id, status, created_at, updated_at
      FROM product_reviews
      WHERE product_id = $1
    `;
    const params: any[] = [productId];

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
      ? 'SELECT COUNT(*) as count FROM product_reviews WHERE product_id = $1 AND status = $2'
      : 'SELECT COUNT(*) as count FROM product_reviews WHERE product_id = $1';
    const countParams = status ? [productId, status] : [productId];
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    return { reviews, total };
  }

  /**
   * Obter avaliações feitas por um usuário em produtos
   */
  async getReviewsByUser(
    reviewerId: string,
    status?: ReviewStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    let sql = `
      SELECT id, reviewer_id, product_id, rating, comment,
             is_verified, transaction_id, status, created_at, updated_at
      FROM product_reviews
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
      ? 'SELECT COUNT(*) as count FROM product_reviews WHERE reviewer_id = $1 AND status = $2'
      : 'SELECT COUNT(*) as count FROM product_reviews WHERE reviewer_id = $1';
    const countParams = status ? [reviewerId, status] : [reviewerId];
    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0]?.count || '0');

    return { reviews, total };
  }

  /**
   * Obter estatísticas de avaliações de um produto (via view)
   */
  async getProductStats(productId: string): Promise<ProductStats | null> {
    const result = await query(
      `SELECT product_id, total_reviews, average_rating, five_star_count,
              four_plus_count, last_review_at
       FROM product_stats
       WHERE product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      productId: row.product_id,
      totalReviews: parseInt(row.total_reviews || '0'),
      averageRating: parseFloat(row.average_rating || '0'),
      fiveStarCount: parseInt(row.five_star_count || '0'),
      fourPlusCount: parseInt(row.four_plus_count || '0'),
      lastReviewAt: row.last_review_at
    };
  }

  /**
   * Atualizar uma avaliação de produto
   */
  async updateReview(
    reviewId: string,
    userId: string,
    updates: { rating?: number; comment?: string }
  ): Promise<ProductReview | null> {
    // Verificar se é o autor
    const checkResult = await query(
      'SELECT reviewer_id FROM product_reviews WHERE id = $1',
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
      `UPDATE product_reviews SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, reviewer_id, product_id, rating, comment, is_verified, transaction_id, status, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReview(result.rows[0]);
  }

  /**
   * Deletar (soft delete) uma avaliação de produto
   */
  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    const checkResult = await query(
      'SELECT reviewer_id, product_id FROM product_reviews WHERE id = $1',
      [reviewId]
    );

    if (checkResult.rows.length === 0) {
      return false;
    }

    const review = checkResult.rows[0];
    if (review.reviewer_id !== userId) {
      throw new Error('Apenas o autor pode remover esta avaliação');
    }

    const result = await query(
      "UPDATE product_reviews SET status = 'HIDDEN' WHERE id = $1",
      [reviewId]
    );

    return result.rowCount! > 0;
  }

  /**
   * Reportar uma avaliação de produto abusiva
   */
  async reportReview(reviewId: string, reporterId: string, reason: string): Promise<boolean> {
    const checkResult = await query(
      'SELECT id, status FROM product_reviews WHERE id = $1',
      [reviewId]
    );
    if (checkResult.rows.length === 0) {
      throw new Error('Avaliação não encontrada');
    }

    try {
      await query(
        "UPDATE product_reviews SET status = 'REPORTED' WHERE id = $1",
        [reviewId]
      );
      return true;
    } catch (error) {
      console.error('Erro ao reportar avaliação:', error);
      return false;
    }
  }

  /**
   * Verificar se usuário já avaliou um produto
   */
  async hasUserReviewedProduct(reviewerId: string, productId: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM product_reviews
       WHERE reviewer_id = $1 AND product_id = $2 AND status = 'ACTIVE'`,
      [reviewerId, productId]
    );
    return result.rows.length > 0;
  }

  /**
   * Obter produtos mais bem avaliados
   */
  async getTopRatedProducts(limit: number = 10): Promise<any[]> {
    const result = await query(
      `SELECT p.id, p.name, p.image, p.price,
              COALESCE(s.average_rating, 0) as average_rating,
              COALESCE(s.total_reviews, 0) as total_reviews
       FROM product_stats s
       JOIN products p ON s.product_id = p.id
       WHERE p.status = 'ACTIVE' AND s.total_reviews >= 3
       ORDER BY s.average_rating DESC, s.total_reviews DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      image: row.image,
      price: parseFloat(row.price),
      averageRating: parseFloat(row.average_rating),
      totalReviews: parseInt(row.total_reviews)
    }));
  }

  /**
   * Mapear row do banco para interface ProductReview
   */
  private mapRowToReview(row: any): ProductReview {
    return {
      id: row.id,
      reviewerId: row.reviewer_id,
      productId: row.product_id,
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
  async getReviewById(reviewId: string): Promise<ProductReview | null> {
    const result = await query(
      `SELECT id, reviewer_id, product_id, rating, comment,
              is_verified, transaction_id, status, created_at, updated_at
       FROM product_reviews WHERE id = $1`,
      [reviewId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReview(result.rows[0]);
  }
}

export default new ProductReviewService();
