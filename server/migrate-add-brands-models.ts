import "dotenv/config";
import { pool } from "./db";

async function migrateAddBrandsModels() {
  try {
    console.log("🔄 Iniciando migração: Adicionar tabelas brands e vehicle_models...\n");

    // 1. Criar tabela brands
    console.log("📝 Criando tabela brands...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tabela brands criada\n");

    // 2. Criar tabela vehicle_models
    console.log("📝 Criando tabela vehicle_models...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicle_models (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        brand_id VARCHAR NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tabela vehicle_models criada\n");

    console.log("✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateAddBrandsModels();
