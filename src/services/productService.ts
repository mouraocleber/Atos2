import { query } from '../config/database';
import productReviewService from './productReviewService';

export interface Product {
  id: string;
  userId: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  imageUrl?: string;
  stock: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  createdAt: Date;
  updatedAt: Date;
  // Avaliações (opcionais)
  averageRating?: number;
  totalReviews?: number;
}

export class ProductService {
  // Criar produto
  async createProduct(
    userId: string,
    name: string,
    price: number,
    description?: string,
    category?: string,
    imageUrl?: string,
    stock?: number
  ): Promise<Product> {
    try {
      const result = await query(
        `INSERT INTO products (user_id, name, description, price, category, image_url, stock, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, user_id, name, description, price, category, image_url, stock, status, created_at, updated_at`,
        [userId, name, description || null, price, category || null, imageUrl || null, stock || 0, 'ACTIVE']
      );

      const product = result.rows[0];

      return {
        id: product.id,
        userId: product.user_id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        imageUrl: product.image_url,
        stock: product.stock,
        status: product.status,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      };
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  // Obter produtos do usuário
  async getUserProducts(userId: string, status?: string): Promise<Product[]> {
    try {
      let sql = `SELECT id, user_id, name, description, price, category, image_url, stock, status, created_at, updated_at
                 FROM products
                 WHERE user_id = $1`;
      const params: any[] = [userId];

      if (status) {
        sql += ` AND status = $2`;
        params.push(status);
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await query(sql, params);
      const products = result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        imageUrl: row.image_url,
        stock: row.stock,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      // Buscar avaliações de todos os produtos de uma vez (batch)
      if (products.length > 0) {
        const productIds = products.map(p => p.id);
        const statsResult = await query(
          `SELECT product_id, average_rating, total_reviews
           FROM product_stats
           WHERE product_id = ANY($1::uuid[])`,
          [productIds]
        );

        // Mapear stats por product_id
        const statsMap = new Map();
        statsResult.rows.forEach((row: any) => {
          statsMap.set(row.product_id, {
            averageRating: parseFloat(row.average_rating),
            totalReviews: parseInt(row.total_reviews)
          });
        });

        // Adicionar avaliações aos produtos
        products.forEach(product => {
          const stats = statsMap.get(product.id);
          if (stats) {
            product.averageRating = stats.averageRating;
            product.totalReviews = stats.totalReviews;
          }
        });
      }

      return products;
    } catch (error) {
      console.error('Erro ao obter produtos:', error);
      throw error;
    }
  }

  // Obter produto específico
  async getProductById(productId: string): Promise<Product | null> {
    try {
      const result = await query(
        `SELECT id, user_id, name, description, price, category, image_url, stock, status, created_at, updated_at
         FROM products
         WHERE id = $1`,
        [productId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      const product: Product = {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        imageUrl: row.image_url,
        stock: row.stock,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // Buscar estatísticas de avaliações
      try {
        const statsResult = await query(
          `SELECT average_rating, total_reviews
           FROM product_stats
           WHERE product_id = $1`,
          [productId]
        );
        if (statsResult.rows.length > 0) {
          product.averageRating = parseFloat(statsResult.rows[0].average_rating);
          product.totalReviews = parseInt(statsResult.rows[0].total_reviews);
        }
      } catch (error) {
        // Ignora erro de stats, produto ainda funciona sem avaliações
        console.error('Erro ao buscar stats do produto:', error);
      }

      return product;
    } catch (error) {
      console.error('Erro ao obter produto:', error);
      throw error;
    }
  }

  // Atualizar produto
  async updateProduct(
    productId: string,
    userId: string,
    updates: Partial<Product>
  ): Promise<Product | null> {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Construir query dinâmica
      if (updates.name !== undefined) {
        fields.push(`name = $${paramCount++}`);
        values.push(updates.name);
      }
      if (updates.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.price !== undefined) {
        fields.push(`price = $${paramCount++}`);
        values.push(updates.price);
      }
      if (updates.category !== undefined) {
        fields.push(`category = $${paramCount++}`);
        values.push(updates.category);
      }
      if (updates.imageUrl !== undefined) {
        fields.push(`image_url = $${paramCount++}`);
        values.push(updates.imageUrl);
      }
      if (updates.stock !== undefined) {
        fields.push(`stock = $${paramCount++}`);
        values.push(updates.stock);
      }
      if (updates.status !== undefined) {
        fields.push(`status = $${paramCount++}`);
        values.push(updates.status);
      }

      if (fields.length === 0) {
        return this.getProductById(productId);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(productId, userId);

      const result = await query(
        `UPDATE products 
         SET ${fields.join(', ')}
         WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
         RETURNING id, user_id, name, description, price, category, image_url, stock, status, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        imageUrl: row.image_url,
        stock: row.stock,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  // Deletar produto
  async deleteProduct(productId: string, userId: string): Promise<boolean> {
    try {
      const result = await query(
        `DELETE FROM products WHERE id = $1 AND user_id = $2`,
        [productId, userId]
      );

      return result.rowCount! > 0;
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  }

  // Buscar produtos por categoria
  async getProductsByCategory(userId: string, category: string): Promise<Product[]> {
    try {
      const result = await query(
        `SELECT id, user_id, name, description, price, category, image_url, stock, status, created_at, updated_at
         FROM products 
         WHERE user_id = $1 AND category = $2 AND status = 'ACTIVE'
         ORDER BY created_at DESC`,
        [userId, category]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        imageUrl: row.image_url,
        stock: row.stock,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      console.error('Erro ao buscar produtos por categoria:', error);
      throw error;
    }
  }

  // Obter estatísticas de produtos
  async getProductStatistics(userId: string): Promise<any> {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive,
          SUM(stock) as total_stock,
          AVG(price) as average_price,
          MIN(price) as min_price,
          MAX(price) as max_price
         FROM products 
         WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  // Obter categorias do usuário
  async getUserCategories(userId: string): Promise<string[]> {
    try {
      const result = await query(
        `SELECT DISTINCT category
         FROM products
         WHERE user_id = $1 AND category IS NOT NULL
         ORDER BY category`,
        [userId]
      );

      return result.rows.map((row: any) => row.category);
    } catch (error) {
      console.error('Erro ao obter categorias:', error);
      throw error;
    }
  }

  /**
   * Obter estatísticas de avaliações de um produto
   * Delega para ProductReviewService
   */
  async getProductReviewStats(productId: string): Promise<any> {
    return productReviewService.getProductStats(productId);
  }
}

export default new ProductService();

