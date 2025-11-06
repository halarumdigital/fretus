import "dotenv/config";
import { pool } from "./db";

async function migrateAddStopReturnPrices() {
  try {
    console.log("🔄 Iniciando migração: Adicionar campos stop_price e return_price...\n");

    // Adicionar coluna stop_price
    console.log("📝 Adicionando coluna stop_price...");
    await pool.query(`
      ALTER TABLE city_prices
      ADD COLUMN IF NOT EXISTS stop_price NUMERIC(10, 2) DEFAULT 0;
    `);
    console.log("✅ Coluna stop_price adicionada\n");

    // Adicionar coluna return_price
    console.log("📝 Adicionando coluna return_price...");
    await pool.query(`
      ALTER TABLE city_prices
      ADD COLUMN IF NOT EXISTS return_price NUMERIC(10, 2) DEFAULT 0;
    `);
    console.log("✅ Coluna return_price adicionada\n");

    console.log("✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateAddStopReturnPrices();
