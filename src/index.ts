import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './routes/auth';
import messageScheduler from './services/messageScheduler';
import messageRoutes from './routes/messages';
import qrcodeRoutes from './routes/qrcode';
import usersRoutes from './routes/users';
import blockRoutes from './routes/block';
import reportRoutes from './routes/reports';
import backupRoutes from './routes/backup';
import productRoutes from './routes/products';
import productGroupRoutes from './routes/productGroups';
import userReviewRoutes from './routes/userReviews';
import productReviewRoutes from './routes/productReviews';
import walletRoutes from './routes/wallet';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/admin';
import keywordRoutes from './routes/keywordRoutes';
import callRoutes from './routes/calls';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173', // Vite Frontend Dev
  'http://localhost:3000', // Backend local
  'http://localhost:8081', // Expo React Native
  'http://localhost:19000', // Expo Classic
  'https://api.atos2.app', // Api em Prod
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite origem vazia (App Mobile Native, Insomnia, cURL) ou origens listadas
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pela Política de CORS'));
    }
  },
  credentials: true,
}));

// Rate Limit Global de proteção a DoS/Scraping (máx 500 req / 15 mins por IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Muitas requisições deste IP. Tente mais tarde.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use(globalLimiter);

// Middleware de parsing (Reduzido para 5mb proteger a memória de JSON injection massivo)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Servir arquivos estáticos (Uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Criar servidor HTTP com Socket.io
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

import stripeRoutes from './routes/stripeRoutes';

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/qrcode', qrcodeRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/block', blockRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-groups', productGroupRoutes);
app.use('/api/users/reviews', userReviewRoutes);
app.use('/api/products/reviews', productReviewRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes); // Mercado Pago Integration
app.use('/api/admin', adminRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Servidor está funcionando',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    error: 'NOT_FOUND',
  });
});

// Error handler
app.use(errorHandler);

// Socket.io eventos
io.on('connection', (socket) => {
  console.log(`Usuário conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
  });

  socket.on('message', (data) => {
    console.log('Mensagem recebida:', data);
    io.emit('message', data);
  });
});

import currencyService from './services/currencyService';

// Iniciar servidor
httpServer.listen(Number(port), '0.0.0.0', async () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  messageScheduler.start(io);
  try {
    await currencyService.initialize();
  } catch (e) {
    console.error('Falha ao inicializar a moeda global:', e);
  }
  // Migração de dados: garante que todos os usuários ativos sejam visíveis na busca
  try {
    const { query: dbQuery } = await import('./config/database');
    const migResult = await dbQuery(
      `UPDATE users SET is_searchable = true WHERE is_searchable = false OR is_searchable IS NULL`
    );
    console.log(`✅ Migração: ${migResult.rowCount} usuário(s) agora visíveis na busca.`);
  } catch (e) {
    console.error('⚠️ Falha na migração de is_searchable:', e);
  }
});

export default app;

