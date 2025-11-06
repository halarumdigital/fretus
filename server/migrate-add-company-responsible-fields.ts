import "dotenv/config";
import { pool } from "./db";

async function migrateAddCompanyResponsibleFields() {
  try {
    console.log("🔄 Iniciando migração: Adicionar campos de responsável na tabela companies...\n");

    console.log("📝 Adicionando campos responsible_name, responsible_whatsapp, responsible_email...");
    await pool.query(`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS responsible_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS responsible_whatsapp VARCHAR(20),
      ADD COLUMN IF NOT EXISTS responsible_email VARCHAR(255);
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

migrateAddCompanyResponsibleFields();
