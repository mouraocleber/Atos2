import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import productReviewService from '../services/productReviewService';
import { AppError } from '../middleware/errorHandler';

export class ProductReviewController {
  /**
   * Criar uma avaliação de produto
   * POST /api/products/reviews
   */
  async createReview(req: AuthenticatedRequest, res: Response) {
    try {
      const reviewerId = req.userId!;
      const { productId, rating, comment, transactionId } = req.body;

      if (!productId || !rating) {
        throw new AppError(400, 'Produto e nota são obrigatórios', 'MISSING_REVIEW_DATA');
      }

      if (rating < 1 || rating > 5) {
        throw new AppError(400, 'Avaliação deve ser entre 1 e 5 estrelas', 'INVALID_RATING');
      }

      const review = await productReviewService.createReview(
        reviewerId,
        productId,
        rating,
        comment,
        transactionId
      );

      res.json({
        success: true,
        message: 'Avaliação criada com sucesso',
        data: review,
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao criar avaliação', 'INTERNAL_ERROR');
    }
  }

  /**
   * Obter avaliações de um produto
   * GET /api/products/reviews/:productId
   */
  async getProductReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const { productId } = req.params;
      const { status, limit = 20, offset = 0 } = req.query;

      if (!productId) {
        throw new AppError(400, 'ID do produto é obrigatório', 'MISSING_PRODUCT_ID');
      }

      const result = await productReviewService.getProductReviews(
        productId,
        status as any,
        parseInt(limit as string) || 20,
        parseInt(offset as string) || 0
      );

      res.json({
        success: true,
        message: `${result.reviews.length} avaliação(ões) encontrada(s)`,
        data: {
          reviews: result.reviews,
          total: result.total,
        },
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao buscar avaliações', 'INTERNAL_ERROR');
    }
  }

  /**
   * Obter estatísticas de avaliações de um produto
   * GET /api/products/reviews/stats/:productId
   */
  async getProductStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { productId } = req.params;

      if (!productId) {
        throw new AppError(400, 'ID do produto é obrigatório', 'MISSING_PRODUCT_ID');
      }

      const stats = await productReviewService.getProductStats(productId);

      if (!stats) {
        throw new AppError(404, 'Estatísticas não encontradas', 'STATS_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats,
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao obter estatísticas', 'INTERNAL_ERROR');
    }
  }

  /**
   * Atualizar uma avaliação de produto
   * PUT /api/products/reviews/:reviewId
   */
  async updateReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { reviewId } = req.params;
      const { rating, comment } = req.body;

      if (!reviewId) {
        throw new AppError(400, 'ID da avaliação é obrigatório', 'MISSING_REVIEW_ID');
      }

      const review = await productReviewService.updateReview(reviewId, userId, { rating, comment });

      if (!review) {
        throw new AppError(404, 'Avaliação não encontrada ou sem permissão', 'REVIEW_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Avaliação atualizada com sucesso',
        data: review,
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao atualizar avaliação', 'INTERNAL_ERROR');
    }
  }

  /**
   * Deletar (ocultar) uma avaliação de produto
   * DELETE /api/products/reviews/:reviewId
   */
  async deleteReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { reviewId } = req.params;

      if (!reviewId) {
        throw new AppError(400, 'ID da avaliação é obrigatório', 'MISSING_REVIEW_ID');
      }

      const success = await productReviewService.deleteReview(reviewId, userId);

      if (!success) {
        throw new AppError(404, 'Avaliação não encontrada ou sem permissão', 'REVIEW_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Avaliação removida com sucesso',
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao remover avaliação', 'INTERNAL_ERROR');
    }
  }

  /**
   * Reportar uma avaliação de produto abusiva
   * POST /api/products/reviews/:reviewId/report
   */
  async reportReview(req: AuthenticatedRequest, res: Response) {
    try {
      const reporterId = req.userId!;
      const { reviewId } = req.params;
      const { reason, description } = req.body;

      if (!reviewId) {
        throw new AppError(400, 'ID da avaliação é obrigatório', 'MISSING_REVIEW_ID');
      }

      if (!reason) {
        throw new AppError(400, 'Motivo do reporte é obrigatório', 'MISSING_REPORT_REASON');
      }

      const success = await productReviewService.reportReview(reviewId, reporterId, reason);

      if (!success) {
        throw new AppError(404, 'Avaliação não encontrada', 'REVIEW_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Avaliação reportada com sucesso. Será analisada pela moderação.',
        data: { reason, description },
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao reportar avaliação', 'INTERNAL_ERROR');
    }
  }

  /**
   * Verificar se já avaliou um produto
   * GET /api/products/reviews/check/:productId
   */
  async checkReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { productId } = req.params;

      if (!productId) {
        throw new AppError(400, 'ID do produto é obrigatório', 'MISSING_PRODUCT_ID');
      }

      const hasReviewed = await productReviewService.hasUserReviewedProduct(userId, productId);

      res.json({
        success: true,
        data: {
          hasReviewed,
          canReview: !hasReviewed
        },
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao verificar avaliação', 'INTERNAL_ERROR');
    }
  }

  /**
   * Obter produtos mais bem avaliados
   * GET /api/products/reviews/top-rated
   */
  async getTopRatedProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit = 10 } = req.query;

      const topProducts = await productReviewService.getTopRatedProducts(
        parseInt(limit as string) || 10
      );

      res.json({
        success: true,
        message: `${topProducts.length} produtos encontrados`,
        data: {
          products: topProducts,
          count: topProducts.length,
        },
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao buscar produtos', 'INTERNAL_ERROR');
    }
  }
}

export default new ProductReviewController();
