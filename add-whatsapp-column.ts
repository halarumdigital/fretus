import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev",
});

async function addDeliveryColumns() {
  const client = await pool.connect();

  try {
    console.log("Adicionando colunas customer_whatsapp e delivery_reference...");

    await client.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS customer_whatsapp VARCHAR(20)
    `);
    console.log("✓ Coluna customer_whatsapp adicionada");

    await client.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS delivery_reference TEXT
    `);
    console.log("✓ Coluna delivery_reference adicionada");

    console.log("\n✅ Migração concluída com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao adicionar colunas:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addDeliveryColumns();
