import { pool } from './db';

async function checkGoogleKey() {
  try {
    const { rows } = await pool.query(`
      SELECT google_maps_api_key
      FROM settings
      LIMIT 1
    `);

    if (rows.length === 0) {
      console.log('❌ Nenhuma configuração encontrada');
    } else if (!rows[0].google_maps_api_key) {
      console.log('❌ Chave do Google Maps não configurada');
    } else {
      console.log('✅ Chave do Google Maps encontrada');
      console.log('Chave:', rows[0].google_maps_api_key.substring(0, 10) + '...');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkGoogleKey();
