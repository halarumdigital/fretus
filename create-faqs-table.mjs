import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev"
});

async function createFaqsTable() {
  try {
    // Criar tabela FAQs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faqs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        target VARCHAR(20) NOT NULL CHECK (target IN ('driver', 'company')),
        display_order INTEGER DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by VARCHAR REFERENCES users(id),
        updated_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela FAQs criada com sucesso!');

    // Criar índices
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faqs_target ON faqs(target)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order)`);
    console.log('✅ Índices criados com sucesso!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabela FAQs:', error.message);
    process.exit(1);
  }
}

createFaqsTable();