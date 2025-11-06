import "dotenv/config";
import { pool } from "./db";

async function migrateCities() {
  try {
    console.log("🔄 Iniciando criação/migração da tabela service_locations...");

    // Criar tabela se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_locations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ Tabela service_locations criada/verificada");

    // Verificar se a coluna state existe
    const { rows: stateColumn } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'service_locations'
      AND column_name = 'state';
    `);

    if (stateColumn.length === 0) {
      await pool.query(`
        ALTER TABLE service_locations
        ADD COLUMN state VARCHAR(2);
      `);
      console.log("✅ Coluna 'state' adicionada");

      // Atualizar registros existentes com um valor padrão
      await pool.query(`
        UPDATE service_locations
        SET state = 'BR'
        WHERE state IS NULL;
      `);
      console.log("✅ Registros existentes atualizados com estado padrão");

      // Tornar a coluna NOT NULL após atualizar os registros
      await pool.query(`
        ALTER TABLE service_locations
        ALTER COLUMN state SET NOT NULL;
      `);
      console.log("✅ Coluna 'state' definida como NOT NULL");
    }

    // Verificar se as colunas antigas existem antes de remover
    const { rows } = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'service_locations'
      AND column_name IN ('currency_code', 'currency_symbol', 'timezone');
    `);

    if (rows.length > 0) {
      const columnsToRemove = rows.map(row => row.column_name).join(', ');
      await pool.query(`
        ALTER TABLE service_locations
        DROP COLUMN IF EXISTS currency_code,
        DROP COLUMN IF EXISTS currency_symbol,
        DROP COLUMN IF EXISTS timezone;
      `);
      console.log(`✅ Colunas antigas removidas: ${columnsToRemove}`);
    }

    console.log("✅ Migração concluída com sucesso!");
  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    console.error("Stack:", error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateCities();
