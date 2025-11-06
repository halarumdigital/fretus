import "dotenv/config";
import { pool } from "./db";

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW() as now, COUNT(*) as settings_count FROM settings");
    console.log("✅ Conexão com banco OK!");
    console.log("⏰ Horário do servidor:", result.rows[0].now);
    console.log("⚙️  Registros de configurações:", result.rows[0].settings_count);
  } catch (error: any) {
    console.error("❌ Erro ao conectar ao banco:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

testConnection();
