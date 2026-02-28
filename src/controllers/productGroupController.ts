import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProductGroupService } from '../services/productGroupService';

const service = new ProductGroupService();

export class ProductGroupController {
  /**
   * Criar novo grupo
   */
  async createGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { name, description, icon, color } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
      }

      const group = await service.createGroup(userId, {
        name,
        description,
        icon,
        color
      });

      res.status(201).json({
        success: true,
        message: 'Grupo criado com sucesso',
        data: group
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter grupos do usuário
   */
  async getGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const includeInactive = req.query.includeInactive === 'true';
      const groups = await service.getGroupsByUser(userId, includeInactive);

      res.json({
        success: true,
        data: groups
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter grupos com produtos
   */
  async getGroupsWithProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const groups = await service.getGroupsWithProducts(userId);

      res.json({
        success: true,
        data: groups
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualizar grupo
   */
  async updateGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { groupId } = req.params;
      const data = req.body;

      const group = await service.updateGroup(groupId, userId, data);

      res.json({
        success: true,
        message: 'Grupo atualizado com sucesso',
        data: group
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Deletar grupo
   */
  async deleteGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { groupId } = req.params;

      await service.deleteGroup(groupId, userId);

      res.json({
        success: true,
        message: 'Grupo deletado com sucesso'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Reordenar grupos
   */
  async reorderGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { groupOrder } = req.body;

      if (!Array.isArray(groupOrder)) {
        return res.status(400).json({ error: 'groupOrder deve ser um array' });
      }

      await service.reorderGroups(userId, groupOrder);

      res.json({
        success: true,
        message: 'Grupos reordenados com sucesso'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Criar produto
   */
  async createProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { group_id, name, description, price, quantity, unit, image, status } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
      }

      const product = await service.createProduct(userId, {
        group_id,
        name,
        description,
        price,
        quantity: quantity || 0,
        unit,
        image,
        status
      });

      res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
        data: product
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter produtos de um grupo
   */
  async getProductsByGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { groupId } = req.params;
      const includeInactive = req.query.includeInactive === 'true';

      const products = await service.getProductsByGroup(groupId, userId, includeInactive);

      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter todos os produtos do usuário
   */
  async getProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const includeInactive = req.query.includeInactive === 'true';
      const products = await service.getProductsByUser(userId, includeInactive);

      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter produtos ativos para venda
   */
  async getActiveProducts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const products = await service.getActiveProducts(userId);

      res.json({
        success: true,
        data: products
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Atualizar produto
   */
  async updateProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { productId } = req.params;
      const data = req.body;

      const product = await service.updateProduct(productId, userId, data);

      res.json({
        success: true,
        message: 'Produto atualizado com sucesso',
        data: product
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Deletar produto
   */
  async deleteProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const { productId } = req.params;

      await service.deleteProduct(productId, userId);

      res.json({
        success: true,
        message: 'Produto deletado com sucesso'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Obter estatísticas de produtos
   */
  async getStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId!;
      if (!userId) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const stats = await service.getProductStatistics(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

