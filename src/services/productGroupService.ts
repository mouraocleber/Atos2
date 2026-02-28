import { query, getClient } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface ProductGroup {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  position: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: string;
  user_id: string;
  group_id?: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  unit: string;
  image?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class ProductGroupService {
  /**
   * Criar novo grupo de produtos
   */
  async createGroup(userId: string, data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }): Promise<ProductGroup> {
    const id = uuidv4();

    const result = await query(
      `INSERT INTO product_groups 
       (id, user_id, name, description, icon, color, position, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 0, true)
       RETURNING *`,
      [id, userId, data.name, data.description, data.icon, data.color]
    );

    return result.rows[0];
  }

  /**
   * Obter todos os grupos do usuário
   */
  async getGroupsByUser(userId: string, includeInactive = false): Promise<ProductGroup[]> {
    const whereClause = includeInactive ? '' : 'AND is_active = true';

    const result = await query(
      `SELECT * FROM product_groups 
       WHERE user_id = $1 ${whereClause}
       ORDER BY position ASC, created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Obter grupo específico
   */
  async getGroup(groupId: string, userId: string): Promise<ProductGroup | null> {
    const result = await query(
      `SELECT * FROM product_groups 
       WHERE id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Atualizar grupo
   */
  async updateGroup(groupId: string, userId: string, data: Partial<ProductGroup>): Promise<ProductGroup> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.icon !== undefined) {
      fields.push(`icon = $${paramCount++}`);
      values.push(data.icon);
    }
    if (data.color !== undefined) {
      fields.push(`color = $${paramCount++}`);
      values.push(data.color);
    }
    if (data.position !== undefined) {
      fields.push(`position = $${paramCount++}`);
      values.push(data.position);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(groupId, userId);

    const result = await query(
      `UPDATE product_groups 
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Grupo não encontrado');
    }

    return result.rows[0];
  }

  /**
   * Deletar grupo
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const result = await query(
      `DELETE FROM product_groups 
       WHERE id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Grupo não encontrado');
    }
  }

  /**
   * Criar produto em um grupo
   */
  async createProduct(userId: string, data: {
    group_id?: string;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    unit?: string;
    image?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  }): Promise<Product> {
    const id = uuidv4();

    const result = await query(
      `INSERT INTO products 
       (id, user_id, group_id, name, description, price, quantity, unit, image, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       RETURNING *`,
      [
        id,
        userId,
        data.group_id,
        data.name,
        data.description,
        data.price,
        data.quantity,
        data.unit || 'un',
        data.image,
        data.status || 'ACTIVE'
      ]
    );

    return result.rows[0];
  }

  /**
   * Obter produtos de um grupo
   */
  async getProductsByGroup(groupId: string, userId: string, includeInactive = false): Promise<Product[]> {
    const whereClause = includeInactive ? '' : 'AND is_active = true';

    const result = await query(
      `SELECT * FROM products 
       WHERE group_id = $1 AND user_id = $2 ${whereClause}
       ORDER BY created_at DESC`,
      [groupId, userId]
    );

    return result.rows;
  }

  /**
   * Obter todos os produtos do usuário
   */
  async getProductsByUser(userId: string, includeInactive = false): Promise<Product[]> {
    const whereClause = includeInactive ? '' : 'AND is_active = true';

    const result = await query(
      `SELECT * FROM products 
       WHERE user_id = $1 ${whereClause}
       ORDER BY group_id, created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Obter produto específico
   */
  async getProduct(productId: string, userId: string): Promise<Product | null> {
    const result = await query(
      `SELECT * FROM products 
       WHERE id = $1 AND user_id = $2`,
      [productId, userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Atualizar produto
   */
  async updateProduct(productId: string, userId: string, data: Partial<Product>): Promise<Product> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.group_id !== undefined) {
      fields.push(`group_id = $${paramCount++}`);
      values.push(data.group_id);
    }
    if (data.name) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${paramCount++}`);
      values.push(data.price);
    }
    if (data.quantity !== undefined) {
      fields.push(`quantity = $${paramCount++}`);
      values.push(data.quantity);
    }
    if (data.unit) {
      fields.push(`unit = $${paramCount++}`);
      values.push(data.unit);
    }
    if (data.image !== undefined) {
      fields.push(`image = $${paramCount++}`);
      values.push(data.image);
    }
    if (data.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.is_active !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(productId, userId);

    const result = await query(
      `UPDATE products 
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Produto não encontrado');
    }

    return result.rows[0];
  }

  /**
   * Deletar produto
   */
  async deleteProduct(productId: string, userId: string): Promise<void> {
    const result = await query(
      `DELETE FROM products 
       WHERE id = $1 AND user_id = $2`,
      [productId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Produto não encontrado');
    }
  }

  /**
   * Obter produtos ativos para venda
   */
  async getActiveProducts(userId: string): Promise<Product[]> {
    const result = await query(
      `SELECT * FROM products 
       WHERE user_id = $1 AND is_active = true AND status = 'ACTIVE'
       ORDER BY group_id, created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Obter grupos com produtos
   */
  async getGroupsWithProducts(userId: string): Promise<any[]> {
    const result = await query(
      `SELECT 
        g.id,
        g.name,
        g.description,
        g.icon,
        g.color,
        g.position,
        g.is_active,
        g.created_at,
        g.updated_at,
        COUNT(p.id) as product_count,
        COUNT(CASE WHEN p.is_active = true AND p.status = 'ACTIVE' THEN 1 END) as active_product_count
       FROM product_groups g
       LEFT JOIN products p ON g.id = p.group_id
       WHERE g.user_id = $1 AND g.is_active = true
       GROUP BY g.id
       ORDER BY g.position ASC, g.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Reordenar grupos
   */
  async reorderGroups(userId: string, groupOrder: Array<{ id: string; position: number }>): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      for (const item of groupOrder) {
        await client.query(
          `UPDATE product_groups 
           SET position = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND user_id = $3`,
          [item.position, item.id, userId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obter estatísticas de produtos
   */
  async getProductStatistics(userId: string): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as available_for_sale,
        COUNT(DISTINCT group_id) as total_groups,
        SUM(CASE WHEN is_active = true THEN quantity ELSE 0 END) as total_quantity,
        AVG(price) as average_price,
        MIN(price) as min_price,
        MAX(price) as max_price
       FROM products 
       WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }
}

