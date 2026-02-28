// Tipos de Usuário
export interface User {
  id: string;
  email: string;
  phone: string;
  nickname: string;
  name: string;
  personType: 'PF' | 'PJ';
  cpf: string;
  cep: string;
  address: string;
  city: string;
  state: string;
  profileImage?: string;
  status?: string;
  preferredLanguage: string;
  balance: number;
  createdAt: Date;
  lastLogin?: Date;
}

// Tipos de Mensagem
export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'FILE';
  content: string;
  mediaUrl?: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  translatedContent?: string;
  translatedLanguage?: string;
  originalLanguage?: string;
  createdAt: Date;
  readAt?: Date;
}

// Tipos de Transação
export interface Transaction {
  id: string;
  fromUserId: string;
  toUserId?: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  description?: string;
  createdAt: Date;
}

// Tipos de Produto
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
}

// Resposta de API
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Contexto de Autenticação
export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

