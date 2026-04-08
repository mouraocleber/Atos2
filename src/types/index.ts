// Tipos de Pessoa
export type PersonType = 'PF' | 'PJ';

// Tipos de Transação
export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// Tipos de Mensagem
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

// Tipos de Denuncia
export type ReportType = 'OFFENSIVE' | 'SCAM' | 'HARASSMENT' | 'SPAM' | 'OTHER';
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

// Interface de Usuário
export interface User {
  id: string;
  email: string;
  phone: string;
  nickname: string;
  name: string;
  personType: PersonType;
  cpf: string;
  cep: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  profileImage?: string;
  status?: string;
  preferredLanguage: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  blockNonContacts: boolean;
  isActive: boolean;
  role: 'USER' | 'ADMIN';
}

// Interface de Produto
export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}

// Interface de Transação
export interface Transaction {
  id: string;
  fromUserId: string;
  toUserId?: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description?: string;
  reference?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface de Mensagem
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  type: MessageType;
  content: string;
  mediaUrl?: string;
  status: MessageStatus;
  translatedContent?: string;
  translatedLanguage?: string;
  originalLanguage?: string;
  createdAt: Date;
  readAt?: Date;
  isEdited: boolean;
  isScheduled: boolean;
}

// Interface de Traducao
export interface Translation {
  id: string;
  messageId: string;
  originalContent: string;
  originalLanguage: string;
  translatedContent: string;
  translatedLanguage: string;
  provider: string;
  createdAt: Date;
}

// Interface de Contato
export interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  nickname?: string;
  createdAt: Date;
}

// Interface de Requisição Autenticada
export interface AuthRequest {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

// ============================================
// AVALIAÇÕES - TIPOS
// ============================================

// Status de avaliação
export type ReviewStatus = 'ACTIVE' | 'REPORTED' | 'HIDDEN';

// Interface de Avaliação de Usuário
export interface UserReview {
  id: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number; // 1-5
  comment?: string;
  isVerified: boolean;
  transactionId?: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Interface de Avaliação de Produto
export interface ProductReview {
  id: string;
  reviewerId: string;
  productId: string;
  rating: number; // 1-5
  comment?: string;
  isVerified: boolean;
  transactionId?: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Reputação de Usuário
export interface UserReputation {
  userId: string;
  totalReviews: number;
  averageRating: number;
  fiveStarCount: number;
  fourPlusCount: number;
  lastReviewAt?: Date;
  ratingLevel: 'NOVO' | 'INICIANTE' | 'CONFIÁVEL' | 'EXCELENTE' | 'LENDÁRIO';
}

// Stats de Produto
export interface ProductStats {
  productId: string;
  totalReviews: number;
  averageRating: number;
  fiveStarCount: number;
  fourPlusCount: number;
  lastReviewAt?: Date;
}

// Usuário com informações de reputação
export interface UserWithReputation extends User {
  averageRating?: number;
  totalReviews?: number;
  ratingLevel?: string;
}

// Interface de Resposta de API
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Request para criar avaliação
export interface CreateReviewRequest {
  reviewedUserId: string;
  rating: number;
  comment?: string;
  transactionId?: string;
}

// Request para criar review de produto
export interface CreateProductReviewRequest {
  productId: string;
  rating: number;
  comment?: string;
  transactionId?: string;
}

// Request para reportar avaliação
export interface ReportReviewRequest {
  reason: string;
  description?: string;
}

