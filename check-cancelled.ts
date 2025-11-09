import { pool } from "./server/db";

async function checkCancelledDeliveries() {
  try {
    const { rows } = await pool.query(`
      SELECT
        r.id,
        r.request_number,
        r.customer_name,
        r.created_at,
        r.cancelled_at,
        r.is_cancelled
      FROM requests r
      WHERE r.is_cancelled = true
      ORDER BY r.cancelled_at DESC NULLS LAST
      LIMIT 10
    `);

    console.log('📋 Entregas canceladas encontradas:', rows.length);
    console.log(JSON.stringify(rows, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

checkCancelledDeliveries();
