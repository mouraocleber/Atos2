import { query } from '../config/database';
import { User } from '../types';

export interface UserSearchFilters {
  nickname?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  personType?: 'PF' | 'PJ';
  limit?: number;
  offset?: number;
}

export interface UserSearchResult {
  id: string;
  email: string;
  phone: string;
  nickname: string;
  name: string;
  personType: 'PF' | 'PJ';
  cep: string;
  address: string;
  city: string;
  state: string;
  profileImage?: string;
  status?: string;
  preferredLanguage: string;
  createdAt: Date;
}

export class UserSearchService {
  async searchUsers(filters: UserSearchFilters): Promise<UserSearchResult[]> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Buscar por nickname
    if (filters.nickname) {
      whereConditions.push(`nickname ILIKE $${paramIndex}`);
      params.push(`%${filters.nickname}%`);
      paramIndex++;
    }

    // Buscar por nome
    if (filters.name) {
      whereConditions.push(`name ILIKE $${paramIndex}`);
      params.push(`%${filters.name}%`);
      paramIndex++;
    }

    // Buscar por email
    if (filters.email) {
      whereConditions.push(`email ILIKE $${paramIndex}`);
      params.push(`%${filters.email}%`);
      paramIndex++;
    }

    // Buscar por telefone
    if (filters.phone) {
      whereConditions.push(`phone ILIKE $${paramIndex}`);
      params.push(`%${filters.phone}%`);
      paramIndex++;
    }

    // Filtrar por cidade
    if (filters.city) {
      whereConditions.push(`city ILIKE $${paramIndex}`);
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    // Filtrar por estado
    if (filters.state) {
      whereConditions.push(`state = $${paramIndex}`);
      params.push(filters.state.toUpperCase());
      paramIndex++;
    }

    // Filtrar por tipo de pessoa
    if (filters.personType) {
      whereConditions.push(`person_type = $${paramIndex}`);
      params.push(filters.personType);
      paramIndex++;
    }

    // Se nenhum filtro foi fornecido, retornar vazio
    if (whereConditions.length === 0) {
      return [];
    }

    // Construir query
    const whereClause = whereConditions.join(' OR ');
    const sql = `
      SELECT 
        id, email, phone, nickname, name, person_type, cep, address, 
        city, state, profile_image, status, preferred_language, created_at
      FROM users 
      WHERE ${whereClause} AND is_active = true
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await query(sql, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      phone: row.phone,
      nickname: row.nickname,
      name: row.name,
      personType: row.person_type,
      cep: row.cep,
      address: row.address,
      city: row.city,
      state: row.state,
      profileImage: row.profile_image,
      status: row.status,
      preferredLanguage: row.preferred_language,
      createdAt: row.created_at,
    }));
  }

  async searchByNickname(nickname: string, limit: number = 20): Promise<UserSearchResult[]> {
    return this.searchUsers({ nickname, limit });
  }

  async searchByName(name: string, limit: number = 20): Promise<UserSearchResult[]> {
    return this.searchUsers({ name, limit });
  }

  async searchByEmail(email: string): Promise<UserSearchResult | null> {
    const results = await this.searchUsers({ email, limit: 1 });
    return results[0] || null;
  }

  async searchByPhone(phone: string): Promise<UserSearchResult | null> {
    const results = await this.searchUsers({ phone, limit: 1 });
    return results[0] || null;
  }

  async searchByCity(city: string, limit: number = 20): Promise<UserSearchResult[]> {
    return this.searchUsers({ city, limit });
  }

  async searchByState(state: string, limit: number = 20): Promise<UserSearchResult[]> {
    return this.searchUsers({ state, limit });
  }

  async searchByPersonType(personType: 'PF' | 'PJ', limit: number = 20): Promise<UserSearchResult[]> {
    return this.searchUsers({ personType, limit });
  }

  async advancedSearch(
    nickname?: string,
    name?: string,
    city?: string,
    state?: string,
    personType?: 'PF' | 'PJ',
    limit: number = 20
  ): Promise<UserSearchResult[]> {
    return this.searchUsers({
      nickname,
      name,
      city,
      state,
      personType,
      limit,
    });
  }

  async getPopularUsers(limit: number = 10): Promise<UserSearchResult[]> {
    const result = await query(
      `SELECT 
        id, email, phone, nickname, name, person_type, cep, address, 
        city, state, profile_image, status, preferred_language, created_at
       FROM users 
       WHERE is_active = true
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      phone: row.phone,
      nickname: row.nickname,
      name: row.name,
      personType: row.person_type,
      cep: row.cep,
      address: row.address,
      city: row.city,
      state: row.state,
      profileImage: row.profile_image,
      status: row.status,
      preferredLanguage: row.preferred_language,
      createdAt: row.created_at,
    }));
  }

  async getUsersCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
    return parseInt(result.rows[0]?.count || 0);
  }
}

export default new UserSearchService();

