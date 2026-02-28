import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => {
  console.error('Erro no Redis:', err);
});

redisClient.on('connect', () => {
  console.log('Conectado ao Redis');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis conectado com sucesso');
  } catch (error) {
    console.error('Erro ao conectar ao Redis:', error);
  }
};

export const getRedisClient = () => redisClient;

export default redisClient;

