import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev",
});

async function removePaymentType() {
  const client = await pool.connect();

  try {
    console.log("Removendo coluna payment_type da tabela city_prices...");

    await client.query(`
      ALTER TABLE city_prices
      DROP COLUMN IF EXISTS payment_type
    `);

    console.log("✅ Coluna payment_type removida com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao remover coluna:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

removePaymentType();
