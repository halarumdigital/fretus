import "dotenv/config";
import { pool } from "./db";

async function migrateAddDriverDocuments() {
  try {
    console.log("🔄 Iniciando migração: Criar tabela driver_documents...\n");

    console.log("📝 Criando tabela driver_documents...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_documents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        document_type_id VARCHAR NOT NULL REFERENCES driver_document_types(id),
        document_url TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tabela driver_documents criada com sucesso\n");

    console.log("✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateAddDriverDocuments();
