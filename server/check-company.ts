import { pool } from './db';

async function checkCompany() {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, email, address, number, neighborhood, city, state, zip_code
      FROM companies
      LIMIT 1
    `);

    if (rows.length === 0) {
      console.log('❌ Nenhuma empresa encontrada no banco');
    } else {
      console.log('✅ Empresa encontrada:');
      console.log(JSON.stringify(rows[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Erro ao buscar empresa:', error);
  } finally {
    await pool.end();
  }
}

checkCompany();
