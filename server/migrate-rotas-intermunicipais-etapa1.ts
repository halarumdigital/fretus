#!/usr/bin/env node
/**
 * Migration: Rotas Intermunicipais - Etapa 1: Tabelas Base
 *
 * Esta migration cria:
 * 1. Tabela rotas_intermunicipais (rotas entre cidades)
 * 2. Altera tabela city_prices para suportar rotas intermunicipais
 *
 * Nota: A tabela service_locations (cidades) já existe
 */

import { pool } from './db';

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando Migration - Etapa 1: Tabelas Base');

    await client.query('BEGIN');

    // ========================================
    // 1. CRIAR TABELA: rotas_intermunicipais
    // ========================================
    console.log('📋 Criando tabela rotas_intermunicipais...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS rotas_intermunicipais (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Rota
        nome_rota VARCHAR(255) NOT NULL,
        cidade_origem_id VARCHAR NOT NULL REFERENCES service_locations(id),
        cidade_destino_id VARCHAR NOT NULL REFERENCES service_locations(id),

        -- Dados calculados (via Google Maps ou manual)
        distancia_km NUMERIC(10,2) NOT NULL,
        tempo_medio_minutos INTEGER NOT NULL,

        -- Status
        ativa BOOLEAN NOT NULL DEFAULT true,

        -- Timestamps
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Validações
        CHECK (cidade_origem_id != cidade_destino_id)
      )
    `);

    // Índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rotas_inter_origem
        ON rotas_intermunicipais(cidade_origem_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rotas_inter_destino
        ON rotas_intermunicipais(cidade_destino_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rotas_inter_ativa
        ON rotas_intermunicipais(ativa)
    `);

    console.log('✅ Tabela rotas_intermunicipais criada com sucesso');

    // ========================================
    // 2. ALTERAR TABELA: city_prices
    // ========================================
    console.log('📋 Alterando tabela city_prices para suportar rotas...');

    // Adicionar campo tipo
    await client.query(`
      ALTER TABLE city_prices
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'entrega_rapida'
    `);

    // Adicionar campo rota_id (opcional, só usado quando tipo = 'rota_intermunicipal')
    await client.query(`
      ALTER TABLE city_prices
      ADD COLUMN IF NOT EXISTS rota_intermunicipal_id VARCHAR
        REFERENCES rotas_intermunicipais(id)
    `);

    // Adicionar check constraint
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'city_prices_tipo_check'
        ) THEN
          ALTER TABLE city_prices
          ADD CONSTRAINT city_prices_tipo_check
          CHECK (tipo IN ('entrega_rapida', 'rota_intermunicipal'));
        END IF;
      END $$;
    `);

    // Índice para facilitar queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_city_prices_tipo
        ON city_prices(tipo)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_city_prices_rota
        ON city_prices(rota_intermunicipal_id)
    `);

    console.log('✅ Tabela city_prices alterada com sucesso');

    // ========================================
    // 3. TRIGGER: updated_at automático
    // ========================================
    console.log('📋 Criando trigger para updated_at...');

    // Função genérica (se não existir)
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Trigger para rotas_intermunicipais
    await client.query(`
      DROP TRIGGER IF EXISTS update_rotas_intermunicipais_updated_at
        ON rotas_intermunicipais;

      CREATE TRIGGER update_rotas_intermunicipais_updated_at
        BEFORE UPDATE ON rotas_intermunicipais
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Trigger created_at criado com sucesso');

    await client.query('COMMIT');

    console.log('\n✨ Migration Etapa 1 concluída com sucesso!\n');
    console.log('Criado:');
    console.log('  ✅ Tabela rotas_intermunicipais');
    console.log('  ✅ Alteração em city_prices (tipo + rota_intermunicipal_id)');
    console.log('  ✅ Índices de performance');
    console.log('  ✅ Trigger updated_at\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar migration
migrate()
  .then(() => {
    console.log('🎉 Migration finalizada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha na migration:', error);
    process.exit(1);
  });
