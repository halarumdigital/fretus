import "dotenv/config";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("🌱 Iniciando seed do banco de dados...");

    // Habilitar extensões necessárias
    console.log("🔌 Habilitando extensões do PostgreSQL...");
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Verificar se a tabela existe, caso contrário criar
    console.log("📋 Verificando/criando tabela users...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        nome TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("✅ Tabela users criada/verificada com sucesso!");

    // Verificar se já existe um admin
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@fretus.com"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("⚠️  Usuário administrador já existe!");
      console.log("📧 Email: admin@fretus.com");
      return;
    }

    // Criar usuário administrador
    console.log("👤 Criando usuário administrador...");

    // Hash da senha antes de salvar
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const [admin] = await db
      .insert(users)
      .values({
        email: "admin@fretus.com",
        password: hashedPassword,
        nome: "Administrador",
        isAdmin: true,
      })
      .returning();

    console.log("✅ Usuário administrador criado com sucesso!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email: admin@fretus.com");
    console.log("🔑 Senha: admin123");
    console.log("👤 Nome:", admin.nome);
    console.log("🔐 Admin:", admin.isAdmin);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!");

  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
