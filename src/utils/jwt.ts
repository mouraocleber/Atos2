import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthRequest } from '../types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'undefined' || JWT_SECRET === '') {
  console.error('FATAL: A variável de ambiente JWT_SECRET não foi encontrada!');
  console.error('Verifique se o seu arquivo .env no servidor DigitalOcean contém JWT_SECRET=suachavereal');
  // Em produção, não queremos derrubar o processo imediatamente se houver outros fluxos, 
  // mas aqui é crítico. Vamos lançar um erro mais descritivo.
  throw new Error('ERRO DE CONFIGURAÇÃO: JWT_SECRET ausente. O sistema de login não pode funcionar sem esta chave.');
}


const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION } as SignOptions
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRATION } as SignOptions
  );
};

export const verifyToken = (token: string): AuthRequest => {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthRequest;
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
};

export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

