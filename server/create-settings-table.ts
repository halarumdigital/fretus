import "dotenv/config";
import { pool } from "./db";

async function createSettingsTable() {
  try {
    console.log("🔧 Criando tabela de configurações...\n");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Driver Assignment
        driver_assignment_type VARCHAR(20) NOT NULL DEFAULT 'one_by_one',
        driver_search_radius NUMERIC(10, 2) NOT NULL DEFAULT 10,
        min_time_to_find_driver INTEGER NOT NULL DEFAULT 120,
        driver_acceptance_timeout INTEGER NOT NULL DEFAULT 30,

        -- Pricing
        can_round_trip_values BOOLEAN NOT NULL DEFAULT true,
        admin_commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 20,

        -- OTP Settings
        enable_otp_for_login BOOLEAN NOT NULL DEFAULT false,
        enable_otp_for_registration BOOLEAN NOT NULL DEFAULT false,

        -- Payment Gateway (Asaas/Efi)
        payment_gateway VARCHAR(20) DEFAULT 'asaas',
        asaas_api_key TEXT,
        asaas_environment VARCHAR(20) DEFAULT 'sandbox',
        efi_client_id TEXT,
        efi_client_secret TEXT,
        efi_certificate TEXT,
        efi_environment VARCHAR(20) DEFAULT 'sandbox',

        -- Referral System
        enable_referral_system BOOLEAN NOT NULL DEFAULT true,
        referral_bonus_amount NUMERIC(10, 2) DEFAULT 10,
        referral_minimum_trips INTEGER DEFAULT 1,

        -- Map Configuration
        map_provider VARCHAR(20) NOT NULL DEFAULT 'google',
        google_maps_api_key TEXT,

        -- Firebase Configuration
        firebase_project_id TEXT,
        firebase_client_email TEXT,
        firebase_private_key TEXT,
        firebase_database_url TEXT,

        -- SMTP Configuration
        smtp_host VARCHAR(255),
        smtp_port INTEGER DEFAULT 587,
        smtp_user VARCHAR(255),
        smtp_password TEXT,
        smtp_from_email VARCHAR(255),
        smtp_from_name VARCHAR(255),
        smtp_secure BOOLEAN DEFAULT true,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("✅ Tabela 'settings' criada com sucesso!");

    // Insert default settings if table is empty
    const result = await pool.query("SELECT COUNT(*) FROM settings");
    const count = parseInt(result.rows[0].count);

    if (count === 0) {
      await pool.query(`
        INSERT INTO settings (
          driver_assignment_type,
          driver_search_radius,
          min_time_to_find_driver,
          driver_acceptance_timeout,
          can_round_trip_values,
          admin_commission_percentage,
          enable_otp_for_login,
          enable_otp_for_registration,
          payment_gateway,
          enable_referral_system,
          referral_bonus_amount,
          referral_minimum_trips,
          map_provider
        ) VALUES (
          'one_by_one',
          10,
          120,
          30,
          true,
          20,
          false,
          false,
          'asaas',
          true,
          10,
          1,
          'google'
        )
      `);
      console.log("✅ Configurações padrão inseridas!");
    }

  } catch (error) {
    console.error("❌ Erro:", error);
    throw error;
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createSettingsTable();
