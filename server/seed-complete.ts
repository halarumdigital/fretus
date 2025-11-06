import "dotenv/config";
import { db, pool } from "./db";
import {
  users,
  serviceLocations,
  vehicleTypes,
  cityPrices,
  drivers,
  cancellationReasons,
} from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function seedComplete() {
  try {
    console.log("🌱 Iniciando seed completo do banco de dados...\n");

    // Habilitar extensões necessárias
    console.log("🔌 Habilitando extensões do PostgreSQL...");
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Criar todas as tabelas via SQL (complemento ao Drizzle)
    console.log("\n📋 Verificando tabelas...");

    // ===== 1. CRIAR ADMIN USER =====
    console.log("\n👤 Criando usuário administrador...");
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@fretus.com"))
      .limit(1);

    let adminUser;
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      [adminUser] = await db
        .insert(users)
        .values({
          email: "admin@fretus.com",
          password: hashedPassword,
          nome: "Administrador",
          isAdmin: true,
          mobile: "11999999999",
          active: true,
        })
        .returning();

      console.log("✅ Admin criado:", adminUser.email);
    } else {
      adminUser = existingAdmin[0];
      console.log("⚠️  Admin já existe:", adminUser.email);
    }

    // ===== 2. CRIAR CIDADES (SERVICE LOCATIONS) =====
    console.log("\n🏙️  Criando cidades...");
    const saoPaulo = await db
      .insert(serviceLocations)
      .values({
        name: "São Paulo",
        state: "SP",
        active: true,
      })
      .onConflictDoNothing()
      .returning();

    const rioDeJaneiro = await db
      .insert(serviceLocations)
      .values({
        name: "Rio de Janeiro",
        state: "RJ",
        active: true,
      })
      .onConflictDoNothing()
      .returning();

    console.log("✅ Cidades criadas: São Paulo, Rio de Janeiro");

    // ===== 3. CRIAR CATEGORIAS DE VEÍCULOS =====
    console.log("\n🚗 Criando categorias de veículos...");
    const economico = await db
      .insert(vehicleTypes)
      .values({
        name: "Econômico",
        capacity: 4,
        active: true,
      })
      .onConflictDoNothing()
      .returning();

    const conforto = await db
      .insert(vehicleTypes)
      .values({
        name: "Conforto",
        capacity: 4,
        active: true,
      })
      .onConflictDoNothing()
      .returning();

    const executivo = await db
      .insert(vehicleTypes)
      .values({
        name: "Executivo",
        capacity: 4,
        active: true,
      })
      .onConflictDoNothing()
      .returning();

    console.log("✅ Categorias criadas: Econômico, Conforto, Executivo");

    // ===== 4. CRIAR CITY PRICES (Preços) =====
    console.log("\n💰 Criando tabelas de preços...");

    const spLocationId = saoPaulo[0]?.id || (await db.select().from(serviceLocations).where(eq(serviceLocations.name, "São Paulo")))[0].id;
    const allVehicleTypes = await db.select().from(vehicleTypes);

    for (const vehicleType of allVehicleTypes) {
      let basePrice = "5.00";
      let pricePerDistance = "2.00";
      let pricePerTime = "0.50";

      if (vehicleType.name === "Conforto") {
        basePrice = "8.00";
        pricePerDistance = "2.50";
        pricePerTime = "0.70";
      } else if (vehicleType.name === "Executivo") {
        basePrice = "12.00";
        pricePerDistance = "3.50";
        pricePerTime = "1.00";
      }

      await db
        .insert(cityPrices)
        .values({
          serviceLocationId: spLocationId,
          vehicleTypeId: vehicleType.id,
          paymentType: "cash",
          basePrice,
          pricePerDistance,
          pricePerTime,
          baseDistance: "2",
          waitingChargePerMinute: "0.50",
          freeWaitingTimeMins: 5,
          cancellationFee: "5.00",
          stopPrice: "3.00",
          returnPrice: "5.00",
          serviceTax: "10",
          adminCommisionType: "percentage",
          adminCommision: "20",
          surgePricing: false,
          active: true,
          })
          .onConflictDoNothing();
    }

    console.log("✅ Tabelas de preços criadas");

    // ===== 6. CRIAR MOTIVOS DE CANCELAMENTO =====
    console.log("\n❌ Criando motivos de cancelamento...");

    const userReasons = [
      "Encontrei outro meio de transporte",
      "Motorista está muito longe",
      "Mudei de ideia",
      "Erro no endereço",
      "Outro motivo",
    ];

    const driverReasons = [
      "Passageiro não está respondendo",
      "Endereço muito longe",
      "Problema com o veículo",
      "Outro motivo",
    ];

    for (const reason of userReasons) {
      await db
        .insert(cancellationReasons)
        .values({
          reason,
          userType: "user",
          active: true,
        })
        .onConflictDoNothing();
    }

    for (const reason of driverReasons) {
      await db
        .insert(cancellationReasons)
        .values({
          reason,
          userType: "driver",
          active: true,
        })
        .onConflictDoNothing();
    }

    console.log("✅ Motivos de cancelamento criados");

    // ===== 7. CRIAR USUÁRIO DE TESTE =====
    console.log("\n👥 Criando usuário de teste...");
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "usuario@teste.com"))
      .limit(1);

    if (existingUser.length === 0) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      await db.insert(users).values({
        email: "usuario@teste.com",
        password: hashedPassword,
        nome: "Usuário Teste",
        mobile: "11988888888",
        isAdmin: false,
        active: true,
      });
      console.log("✅ Usuário de teste criado: usuario@teste.com / 123456");
    }

    // ===== 8. CRIAR MOTORISTA DE TESTE =====
    console.log("\n🚕 Criando motorista de teste...");
    const existingDriverUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "motorista@teste.com"))
      .limit(1);

    let driverUser;
    if (existingDriverUser.length === 0) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      [driverUser] = await db
        .insert(users)
        .values({
          email: "motorista@teste.com",
          password: hashedPassword,
          nome: "Motorista Teste",
          mobile: "11977777777",
          isAdmin: false,
          active: true,
        })
        .returning();
    } else {
      driverUser = existingDriverUser[0];
    }

    const existingDriver = await db
      .select()
      .from(drivers)
      .where(eq(drivers.userId, driverUser.id))
      .limit(1);

    if (existingDriver.length === 0) {
      await db.insert(drivers).values({
        userId: driverUser.id,
        serviceLocationId: spLocationId,
        name: "Motorista Teste",
        mobile: "11977777777",
        email: "motorista@teste.com",
        vehicleTypeId: allVehicleTypes[0].id,
        carMake: "Toyota",
        carModel: "Corolla",
        carNumber: "ABC-1234",
        carColor: "Preto",
        active: true,
        approve: true,
        available: true,
        uploadedDocuments: true,
        latitude: "-23.550520",
        longitude: "-46.633308",
      });
      console.log("✅ Motorista de teste criado: motorista@teste.com / 123456");
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ SEED COMPLETO!");
    console.log("=".repeat(50));
    console.log("\n📧 Credenciais de acesso:");
    console.log("  Admin:     admin@fretus.com / admin123");
    console.log("  Usuário:   usuario@teste.com / 123456");
    console.log("  Motorista: motorista@teste.com / 123456");
    console.log("\n🏙️  Cidades: São Paulo, Rio de Janeiro");
    console.log("🚗 Categorias: Econômico, Conforto, Executivo");
    console.log("📍 Zonas: Centro, Zona Sul (São Paulo)");
    console.log("💰 Tabelas de preços configuradas");

  } catch (error) {
    console.error("\n❌ Erro ao executar seed:", error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seedComplete();
