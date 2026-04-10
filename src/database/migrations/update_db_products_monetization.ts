import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'atos2_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
  console.log('Iniciando migração de monetização de produtos...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Adicionar o campo na tabela reports
    console.log('Adicionando product_id na tabela reports...');
    await client.query(`
      ALTER TABLE reports 
      ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE CASCADE;
    `);

    // 2. Adicionar o campo na tabela products
    console.log('Adicionando is_reservable na tabela products...');
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS is_reservable BOOLEAN DEFAULT true;
    `);

    // 3. Criar a tabela product_reservations
    console.log('Criando tabela product_reservations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_reservations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reservation_date DATE NOT NULL,
        reservation_time TIME NOT NULL,
        observation TEXT,
        amount_paid DECIMAL(15,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'COMPLETED',
        transaction_id UUID REFERENCES transactions(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Update init-db.sql like triggers
    console.log('Criando trigger para product_reservations...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_product_reservations_updated_at ON product_reservations;
      CREATE TRIGGER update_product_reservations_updated_at 
      BEFORE UPDATE ON product_reservations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro na migração:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
