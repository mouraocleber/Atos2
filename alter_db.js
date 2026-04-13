const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'app_mensagens_cash',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add plan column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO', 'BUSINESS'));
    `);

    // Add plan_expires_at column
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
    `);

    await client.query('COMMIT');
    console.log('Migração das colunas plan e plan_expires_at realizada com sucesso!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Erro na migração:', e);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
