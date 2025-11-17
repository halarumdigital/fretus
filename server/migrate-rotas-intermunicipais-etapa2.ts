#!/usr/bin/env node
/**
 * Migration: Rotas Intermunicipais - Etapa 2: Tabelas do Entregador
 *
 * Esta migration cria:
 * 1. Tabela entregador_rotas (rotas que o entregador faz + capacidade)
 * 2. Tabela entregador_capacidade_diaria (controle diário de pacotes aceitos)
 */

import { pool } from './db';

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando Migration - Etapa 2: Tabelas do Entregador');

    await client.query('BEGIN');

    // ========================================
    // 1. CRIAR TABELA: entregador_rotas
    // ========================================
    console.log('📋 Criando tabela entregador_rotas...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS entregador_rotas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Relacionamentos
        entregador_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        rota_id VARCHAR NOT NULL REFERENCES rotas_intermunicipais(id) ON DELETE CASCADE,

        -- Disponibilidade
        dias_semana INTEGER[] NOT NULL, -- [1,2,3,4,5] = Seg a Sex (1=Domingo, 7=Sábado)
        horario_saida TIME NOT NULL,
        horario_chegada TIME,

        -- Capacidades definidas pelo entregador
        capacidade_pacotes INTEGER NOT NULL,
        capacidade_peso_kg NUMERIC(10,2) NOT NULL,
        capacidade_volume_m3 NUMERIC(10,3),

        -- Configurações
        aceita_multiplas_coletas BOOLEAN DEFAULT true,
        aceita_multiplas_entregas BOOLEAN DEFAULT true,
        raio_coleta_km NUMERIC(10,2),

        -- Status
        ativa BOOLEAN DEFAULT true,

        -- Timestamps
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Constraints
        UNIQUE(entregador_id, rota_id),
        CHECK (capacidade_pacotes > 0),
        CHECK (capacidade_peso_kg > 0)
      )
    `);

    // Índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entregador_rotas_entregador
        ON entregador_rotas(entregador_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entregador_rotas_rota
        ON entregador_rotas(rota_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entregador_rotas_ativas
        ON entregador_rotas(ativa)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entregador_rotas_dias
        ON entregador_rotas USING GIN(dias_semana)
    `);

    console.log('✅ Tabela entregador_rotas criada com sucesso');

    // ========================================
    // 2. CRIAR TABELA: entregador_capacidade_diaria
    // ========================================
    console.log('📋 Criando tabela entregador_capacidade_diaria...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS entregador_capacidade_diaria (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Relacionamentos
        entregador_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        rota_id VARCHAR NOT NULL REFERENCES rotas_intermunicipais(id) ON DELETE CASCADE,
        data DATE NOT NULL,

        -- Capacidade total (copiada da tabela entregador_rotas)
        capacidade_total_pacotes INTEGER NOT NULL,
        capacidade_total_peso_kg NUMERIC(10,2) NOT NULL,

        -- Já aceito/usado
        pacotes_aceitos INTEGER DEFAULT 0,
        peso_aceito_kg NUMERIC(10,2) DEFAULT 0,
        volume_aceito_m3 NUMERIC(10,3) DEFAULT 0,

        -- Contador de entregas
        entregas_aceitas INTEGER DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Constraints
        UNIQUE(entregador_id, rota_id, data),
        CHECK (pacotes_aceitos <= capacidade_total_pacotes),
        CHECK (peso_aceito_kg <= capacidade_total_peso_kg),
        CHECK (pacotes_aceitos >= 0),
        CHECK (peso_aceito_kg >= 0),
        CHECK (entregas_aceitas >= 0)
      )
    `);

    // Índices para performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_capacidade_diaria_entregador
        ON entregador_capacidade_diaria(entregador_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_capacidade_diaria_data
        ON entregador_capacidade_diaria(data)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_capacidade_diaria_rota
        ON entregador_capacidade_diaria(rota_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_capacidade_diaria_entregador_data
        ON entregador_capacidade_diaria(entregador_id, data)
    `);

    console.log('✅ Tabela entregador_capacidade_diaria criada com sucesso');

    // ========================================
    // 3. TRIGGER: updated_at para entregador_rotas
    // ========================================
    console.log('📋 Criando triggers...');

    await client.query(`
      DROP TRIGGER IF EXISTS update_entregador_rotas_updated_at
        ON entregador_rotas;

      CREATE TRIGGER update_entregador_rotas_updated_at
        BEFORE UPDATE ON entregador_rotas
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_entregador_capacidade_diaria_updated_at
        ON entregador_capacidade_diaria;

      CREATE TRIGGER update_entregador_capacidade_diaria_updated_at
        BEFORE UPDATE ON entregador_capacidade_diaria
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Triggers criados com sucesso');

    await client.query('COMMIT');

    console.log('\n✨ Migration Etapa 2 concluída com sucesso!\n');
    console.log('Criado:');
    console.log('  ✅ Tabela entregador_rotas (rotas + capacidade)');
    console.log('  ✅ Tabela entregador_capacidade_diaria (controle diário)');
    console.log('  ✅ Índices de performance');
    console.log('  ✅ Triggers updated_at\n');

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
