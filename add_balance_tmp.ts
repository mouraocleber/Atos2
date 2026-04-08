import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false } as any);

async function run() {
  const client = await pool.connect();
  try {
    const user = await client.query(
      "SELECT id, name, email, nickname FROM users WHERE LOWER(name) LIKE '%cleber%' OR LOWER(email) LIKE '%cleber%' OR LOWER(nickname) LIKE '%cleber%'"
    );

    if (user.rows.length === 0) {
      const all = await client.query('SELECT id, name, email, nickname FROM users LIMIT 10');
      console.log('Nenhum cleber encontrado. Usuarios:', JSON.stringify(all.rows, null, 2));
      return;
    }

    console.log('Encontrado:', JSON.stringify(user.rows[0]));
    const userId = user.rows[0].id;

    const wallet = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1', [userId]);
    if (wallet.rows.length > 0) {
      await client.query('UPDATE wallets SET balance = balance + 1000 WHERE user_id = $1', [userId]);
      const updated = await client.query('SELECT balance FROM wallets WHERE user_id = $1', [userId]);
      console.log('Carteira atualizada. Novo saldo:', updated.rows[0].balance);
    } else {
      await client.query("INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 1000, 'BRL')", [userId]);
      console.log('Carteira criada com saldo 1000');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
