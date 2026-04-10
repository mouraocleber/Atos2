import { query } from './src/config/database';

async function updateDatabase() {
  console.log('Iniciando atualização do banco de dados para Busca Monetizada...');

  try {
    // 1. Alterar tabela users (se a coluna não existir)
    console.log('Adicionando coluna is_searchable na tabela users...');
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN DEFAULT TRUE;
    `);
    console.log('Coluna is_searchable verificada/adicionada com sucesso.');

    // 2. Criar a tabela user_search_keywords
    console.log('Criando tabela user_search_keywords...');
    await query(`
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
    `);
    
    // Garantir o trigger
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_search_keywords_updated_at') THEN
              CREATE TRIGGER update_user_search_keywords_updated_at 
              BEFORE UPDATE ON user_search_keywords
              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
          END IF;
      END
      $$;
    `);

    console.log('Tabela user_search_keywords criada com sucesso.');

    console.log('Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante a migração:', error);
    process.exit(1);
  }
}

updateDatabase();
