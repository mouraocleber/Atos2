import { query } from '../config/database';
import { Contact } from '../types';

export class ContactService {
  async isContact(userId: string, contactUserId: string): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM contacts WHERE user_id = $1 AND contact_user_id = $2`,
      [userId, contactUserId]
    );

    return (result.rowCount || 0) > 0;
  }

  async addContact(userId: string, contactUserId: string, nickname?: string): Promise<Contact> {
    const result = await query(
      `INSERT INTO contacts (user_id, contact_user_id, nickname) VALUES ($1, $2, $3)
       RETURNING id, user_id, contact_user_id, nickname, created_at`,
      [userId, contactUserId, nickname || null]
    );

    return result.rows[0];
  }

  async removeContact(userId: string, contactUserId: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM contacts WHERE user_id = $1 AND contact_user_id = $2`,
      [userId, contactUserId]
    );

    return (result.rowCount || 0) > 0;
  }

  async getContacts(userId: string): Promise<Contact[]> {
    const result = await query(
      `SELECT id, user_id, contact_user_id, nickname, created_at FROM contacts WHERE user_id = $1`,
      [userId]
    );

    return result.rows;
  }
}

export default new ContactService();
