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
import pixRoutes from './routes/pixRoutes';
import adminRoutes from './routes/admin';
import keywordRoutes from './routes/keywordRoutes';
import callRoutes from './routes/calls';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

const allowedOrigins = [
  'http://localhost:5173', // Vite Frontend Dev
  'http://localhost:3000', // Backend local
  'http://localhost:8081', // Expo React Native
  'http://localhost:19000', // Expo Classic
  'https://api.atos2.app', // Api em Prod
  'http://142.93.59.54:3001', // IP direto Prod
  process.env.CORS_ORIGIN,
].filter(Boolean) as string[];


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

// Servir arquivos estáticos (Uploads) com MIME types corretos
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.mp4') {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (ext === '.m4a') {
      res.setHeader('Content-Type', 'audio/x-m4a');
    }
  }
}));

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
app.use('/api/pix', pixRoutes);
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

// Servir a landing page
app.use(express.static(path.join(process.cwd(), 'landing-page')));

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

// Mapa de userId -> socketId para entrega direcionada
const userSocketMap = new Map<string, string>();

// Exporta io e userSocketMap para uso nos controllers
export { io, userSocketMap };

// Socket.io eventos
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  console.log(`Usuário conectado: ${socket.id} (userId: ${userId})`);

  // Registra o usuário na sua sala pessoal
  if (userId) {
    socket.join(`user_${userId}`);
    userSocketMap.set(userId, socket.id);
    console.log(`Usuário ${userId} entrou na sala user_${userId}`);
  }

  socket.on('disconnect', () => {
    console.log(`Usuário desconectado: ${socket.id}`);
    if (userId) {
      userSocketMap.delete(userId);
    }
  });

  // Entrar em sala de conversa específica (para entrega direcionada)
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} entrou na sala ${roomId}`);
  });

  socket.on('leaveRoom', (roomId: string) => {
    socket.leave(roomId);
  });

  // Chamadas VoIP com logs detalhados
  socket.on('callUser', (data) => {
    console.log(`[Socket Call] callUser: de ${userId} (nome: ${data.fromName}) para ${data.to} (tipo: ${data.type})`);
    io.to(`user_${data.to}`).emit('callUser', data);
  });

  socket.on('callAccepted', (data) => {
    console.log(`[Socket Call] callAccepted: de ${userId} para ${data.to}`);
    // Receptor aceitou a chamada — avisa o chamador para entrar em 'in-call'
    io.to(`user_${data.to}`).emit('callAccepted', { from: userId });
  });

  socket.on('webrtcSignal', (data) => {
    console.log(`[Socket Call] webrtcSignal: de ${userId} para ${data.to}`);
    // Relays SDP offers, answers and ICE candidates to the target peer room
    io.to(`user_${data.to}`).emit('webrtcSignal', {
      from: userId,
      signal: data.signal,
    });
  });

  socket.on('hangUp', (data) => {
    console.log(`[Socket Call] hangUp: de ${userId} para ${data.to}`);
    io.to(`user_${data.to}`).emit('hangUp', data);
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

  // Migração: Adiciona colunas de tradução à tabela messages (Bug Fix #3)
  try {
    const { query: dbQuery } = await import('./config/database');
    await dbQuery(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS translated_content TEXT,
      ADD COLUMN IF NOT EXISTS translated_language VARCHAR(10),
      ADD COLUMN IF NOT EXISTS original_language VARCHAR(10)
    `);
    console.log('✅ Migração: colunas de tradução garantidas na tabela messages.');
  } catch (e) {
    console.error('⚠️ Falha na migração de colunas de tradução:', e);
  }

  // Migração: Garante a tabela Translations para o DeepL não crachar silenciosamente
  try {
    const { query: dbQuery } = await import('./config/database');
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS translations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        original_content TEXT NOT NULL,
        original_language VARCHAR(10) NOT NULL,
        translated_content TEXT NOT NULL,
        translated_language VARCHAR(10) NOT NULL,
        provider VARCHAR(20) DEFAULT 'deepl',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Migração: tabela translations do DeepL garantida no BD.');
  } catch (e) {
    console.error('⚠️ Falha na migração da tabela translations:', e);
  }

  // Migração: Garante que a tabela messages suporte o tipo de mensagem LOCATION
  try {
    const { query: dbQuery } = await import('./config/database');
    await dbQuery(`
      ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
    `);
    await dbQuery(`
      ALTER TABLE messages ADD CONSTRAINT messages_type_check CHECK (type IN ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'LOCATION'));
    `);
    console.log('✅ Migração: constraint de tipo de mensagem LOCATION garantida na tabela messages.');
  } catch (e) {
    console.error('⚠️ Falha na migração de tipo de mensagem LOCATION:', e);
  }

  // Migração: Garante as colunas extras de monetização/vitrine na tabela products
  try {
    const { query: dbQuery } = await import('./config/database');
    await dbQuery(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 99,
      ADD COLUMN IF NOT EXISTS is_reservable BOOLEAN DEFAULT true;
    `);
    console.log('✅ Migração: colunas extras da vitrine garantidas na tabela products.');
  } catch (e) {
    console.error('⚠️ Falha na migração de colunas extras da vitrine:', e);
  }

  // Migração: Permite que de-para transações de DEPOSIT possam ter from_user_id como NULL
  try {
    const { query: dbQuery } = await import('./config/database');
    await dbQuery(`
      ALTER TABLE transactions ALTER COLUMN from_user_id DROP NOT NULL;
    `);
    console.log('✅ Migração: drop de NOT NULL na coluna from_user_id de transactions garantido.');
  } catch (e) {
    console.error('⚠️ Falha na migração de nullability de from_user_id:', e);
  }
});

export default app;

