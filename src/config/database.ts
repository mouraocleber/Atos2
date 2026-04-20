import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'atos2',

};

console.log('--- Configuração de Banco de Dados ---');
console.log('Host:', dbConfig.host);
console.log('Port:', dbConfig.port);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('--------------------------------------');

const pool = new Pool(dbConfig);


pool.on('error', (err) => {
  console.error('Erro no pool de conexão:', err);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executada', { text, duration, rows: result.rowCount });
    return result;
  } catch (error: any) {
    console.error('--- ERRO NA QUERY SQL ---');
    console.error('Comando:', text);
    console.error('Parâmetros:', params);
    console.error('Mensagem:', error.message);
    console.error('Código PG:', error.code);
    console.error('Detalhe:', error.detail);
    console.error('--------------------------');
    throw error;
  }

};

export const getClient = async (): Promise<PoolClient> => {
  return pool.connect();
};

export default pool;

