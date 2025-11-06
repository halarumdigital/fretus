import "dotenv/config";
import { db, pool } from "./db";
import { users } from "@shared/schema";

async function listUsers() {
  try {
    console.log("📋 Listando usuários do banco de dados...\n");

    const allUsers = await db.select().from(users);

    if (allUsers.length === 0) {
      console.log("⚠️  Nenhum usuário encontrado no banco de dados.");
      return;
    }

    console.log(`✅ Total de usuários: ${allUsers.length}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    allUsers.forEach((user, index) => {
      console.log(`\n👤 Usuário ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nome: ${user.nome}`);
      console.log(`   🔐 Admin: ${user.isAdmin ? "Sim" : "Não"}`);
      console.log(`   📅 Criado em: ${user.createdAt?.toLocaleString('pt-BR')}`);
      console.log("   ─────────────────────────────────────────────────────────");
    });

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ Erro ao listar usuários:", error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

listUsers();
