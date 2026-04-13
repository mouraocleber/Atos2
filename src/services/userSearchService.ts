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
  query?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
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
  // Reputação (opcional - pode ser null se sem avaliações)
  averageRating?: number;
  totalReviews?: number;
  ratingLevel?: string;
}

export class UserSearchService {
  async searchUsers(filters: UserSearchFilters): Promise<UserSearchResult[]> {
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Apenas ativos e pesquisáveis
    whereConditions.push(`u.is_active = true AND u.is_searchable = true`);

    if (filters.nickname) {
      whereConditions.push(`u.nickname ILIKE $${paramIndex}`);
      params.push(`%${filters.nickname}%`);
      paramIndex++;
    }

    if (filters.name) {
      whereConditions.push(`u.name ILIKE $${paramIndex}`);
      params.push(`%${filters.name}%`);
      paramIndex++;
    }

    if (filters.email) {
      whereConditions.push(`u.email ILIKE $${paramIndex}`);
      params.push(`%${filters.email}%`);
      paramIndex++;
    }

    if (filters.phone) {
      whereConditions.push(`u.phone ILIKE $${paramIndex}`);
      params.push(`%${filters.phone}%`);
      paramIndex++;
    }

    if (filters.city) {
      whereConditions.push(`u.city ILIKE $${paramIndex}`);
      params.push(`%${filters.city}%`);
      paramIndex++;
    }

    if (filters.state) {
      whereConditions.push(`u.state = $${paramIndex}`);
      params.push(filters.state.toUpperCase());
      paramIndex++;
    }

    if (filters.personType) {
      whereConditions.push(`u.person_type = $${paramIndex}`);
      params.push(filters.personType);
      paramIndex++;
    }

    // Filtro global (query => busca palavra chave, name, nickname, email, phone, cep)
    let queryParamIndex = -1;
    if (filters.query) {
      queryParamIndex = paramIndex;
      whereConditions.push(`(
        u.nickname ILIKE $${queryParamIndex} OR 
        u.name ILIKE $${queryParamIndex} OR 
        u.email ILIKE $${queryParamIndex} OR 
        u.phone ILIKE $${queryParamIndex} OR 
        u.cep ILIKE $${queryParamIndex} OR
        uk.keyword ILIKE $${queryParamIndex}
      )`);
      params.push(`%${filters.query}%`);
      paramIndex++;
    }

    // Filtro espacial (Raio se latitude e longitude e raio forem informados)
    if (filters.latitude && filters.longitude && filters.radius) {
      // Fórmula de Haversine para encontrar usuários dentro do raio
      whereConditions.push(`
        u.latitude IS NOT NULL AND u.longitude IS NOT NULL AND
        (6371 * acos(cos(radians($${paramIndex})) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians($${paramIndex + 1})) + sin(radians($${paramIndex})) * sin(radians(u.latitude)))) <= $${paramIndex + 2}
      `);
      params.push(filters.latitude, filters.longitude, filters.radius);
      paramIndex += 3;
    }

    const whereClause = whereConditions.join(' AND ');
    
    // Regra de ORDER BY
    // Se existir "query", ranqueamos quem comprou a palavra-chave que bate com o termo via uk.position. 
    // Logo, "uk.position = 1" vem primeiro (se houver match real).
    let orderClause = `ORDER BY u.created_at DESC`;
    if (filters.query) {
       orderClause = `ORDER BY 
         CASE WHEN uk.keyword ILIKE $${queryParamIndex} AND uk.active = true AND uk.expires_at > CURRENT_TIMESTAMP THEN uk.position ELSE 99 END ASC,
         COALESCE(r.average_rating, 0) DESC,
         u.name ASC
       `;
    }

    const sql = `
      SELECT
        u.id, u.email, u.phone, u.nickname, u.name, u.person_type, u.cep, u.address,
        u.city, u.state, u.profile_image, u.status, u.preferred_language, u.created_at,
        u.latitude, u.longitude, u.is_searchable,
        COALESCE(r.average_rating, 0) as average_rating,
        COALESCE(r.total_reviews, 0) as total_reviews,
        CASE
          WHEN COALESCE(r.average_rating, 0) >= 4.8 THEN 'LENDÁRIO'
          WHEN COALESCE(r.average_rating, 0) >= 4.5 THEN 'EXCELENTE'
          WHEN COALESCE(r.average_rating, 0) >= 4.0 THEN 'CONFIÁVEL'
          WHEN COALESCE(r.average_rating, 0) >= 3.5 THEN 'INICIANTE'
          ELSE 'NOVO'
        END as rating_level,
        MIN(CASE WHEN uk.active = true AND uk.expires_at > CURRENT_TIMESTAMP ${filters.query ? `AND uk.keyword ILIKE $${queryParamIndex}` : ''} THEN uk.position ELSE 99 END) as keyword_rank
      FROM users u
      LEFT JOIN user_reputation r ON u.id = r.user_id
      LEFT JOIN user_search_keywords uk ON u.id = uk.user_id
      WHERE ${whereClause}
      GROUP BY u.id, r.average_rating, r.total_reviews
      ORDER BY keyword_rank ASC, average_rating DESC, u.name ASC
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
      averageRating: parseFloat(row.average_rating),
      totalReviews: parseInt(row.total_reviews),
      ratingLevel: row.rating_level,
      isSearchable: row.is_searchable
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
        u.id, u.email, u.phone, u.nickname, u.name, u.person_type, u.cep, u.address,
        u.city, u.state, u.profile_image, u.status, u.preferred_language, u.created_at,
        COALESCE(r.average_rating, 0) as average_rating,
        COALESCE(r.total_reviews, 0) as total_reviews,
        CASE
          WHEN COALESCE(r.average_rating, 0) >= 4.8 THEN 'LENDÁRIO'
          WHEN COALESCE(r.average_rating, 0) >= 4.5 THEN 'EXCELENTE'
          WHEN COALESCE(r.average_rating, 0) >= 4.0 THEN 'CONFIÁVEL'
          WHEN COALESCE(r.average_rating, 0) >= 3.5 THEN 'INICIANTE'
          ELSE 'NOVO'
        END as rating_level
       FROM users u
       LEFT JOIN user_reputation r ON u.id = r.user_id
       WHERE u.is_active = true AND u.is_searchable = true
       ORDER BY u.created_at DESC
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
      averageRating: parseFloat(row.average_rating),
      totalReviews: parseInt(row.total_reviews),
      ratingLevel: row.rating_level,
    }));
  }

  async getUsersCount(): Promise<number> {
    const result = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true AND is_searchable = true');
    return parseInt(result.rows[0]?.count || 0);
  }
}

export default new UserSearchService();

