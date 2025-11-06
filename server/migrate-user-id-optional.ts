import { pool } from './db';

async function makeUserIdOptional() {
  try {
    // Tornar a coluna user_id opcional (remover NOT NULL constraint)
    await pool.query(`
      ALTER TABLE drivers
      ALTER COLUMN user_id DROP NOT NULL
    `);

    console.log('✅ Campo user_id da tabela drivers agora é opcional!');
  } catch (error) {
    console.error('Erro ao alterar coluna user_id:', error);
  } finally {
    await pool.end();
  }
}

makeUserIdOptional();
