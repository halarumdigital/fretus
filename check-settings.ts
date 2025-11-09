import { pool } from "./server/db";

async function checkSettings() {
  try {
    const { rows } = await pool.query(`
      SELECT
        auto_cancel_timeout,
        driver_acceptance_timeout,
        min_time_to_find_driver,
        driver_search_radius
      FROM settings
      LIMIT 1
    `);

    console.log('📋 Configurações atuais:');
    console.log(JSON.stringify(rows[0], null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

checkSettings();
