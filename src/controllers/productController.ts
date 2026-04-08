import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import productService from '../services/productService';
import productReviewService from '../services/productReviewService';
import { AppError } from '../middleware/errorHandler';

export class ProductController {
  async createProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { name, price, description, category, imageUrl, stock } = req.body;

      if (!name || !price) {
        throw new AppError(400, 'Nome e preço são obrigatórios', 'MISSING_PRODUCT_DATA');
      }

      if (price < 0) {
        throw new AppError(400, 'Preço não pode ser negativo', 'INVALID_PRICE');
      }

      const product = await productService.createProduct(
        userId,
        name,
        price,
        description,
        category,
        imageUrl,
        stock
      );

      res.json({
        success: true,
        message: 'Produto criado com sucesso',
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { status } = req.query;

      const products = await productService.getUserProducts(userId, status as string);

      res.json({
        success: true,
        message: 'Produtos do usuário',
        data: {
          products,
          count: products.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getProductById(req: AuthenticatedRequest, res: Response) {
    try {
      const { productId } = req.params;

      if (!productId) {
        throw new AppError(400, 'ID do produto é obrigatório', 'MISSING_PRODUCT_ID');
      }

      const product = await productService.getProductById(productId);

      if (!product) {
        throw new AppError(404, 'Produto não encontrado', 'PRODUCT_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Produto encontrado',
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { productId } = req.params;
      const updates = req.body;

      if (!productId) {
        throw new AppError(400, 'ID do produto é obrigatório', 'MISSING_PRODUCT_ID');
      }

      // Validar preço se fornecido
      if (updates.price !== undefined && updates.price < 0) {
        throw new AppError(400, 'Preço não pode ser negativo', 'INVALID_PRICE');
      }

      const product = await productService.updateProduct(productId, userId, updates);

      if (!product) {
        throw new AppError(404, 'Produto não encontrado ou acesso negado', 'PRODUCT_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }

  async deleteProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { productId } = req.params;

      if (!productId) {
        throw new AppError(400, 'ID do produto é obrigatório', 'MISSING_PRODUCT_ID');
      }

      const success = await productService.deleteProduct(productId, userId);

      if (!success) {
        throw new AppError(404, 'Produto não encontrado ou acesso negado', 'PRODUCT_NOT_FOUND');
      }

      res.json({
        success: true,
        message: 'Produto deletado com sucesso',
      });
    } catch (error) {
      throw error;
    }
  }

  async getProductsByCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      const { category } = req.params;

      if (!category) {
        throw new AppError(400, 'Categoria é obrigatória', 'MISSING_CATEGORY');
      }

      const products = await productService.getProductsByCategory(userId, category);

      res.json({
        success: true,
        message: 'Produtos por categoria',
        data: {
          products,
          count: products.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getProductStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const statistics = await productService.getProductStatistics(userId);

      res.json({
        success: true,
        message: 'Estatísticas de produtos',
        data: statistics,
      });
    } catch (error) {
      throw error;
    }
  }

  async getUserCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;

      const categories = await productService.getUserCategories(userId);

      res.json({
        success: true,
        message: 'Categorias de produtos',
        data: {
          categories,
          count: categories.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obter estatísticas de avaliações de um produto
   * GET /api/products/:productId/review-stats
   */
  async getProductReviewStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { productId } = req.params;

      if (!productId) {
        throw new AppError(400, 'ID do produto é obrigatório', 'MISSING_PRODUCT_ID');
      }

      // Verificar se produto existe e pertence ao usuário (opcional, pode ser público)
      const product = await productService.getProductById(productId);
      if (!product) {
        throw new AppError(404, 'Produto não encontrado', 'PRODUCT_NOT_FOUND');
      }

      const stats = await productReviewService.getProductStats(productId);

      if (!stats) {
        return res.json({
          success: true,
          message: 'Sem avaliações ainda',
          data: {
            totalReviews: 0,
            averageRating: 0,
            fiveStarCount: 0,
            fourPlusCount: 0,
          },
        });
      }

      res.json({
        success: true,
        message: 'Estatísticas de avaliações',
        data: stats,
      });
    } catch (error: any) {
      throw error instanceof AppError ? error : new AppError(500, 'Erro ao obter estatísticas', 'INTERNAL_ERROR');
    }
  }
}

export default new ProductController();

