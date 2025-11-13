import { Pool } from 'pg';
import { config } from 'dotenv';

config();

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev';

const pool = new Pool({
  connectionString: dbUrl,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const createTable = `
CREATE TABLE IF NOT EXISTS push_notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data TEXT,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR,
    target_city_id VARCHAR REFERENCES service_locations(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    total_recipients INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    sent_by VARCHAR REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP
);`;

async function run() {
  try {
    await pool.query(createTable);
    console.log('Tabela push_notifications criada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

run();