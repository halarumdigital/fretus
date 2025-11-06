import "dotenv/config";
import { pool } from "./db";

async function migrateUpdateDriversFields() {
  try {
    console.log("🔄 Iniciando migração: Atualizar tabela drivers...\n");

    console.log("📝 Adicionando campos cpf, password, brandId, modelId, carYear...");
    await pool.query(`
      ALTER TABLE drivers
      ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
      ADD COLUMN IF NOT EXISTS password TEXT,
      ADD COLUMN IF NOT EXISTS brand_id VARCHAR REFERENCES brands(id),
      ADD COLUMN IF NOT EXISTS model_id VARCHAR REFERENCES vehicle_models(id),
      ADD COLUMN IF NOT EXISTS car_year VARCHAR(4);
    `);
    console.log("✅ Campos adicionados com sucesso\n");

    console.log("✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateUpdateDriversFields();
