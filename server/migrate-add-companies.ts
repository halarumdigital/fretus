import "dotenv/config";
import { pool } from "./db";

async function migrateAddCompanies() {
  try {
    console.log("🔄 Iniciando migração: Adicionar tabela companies...\n");

    // Criar tabela companies
    console.log("📝 Criando tabela companies...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(18) UNIQUE,
        email VARCHAR(255),
        phone VARCHAR(20),

        street VARCHAR(255),
        number VARCHAR(20),
        complement VARCHAR(100),
        neighborhood VARCHAR(100),
        cep VARCHAR(10),
        city VARCHAR(100),
        state VARCHAR(2),
        reference TEXT,

        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tabela companies criada\n");

    console.log("✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateAddCompanies();
