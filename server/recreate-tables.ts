import "dotenv/config";
import { pool } from "./db";

async function recreateTables() {
  try {
    console.log("🗑️  Dropando tabelas antigas...\n");

    // Drop session table (from connect-pg-simple)
    await pool.query(`DROP TABLE IF EXISTS "session" CASCADE;`);
    console.log("✅ Tabela 'session' deletada");

    // Drop old users table if exists
    await pool.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
    console.log("✅ Tabela 'users' antiga deletada");

    console.log("\n✅ Tabelas antigas removidas!");
    console.log("Agora rode: npm run db:push");

  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

recreateTables();
