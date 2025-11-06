import "dotenv/config";
import { pool } from "./db";

async function checkDatabase() {
  try {
    console.log("🔍 Verificando conexão com o banco de dados...\n");

    // Testar conexão
    const client = await pool.connect();
    console.log("✅ Conexão estabelecida com sucesso!");

    // Verificar DATABASE_URL
    console.log("\n📋 Configurações:");
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);

    // Verificar o banco atual
    const dbResult = await client.query("SELECT current_database(), current_schema()");
    console.log(`\n🗄️  Banco de dados atual: ${dbResult.rows[0].current_database}`);
    console.log(`   Schema atual: ${dbResult.rows[0].current_schema}`);

    // Listar todas as tabelas no schema public
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`\n📊 Tabelas no schema 'public':`);
    if (tablesResult.rows.length === 0) {
      console.log("   ⚠️  Nenhuma tabela encontrada!");
    } else {
      tablesResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.tablename}`);
      });
    }

    // Verificar especificamente a tabela users
    const usersTableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
      );
    `);

    console.log(`\n👤 Tabela 'users' existe: ${usersTableResult.rows[0].exists ? "✅ SIM" : "❌ NÃO"}`);

    // Se a tabela users existir, mostrar estrutura
    if (usersTableResult.rows[0].exists) {
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
        ORDER BY ordinal_position
      `);

      console.log("\n📋 Estrutura da tabela 'users':");
      columnsResult.rows.forEach((col) => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });

      // Contar registros
      const countResult = await client.query("SELECT COUNT(*) FROM users");
      console.log(`\n📊 Total de registros: ${countResult.rows[0].count}`);
    }

    client.release();

  } catch (error) {
    console.error("\n❌ Erro ao verificar banco de dados:", error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkDatabase();
