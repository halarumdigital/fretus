import { pool } from './db';

async function addRatingColumn() {
  try {
    // Adicionar coluna rating à tabela companies
    await pool.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT 0
    `);

    console.log('✅ Coluna rating adicionada à tabela companies com sucesso!');
  } catch (error) {
    console.error('Erro ao adicionar coluna rating:', error);
  } finally {
    await pool.end();
  }
}

addRatingColumn();
