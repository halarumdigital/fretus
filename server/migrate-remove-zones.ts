import "dotenv/config";
import { pool } from "./db";

async function migrateRemoveZones() {
  try {
    console.log("🔄 Iniciando migração: Remover zonas e criar city_prices...\n");

    // 1. Criar nova tabela city_prices
    console.log("📝 Criando tabela city_prices...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS city_prices (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        service_location_id VARCHAR NOT NULL REFERENCES service_locations(id),
        vehicle_type_id VARCHAR NOT NULL REFERENCES vehicle_types(id),

        -- Payment Methods
        payment_type VARCHAR(20) NOT NULL DEFAULT 'cash',

        -- Pricing
        base_price NUMERIC(10, 2) NOT NULL,
        price_per_distance NUMERIC(10, 2) NOT NULL,
        price_per_time NUMERIC(10, 2) NOT NULL,
        base_distance NUMERIC(10, 2) NOT NULL DEFAULT 0,

        -- Waiting Charges
        waiting_charge_per_minute NUMERIC(10, 2) DEFAULT 0,
        free_waiting_time_mins INTEGER DEFAULT 5,

        -- Cancellation
        cancellation_fee NUMERIC(10, 2) DEFAULT 0,

        -- Service Tax
        service_tax NUMERIC(5, 2) DEFAULT 0,

        -- Commissions (Admin)
        admin_commision_type VARCHAR(20) NOT NULL DEFAULT 'percentage',
        admin_commision NUMERIC(10, 2) NOT NULL DEFAULT 20,

        -- Surge Pricing
        surge_pricing BOOLEAN NOT NULL DEFAULT false,
        peak_hour_start VARCHAR(5),
        peak_hour_end VARCHAR(5),
        peak_hour_multiplier NUMERIC(3, 2) DEFAULT 1,

        active BOOLEAN NOT NULL DEFAULT true,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Constraint única: uma cidade pode ter apenas um preço por categoria
        UNIQUE(service_location_id, vehicle_type_id)
      );
    `);
    console.log("✅ Tabela city_prices criada\n");

    // 2. Migrar dados de zone_types para city_prices (se houver)
    console.log("📝 Verificando dados para migrar...");
    const { rows: zoneTypesData } = await pool.query(`
      SELECT
        zt.*,
        z.service_location_id
      FROM zone_types zt
      INNER JOIN zones z ON zt.zone_id = z.id
    `);

    if (zoneTypesData.length > 0) {
      console.log(`📦 Migrando ${zoneTypesData.length} registro(s) de zone_types para city_prices...`);

      for (const row of zoneTypesData) {
        // Verificar se já existe
        const { rows: existing } = await pool.query(`
          SELECT id FROM city_prices
          WHERE service_location_id = $1 AND vehicle_type_id = $2
        `, [row.service_location_id, row.vehicle_type_id]);

        if (existing.length === 0) {
          await pool.query(`
            INSERT INTO city_prices (
              service_location_id,
              vehicle_type_id,
              payment_type,
              base_price,
              price_per_distance,
              price_per_time,
              base_distance,
              waiting_charge_per_minute,
              free_waiting_time_mins,
              cancellation_fee,
              service_tax,
              admin_commision_type,
              admin_commision,
              surge_pricing,
              peak_hour_start,
              peak_hour_end,
              peak_hour_multiplier,
              active,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          `, [
            row.service_location_id,
            row.vehicle_type_id,
            row.payment_type,
            row.base_price,
            row.price_per_distance,
            row.price_per_time,
            row.base_distance,
            row.waiting_charge_per_minute,
            row.free_waiting_time_mins,
            row.cancellation_fee,
            row.service_tax,
            row.admin_commision_type,
            row.admin_commision,
            row.surge_pricing,
            row.peak_hour_start,
            row.peak_hour_end,
            row.peak_hour_multiplier,
            row.active,
            row.created_at,
            row.updated_at
          ]);
        }
      }
      console.log("✅ Dados migrados com sucesso\n");
    } else {
      console.log("ℹ️  Nenhum dado para migrar\n");
    }

    // 3. Remover tabelas antigas
    console.log("🗑️  Removendo tabelas antigas...");
    await pool.query("DROP TABLE IF EXISTS zone_types CASCADE");
    console.log("✅ Tabela zone_types removida");

    await pool.query("DROP TABLE IF EXISTS zones CASCADE");
    console.log("✅ Tabela zones removida");

    console.log("\n✅ Migração concluída com sucesso!");

  } catch (error: any) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateRemoveZones();
