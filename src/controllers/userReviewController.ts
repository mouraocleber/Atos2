import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import userReviewService from '../services/userReviewService';
import { AppError } from '../middleware/errorHandler';

export class UserReviewController {
  /**
   * Criar uma avaliação de usuário
   * POST /api/users/reviews
   */
  async createReview(req: AuthenticatedRequest, res: Response) {
    try {
      const reviewerId = req.userId!;
      const { reviewedUserId, rating, comment, transactionId } = req.body;

      if (!reviewedUserId || !rating) {
        throw new AppError(400, 'Usuário avaliado e nota são obrigatórios', 'MISSING_REVIEW_DATA');
      }

      if (rating < 1 || rating > 5) {
        throw new AppError(400, 'Avaliação deve ser entre 1 e 5 estrelas', 'INVALID_RATING');
      }

      const review = await userReviewService.createReview(
        reviewerId,
        reviewedUserId,
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
   * Obter avaliações de um usuário
   * GET /api/users/reviews/user/:userId
   */
  async getUserReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { status, limit = 20, offset = 0 } = req.query;

      if (!userId) {
        throw new AppError(400, 'ID do usuário é obrigatório', 'MISSING_USER_ID');
      }

      const result = await userReviewService.getUserReviews(
        userId,
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
   * Obter avaliações feitas por um usuário
   * GET /api/users/reviews/made-by/:userId
   */
  async getReviewsByUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { status, limit = 20, offset = 0 } = req.query;

      if (!userId) {
        throw new AppError(400, 'ID do usuário é obrigatório', 'MISSING_USER_ID');
      }

      // Apenas o próprio usuário pode ver suas avaliações feitas
      if (userId !== req.userId) {
        throw new AppError(403, 'Acesso negado', 'FORBIDDEN');
      }

      const result = await userReviewService.getReviewsByUser(
        userId,
        status as any,
        parseInt(limit as string) || 20,
        parseInt(offset as string) || 0
      );

      res.json({
        success: true,
        message: `${result.reviews.length} avaliação(ões) feita(s)`,
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
   * Obter reputação de um usuário
   * GET /api/users/reviews/reputation/:userId
   */
  async getUserReputation(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        throw new AppError(400, 'ID do usuário é obrigatório', 'MISSING_USER_ID');
      }

      const reputation = await userReviewService.getUserReputation(userId);

      if (!reputation) {
        throw new AppError(404, 'Reputação não encontrada', 'REPUTATION_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Reputação obtida com sucesso',
        data: reputation,
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao obter reputação', 'INTERNAL_ERROR');
    }
  }

  /**
   * Atualizar uma avaliação
   * PUT /api/users/reviews/:reviewId
   */
  async updateReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { reviewId } = req.params;
      const { rating, comment } = req.body;

      if (!reviewId) {
        throw new AppError(400, 'ID da avaliação é obrigatório', 'MISSING_REVIEW_ID');
      }

      const review = await userReviewService.updateReview(reviewId, userId, { rating, comment });

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
   * Deletar (ocultar) uma avaliação
   * DELETE /api/users/reviews/:reviewId
   */
  async deleteReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { reviewId } = req.params;

      if (!reviewId) {
        throw new AppError(400, 'ID da avaliação é obrigatório', 'MISSING_REVIEW_ID');
      }

      const success = await userReviewService.deleteReview(reviewId, userId);

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
   * Reportar uma avaliação abusiva
   * POST /api/users/reviews/:reviewId/report
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

      const success = await userReviewService.reportReview(reviewId, reporterId, reason);

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
   * Verificar se já avaliou um usuário
   * GET /api/users/reviews/check/:reviewedUserId
   */
  async checkReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { reviewedUserId } = req.params;

      if (!reviewedUserId) {
        throw new AppError(400, 'ID do usuário avaliado é obrigatório', 'MISSING_REVIEWED_USER_ID');
      }

      if (reviewedUserId === userId) {
        return res.json({
          success: true,
          data: { hasReviewed: false, canReview: false }
        });
      }

      const hasReviewed = await userReviewService.hasUserReviewed(userId, reviewedUserId);

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
   * Obter top vendedores
   * GET /api/users/reviews/top-sellers
   */
  async getTopSellers(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit = 10 } = req.query;

      const topSellers = await userReviewService.getTopSellers(parseInt(limit as string) || 10);

      res.json({
        success: true,
        message: `${topSellers.length} vendedores encontrados`,
        data: {
          sellers: topSellers,
          count: topSellers.length,
        },
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao buscar top vendedores', 'INTERNAL_ERROR');
    }
  }
}

export default new UserReviewController();
