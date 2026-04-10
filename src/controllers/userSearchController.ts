import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import userSearchService from '../services/userSearchService';
import { AppError } from '../middleware/errorHandler';

export class UserSearchController {
  async searchUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { nickname, name, email, phone, city, state, personType, limit = 20, offset = 0, query, lat, lon } = req.query;

      // Validar que pelo menos um filtro foi fornecido
      if (!nickname && !name && !email && !phone && !city && !state && !personType && !query) {
        throw new AppError(400, 'Forneça pelo menos um critério de busca (ex: query)', 'MISSING_SEARCH_CRITERIA');
      }

      const results = await userSearchService.searchUsers({
        nickname: nickname as string,
        name: name as string,
        email: email as string,
        phone: phone as string,
        city: city as string,
        state: state as string,
        personType: personType as 'PF' | 'PJ',
        query: query as string,
        latitude: lat ? parseFloat(lat as string) : undefined,
        longitude: lon ? parseFloat(lon as string) : undefined,
        limit: parseInt(limit as string) || 20,
        offset: parseInt(offset as string) || 0,
      });

      res.json({
        success: true,
        message: `${results.length} usuário(s) encontrado(s)`,
        data: {
          users: results,
          count: results.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async searchByNickname(req: AuthenticatedRequest, res: Response) {
    try {
      const { nickname, limit = 20 } = req.query;

      if (!nickname) {
        throw new AppError(400, 'Nickname é obrigatório', 'MISSING_NICKNAME');
      }

      const results = await userSearchService.searchByNickname(
        nickname as string,
        parseInt(limit as string) || 20
      );

      res.json({
        success: true,
        message: `${results.length} usuário(s) encontrado(s)`,
        data: {
          users: results,
          count: results.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async searchByName(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, limit = 20 } = req.query;

      if (!name) {
        throw new AppError(400, 'Nome é obrigatório', 'MISSING_NAME');
      }

      const results = await userSearchService.searchByName(
        name as string,
        parseInt(limit as string) || 20
      );

      res.json({
        success: true,
        message: `${results.length} usuário(s) encontrado(s)`,
        data: {
          users: results,
          count: results.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async searchByCity(req: AuthenticatedRequest, res: Response) {
    try {
      const { city, limit = 20 } = req.query;

      if (!city) {
        throw new AppError(400, 'Cidade é obrigatória', 'MISSING_CITY');
      }

      const results = await userSearchService.searchByCity(
        city as string,
        parseInt(limit as string) || 20
      );

      res.json({
        success: true,
        message: `${results.length} usuário(s) encontrado(s)`,
        data: {
          users: results,
          count: results.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async searchByState(req: AuthenticatedRequest, res: Response) {
    try {
      const { state, limit = 20 } = req.query;

      if (!state) {
        throw new AppError(400, 'Estado é obrigatório', 'MISSING_STATE');
      }

      const results = await userSearchService.searchByState(
        state as string,
        parseInt(limit as string) || 20
      );

      res.json({
        success: true,
        message: `${results.length} usuário(s) encontrado(s)`,
        data: {
          users: results,
          count: results.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async advancedSearch(req: AuthenticatedRequest, res: Response) {
    try {
      const { nickname, name, city, state, personType, limit = 20 } = req.query;

      // Validar que pelo menos um filtro foi fornecido
      if (!nickname && !name && !city && !state && !personType) {
        throw new AppError(400, 'Forneça pelo menos um critério de busca', 'MISSING_SEARCH_CRITERIA');
      }

      const results = await userSearchService.advancedSearch(
        nickname as string,
        name as string,
        city as string,
        state as string,
        personType as 'PF' | 'PJ',
        parseInt(limit as string) || 20
      );

      res.json({
        success: true,
        message: `${results.length} usuário(s) encontrado(s)`,
        data: {
          users: results,
          count: results.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getPopularUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit = 10 } = req.query;

      const results = await userSearchService.getPopularUsers(
        parseInt(limit as string) || 10
      );

      res.json({
        success: true,
        message: 'Usuários mais recentes',
        data: {
          users: results,
          count: results.length,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async getUsersCount(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await userSearchService.getUsersCount();

      res.json({
        success: true,
        message: 'Total de usuários',
        data: { count },
      });
    } catch (error) {
      throw error;
    }
  }

  // Endpoint para habilitar/desabilitar aparição na busca (Opt-out)
  async updateSearchVisibility(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.userId;
      const { isSearchable } = req.body;

      if (!userId) {
        throw new AppError(401, 'Usuário não autenticado', 'UNAUTHORIZED');
      }

      if (typeof isSearchable !== 'boolean') {
        throw new AppError(400, 'isSearchable deve ser boolean', 'INVALID_PARAM');
      }

      // Atualizar o flag is_searchable na tabela users
      const { query } = require('../config/database');
      await query(`UPDATE users SET is_searchable = $1 WHERE id = $2`, [isSearchable, userId]);

      res.json({
        success: true,
        message: 'Visibilidade na busca atualizada.',
        data: {
            isSearchable
        }
      });
    } catch (error) {
      throw error;
    }
  }
}

export default new UserSearchController();

