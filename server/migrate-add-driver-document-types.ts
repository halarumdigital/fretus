import "dotenv/config";
import { pool } from "./db";

async function migrateAddDriverDocumentTypes() {
  try {
    console.log("🔄 Iniciando migração: Adicionar tabela driver_document_types...\n");

    // Criar tabela driver_document_types
    console.log("📝 Criando tabela driver_document_types...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_document_types (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        required BOOLEAN NOT NULL DEFAULT true,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tabela driver_document_types criada\n");

    console.log("✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateAddDriverDocumentTypes();
