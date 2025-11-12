import { pool } from "./server/db";

async function applyMigration() {
  try {
    console.log("Aplicando migração de avaliações...");

    // Criar tabela company_driver_ratings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS company_driver_ratings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id VARCHAR NOT NULL REFERENCES requests(id),
        company_id VARCHAR NOT NULL REFERENCES companies(id),
        driver_id VARCHAR NOT NULL REFERENCES drivers(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ Tabela company_driver_ratings criada");

    // Adicionar coluna company_rated na tabela requests
    await pool.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS company_rated BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log("✓ Coluna company_rated adicionada à tabela requests");

    console.log("\n✅ Migração aplicada com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao aplicar migração:", error);
    process.exit(1);
  }
}

applyMigration();
