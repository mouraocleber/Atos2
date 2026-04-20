import { query } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { User } from '../types';
import axios from 'axios';

export class UserService {
  async createUser(userData: {
    email: string;
    phone: string;
    nickname: string;
    name: string;
    personType: 'PF' | 'PJ';
    cpf: string;
    cep: string;
    password: string;
    preferredLanguage?: string;
    blockNonContacts?: boolean;
  }): Promise<User> {
    const passwordHash = await hashPassword(userData.password);

    // Buscar endereço via CEP
    const addressData = await this.fetchAddressByCEP(userData.cep);

    const result = await query(
      `INSERT INTO users (
        email, phone, nickname, name, person_type, cpf, cep, 
        address, city, state, country, password_hash, preferred_language, block_non_contacts, is_searchable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, email, phone, nickname, name, person_type, cpf, cep, 
                address, city, state, country, profile_image, status, preferred_language, balance, 
                is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at`,
      [
        userData.email,
        userData.phone,
        userData.nickname,
        userData.name,
        userData.personType,
        userData.cpf,
        userData.cep,
        addressData.address,
        addressData.city,
        addressData.state,
        'BR',
        passwordHash,
        userData.preferredLanguage || 'pt-BR',
        userData.blockNonContacts || false,
        true, // is_searchable = true por padrão para novos usuários
      ]
    );

    return this.mapUser(result.rows[0]) as User;
  }

  private mapUser(row: any): User | null {
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      phone: row.phone,
      nickname: row.nickname,
      name: row.name,
      personType: row.person_type,
      cpf: row.cpf,
      cep: row.cep,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      profileImage: row.profile_image,
      status: row.status,
      preferredLanguage: row.preferred_language,
      balance: parseFloat(row.balance || '0'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
      blockNonContacts: row.block_non_contacts,
      role: row.role,
      plan: row.plan || 'FREE',
      planExpiresAt: row.plan_expires_at,
    } as User;
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at
       FROM users WHERE id = $1`,
      [userId]
    );

    return this.mapUser(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at
       FROM users WHERE email = $1`,
      [email]
    );

    return this.mapUser(result.rows[0]);
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at
       FROM users WHERE phone = $1`,
      [phone]
    );

    return this.mapUser(result.rows[0]);
  }

  async getUserByCpf(cpf: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at
       FROM users WHERE cpf = $1`,
      [cpf]
    );

    return this.mapUser(result.rows[0]);
  }

  async getUserByNickname(nickname: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at
       FROM users WHERE nickname = $1`,
      [nickname]
    );

    return this.mapUser(result.rows[0]);
  }

  async getUserPasswordHash(userId: string): Promise<string | null> {
    const result = await query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows[0]?.password_hash || null;
  }

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const hash = await this.getUserPasswordHash(userId);
    if (!hash) return false;
    return comparePassword(password, hash);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const allowedFields = ['nickname', 'name', 'profile_image', 'status', 'latitude', 'longitude', 'block_non_contacts', 'role', 'is_active', 'preferred_language'];
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return this.getUserById(userId);
    }

    updateValues.push(userId);

    const result = await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, email, phone, nickname, name, person_type, cpf, cep, 
                 address, city, state, country, profile_image, status, preferred_language, balance, 
                 is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at`,
      updateValues
    );

    return this.mapUser(result.rows[0]);
  }

  async updateBalance(userId: string, amount: number): Promise<number | null> {
    const result = await query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2
       RETURNING balance`,
      [amount, userId]
    );

    return result.rows[0]?.balance || null;
  }

  async searchUsers(query_text: string, limit: number = 20): Promise<User[]> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role, plan, plan_expires_at
       FROM users 
       WHERE nickname ILIKE $1 OR name ILIKE $1 OR email ILIKE $1
       LIMIT $2`,
      [`%${query_text}%`, limit]
    );

    return result.rows.map(row => this.mapUser(row) as User);
  }

  private async fetchAddressByCEP(cep: string): Promise<{
    address: string;
    city: string;
    state: string;
  }> {
    try {
      console.log(`Buscando CEP: ${cep}`);
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 5000 });

      if (response.data.erro) {
        console.warn(`CEP ${cep} não encontrado no ViaCEP.`);
        return {
          address: '',
          city: '',
          state: '',
        };
      }

      return {
        address: response.data.logradouro || '',
        city: response.data.localidade || '',
        state: response.data.uf || '',
      };
    } catch (error: any) {
      console.error('Erro ao buscar CEP (ViaCEP pode estar fora ou bloqueando o IP):', error.message);
      // Retornamos campos vazios para permitir que o registro continue sem quebrar o fluxo principal
      return {
        address: '',
        city: '',
        state: '',
      };
    }
  }


  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );
  }
}

export default new UserService();

