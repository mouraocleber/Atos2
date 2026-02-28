import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthRequest } from '../types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';
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

