/**
 * Migration: Adiciona colunas de tradução à tabela messages
 * Executar com: npx ts-node src/database/migrations/add_translation_columns.ts
 */
import { query } from '../../config/database';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  console.log('🔄 Iniciando migration: add_translation_columns');

  try {
    // Adiciona coluna translated_content se não existir
    await query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS translated_content TEXT,
      ADD COLUMN IF NOT EXISTS translated_language VARCHAR(10),
      ADD COLUMN IF NOT EXISTS original_language VARCHAR(10)
    `);
    console.log('✅ Colunas de tradução adicionadas à tabela messages!');

    // Verifica se foi criado corretamente
    const result = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name IN ('translated_content', 'translated_language', 'original_language')
    `);
    console.log('📋 Colunas encontradas:', result.rows.map((r: any) => r.column_name));

  } catch (err) {
    console.error('❌ Erro na migration:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
