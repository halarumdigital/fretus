import "dotenv/config";
import { pool } from "./db";

async function migrateAddDriverNotes() {
  try {
    console.log("🔄 Iniciando migração: Criar tabela driver_notes...\n");

    console.log("📝 Criando tabela driver_notes...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_notes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        note TEXT NOT NULL,
        note_type VARCHAR(20) NOT NULL DEFAULT 'general',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tabela driver_notes criada com sucesso\n");

    console.log("✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateAddDriverNotes();
