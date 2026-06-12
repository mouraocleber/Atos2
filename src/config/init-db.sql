-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  nickname VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  person_type VARCHAR(2) NOT NULL CHECK (person_type IN ('PF', 'PJ')),
  cpf VARCHAR(14) UNIQUE NOT NULL,
  cep VARCHAR(10) NOT NULL,
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  country VARCHAR(100) DEFAULT 'BR',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  profile_image VARCHAR(500),
  status VARCHAR(255),
  preferred_language VARCHAR(10) DEFAULT 'pt-BR',
  password_hash VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  is_searchable BOOLEAN DEFAULT TRUE,
  plan VARCHAR(20) DEFAULT 'FREE',
  plan_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  block_non_contacts BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Tabela de Palavras-Chave de Busca Promovida
CREATE TABLE IF NOT EXISTS user_search_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  position INT NOT NULL CHECK (position >= 1 AND position <= 5),
  price_paid DECIMAL(15, 2),
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, position)
);

CREATE INDEX IF NOT EXISTS idx_user_keywords_keyword ON user_search_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_user_keywords_active ON user_search_keywords(active);

CREATE TRIGGER update_user_search_keywords_updated_at BEFORE UPDATE ON user_search_keywords
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Tabela de Grupos de Produtos
CREATE TABLE IF NOT EXISTS product_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(7),
  position INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_groups_user_id ON product_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_product_groups_active ON product_groups(is_active);

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES product_groups(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15, 2) NOT NULL,
  quantity INTEGER DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'un',
  image VARCHAR(500),
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DISCONTINUED')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_group_id ON products(group_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Tabela de Carteiras (Moeda Local)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  balance DECIMAL(15, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);

-- Tabela de Taxas de Câmbio
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(15, 6) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(from_currency, to_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);

-- Tabela de Transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAW', 'TRANSFER', 'PAYMENT', 'REFUND')),
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  converted_amount DECIMAL(15, 2),
  converted_currency VARCHAR(3),
  exchange_rate DECIMAL(15, 6),
  fee DECIMAL(15, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  description TEXT,
  reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_from_user_id ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user_id ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Tabela de Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL DEFAULT 'TEXT' CHECK (type IN ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'LOCATION')),
  content TEXT NOT NULL,
  media_url VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'READ', 'SCHEDULED', 'FAILED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP,
  is_edited BOOLEAN DEFAULT FALSE,
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMP,
  translated_content TEXT,
  translated_language VARCHAR(10),
  original_language VARCHAR(10)
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Tabela de Contatos
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, contact_user_id)
);

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

-- Tabela de Sessões
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Tabela de Traducoes
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  original_language VARCHAR(10) NOT NULL,
  translated_content TEXT NOT NULL,
  translated_language VARCHAR(10) NOT NULL,
  provider VARCHAR(50) DEFAULT 'openai',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_translations_message_id ON translations(message_id);
CREATE INDEX IF NOT EXISTS idx_translations_translated_language ON translations(translated_language);

-- Tabela de Bloqueios
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);

-- Tabela de Denuncias
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('OFFENSIVE', 'SCAM', 'HARASSMENT', 'SPAM', 'OTHER')),
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Tabela de Códigos de Validação
CREATE TABLE IF NOT EXISTS validation_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20),
  email VARCHAR(255),
  code VARCHAR(6) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('SMS', 'EMAIL')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'EXPIRED')),
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_validation_codes_phone ON validation_codes(phone);
CREATE INDEX IF NOT EXISTS idx_validation_codes_email ON validation_codes(email);
CREATE INDEX IF NOT EXISTS idx_validation_codes_status ON validation_codes(status);
CREATE INDEX IF NOT EXISTS idx_validation_codes_expires_at ON validation_codes(expires_at);

-- Tabela de Backups
CREATE TABLE IF NOT EXISTS backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255),
  email VARCHAR(255),
  backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('MANUAL', 'AUTOMATIC', 'EMAIL')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  file_url VARCHAR(500),
  file_size BIGINT,
  messages_count INT DEFAULT 0,
  media_count INT DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backups_user_id ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);

-- Tabela de QR Codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(500) NOT NULL UNIQUE,
  data JSONB,
  expires_at TIMESTAMP NOT NULL,
  scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);

-- Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Criar índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(
  (CASE WHEN sender_id < recipient_id THEN sender_id ELSE recipient_id END),
  (CASE WHEN sender_id < recipient_id THEN recipient_id ELSE sender_id END)
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_groups_updated_at BEFORE UPDATE ON product_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABELAS DE AVALIAÇÕES E REPUTAÇÃO
-- ============================================

-- Tabela de Avaliações de Usuários
CREATE TABLE IF NOT EXISTS user_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  transaction_id UUID,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REPORTED', 'HIDDEN')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT different_users_review CHECK (reviewer_id != reviewed_user_id),
  UNIQUE(reviewer_id, reviewed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed_user ON user_reviews(reviewed_user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewer ON user_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_rating ON user_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_user_reviews_status ON user_reviews(status);

-- Tabela de Avaliações de Produtos
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  transaction_id UUID,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REPORTED', 'HIDDEN')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(reviewer_id, product_id),
  CONSTRAINT valid_product_rating CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_reviewer ON product_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);

-- View para Reputação de Usuários
CREATE OR REPLACE VIEW user_reputation AS
SELECT
  u.id as user_id,
  COUNT(r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as four_plus_count,
  MAX(r.created_at) as last_review_at
FROM users u
LEFT JOIN user_reviews r ON u.id = r.reviewed_user_id AND r.status = 'ACTIVE'
GROUP BY u.id;

-- View para Avaliações de Produtos
CREATE OR REPLACE VIEW product_stats AS
SELECT
  p.id as product_id,
  COUNT(r.id) as total_reviews,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN r.rating >= 4 THEN 1 END) as four_plus_count,
  MAX(r.created_at) as last_review_at
FROM products p
LEFT JOIN product_reviews r ON p.id = r.product_id AND r.status = 'ACTIVE'
GROUP BY p.id;

-- Triggers para atualizar updated_at nas novas tabelas
CREATE TRIGGER update_user_reviews_updated_at BEFORE UPDATE ON user_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
