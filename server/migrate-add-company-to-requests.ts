import { pool } from './db';

async function addCompanyToRequests() {
  try {
    console.log('Iniciando migração...');

    // Tornar user_id nullable (já que agora pode ser empresa ou usuário)
    await pool.query(`
      ALTER TABLE requests
      ALTER COLUMN user_id DROP NOT NULL
    `);
    console.log('✅ user_id agora é nullable');

    // Adicionar coluna company_id
    await pool.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS company_id varchar(255) REFERENCES companies(id)
    `);
    console.log('✅ Coluna company_id adicionada');

    console.log('\n✅ Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await pool.end();
  }
}

addCompanyToRequests();
