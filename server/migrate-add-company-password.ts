import { pool } from './db';

async function addCompanyPasswordColumn() {
  try {
    // Adicionar coluna password à tabela companies
    await pool.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS password varchar(255)
    `);

    console.log('✅ Coluna password adicionada à tabela companies com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna password:', error);
  } finally {
    await pool.end();
  }
}

addCompanyPasswordColumn();
