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
        address, city, state, country, password_hash, preferred_language, block_non_contacts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, email, phone, nickname, name, person_type, cpf, cep, 
                address, city, state, country, profile_image, status, preferred_language, balance, 
                is_active, created_at, updated_at, last_login, block_non_contacts, role`,
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
      ]
    );

    return result.rows[0];
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role
       FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role
       FROM users WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  }

  async getUserByNickname(nickname: string): Promise<User | null> {
    const result = await query(
      `SELECT id, email, phone, nickname, name, person_type, cpf, cep, 
              address, city, state, country, profile_image, status, preferred_language, balance, 
              is_active, created_at, updated_at, last_login, block_non_contacts, role
       FROM users WHERE nickname = $1`,
      [nickname]
    );

    return result.rows[0] || null;
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
    const allowedFields = ['nickname', 'name', 'profile_image', 'status', 'latitude', 'longitude', 'block_non_contacts', 'role', 'is_active'];
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
                 is_active, created_at, updated_at, last_login, block_non_contacts, role`,
      updateValues
    );

    return result.rows[0] || null;
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
              is_active, created_at, updated_at, last_login, block_non_contacts, role
       FROM users 
       WHERE nickname ILIKE $1 OR name ILIKE $1 OR email ILIKE $1
       LIMIT $2`,
      [`%${query_text}%`, limit]
    );

    return result.rows;
  }

  private async fetchAddressByCEP(cep: string): Promise<{
    address: string;
    city: string;
    state: string;
  }> {
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

      if (response.data.erro) {
        throw new Error('CEP não encontrado');
      }

      return {
        address: response.data.logradouro,
        city: response.data.localidade,
        state: response.data.uf,
      };
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return {
        address: '',
        city: '',
        state: '',
      };
    }
  }
}

export default new UserService();

