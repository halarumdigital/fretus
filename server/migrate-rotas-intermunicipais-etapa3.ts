#!/usr/bin/env node
/**
 * Migration: Rotas Intermunicipais - Etapa 3: Tabelas de Entregas e Viagens
 *
 * Esta migration cria:
 * 1. Tabela viagens_intermunicipais (viagens dos motoristas)
 * 2. Tabela entregas_intermunicipais (pedidos de entrega)
 */

import { pool } from './db';

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando Migration - Etapa 3: Tabelas de Entregas e Viagens');

    await client.query('BEGIN');

    // ========================================
    // TABELA: viagens_intermunicipais (CRIAR PRIMEIRO para evitar referência circular)
    // ========================================
    console.log("🚗 Criando tabela viagens_intermunicipais...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS viagens_intermunicipais (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Referências
        entregador_id VARCHAR NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
        rota_id VARCHAR NOT NULL REFERENCES rotas_intermunicipais(id),
        entregador_rota_id VARCHAR NOT NULL REFERENCES entregador_rotas(id),

        -- Data da viagem
        data_viagem DATE NOT NULL,

        -- Status da viagem
        status VARCHAR(30) NOT NULL DEFAULT 'agendada',
        -- Status possíveis:
        -- agendada: viagem criada quando motorista aceita entregas
        -- em_coleta: motorista iniciou coletas
        -- em_transito: motorista iniciou viagem para cidade destino
        -- em_entrega: motorista chegou no destino e está fazendo entregas
        -- concluida: todas as entregas foram concluídas
        -- cancelada: viagem cancelada

        -- Capacidade
        capacidade_pacotes_total INTEGER NOT NULL,
        capacidade_peso_kg_total NUMERIC(10,2) NOT NULL,
        pacotes_aceitos INTEGER DEFAULT 0,
        peso_aceito_kg NUMERIC(10,2) DEFAULT 0,

        -- Horários
        horario_saida_planejado TIME NOT NULL,
        horario_saida_real TIMESTAMP,
        horario_chegada_previsto TIMESTAMP,
        horario_chegada_real TIMESTAMP,

        -- Auditoria
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Restrições
        UNIQUE(entregador_id, rota_id, data_viagem),
        CONSTRAINT chk_capacidade_pacotes CHECK (capacidade_pacotes_total > 0),
        CONSTRAINT chk_capacidade_peso CHECK (capacidade_peso_kg_total > 0),
        CONSTRAINT chk_pacotes_aceitos CHECK (pacotes_aceitos >= 0 AND pacotes_aceitos <= capacidade_pacotes_total),
        CONSTRAINT chk_peso_aceito CHECK (peso_aceito_kg >= 0 AND peso_aceito_kg <= capacidade_peso_kg_total)
      );

      CREATE INDEX IF NOT EXISTS idx_viagens_inter_entregador ON viagens_intermunicipais(entregador_id);
      CREATE INDEX IF NOT EXISTS idx_viagens_inter_rota ON viagens_intermunicipais(rota_id);
      CREATE INDEX IF NOT EXISTS idx_viagens_inter_data ON viagens_intermunicipais(data_viagem);
      CREATE INDEX IF NOT EXISTS idx_viagens_inter_status ON viagens_intermunicipais(status);
    `);
    console.log("✅ Tabela viagens_intermunicipais criada");

    // ========================================
    // TABELA: entregas_intermunicipais (CRIAR DEPOIS)
    // ========================================
    console.log("📦 Criando tabela entregas_intermunicipais...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS entregas_intermunicipais (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Referências
        empresa_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        rota_id VARCHAR NOT NULL REFERENCES rotas_intermunicipais(id),
        preco_id VARCHAR NOT NULL REFERENCES city_prices(id),

        -- Informações da entrega
        numero_pedido VARCHAR(50) UNIQUE NOT NULL,
        data_agendada DATE NOT NULL,

        -- Endereços
        endereco_coleta_completo TEXT NOT NULL,
        endereco_coleta_latitude VARCHAR(50),
        endereco_coleta_longitude VARCHAR(50),
        endereco_entrega_completo TEXT NOT NULL,
        endereco_entrega_latitude VARCHAR(50),
        endereco_entrega_longitude VARCHAR(50),

        -- Destinatário
        destinatario_nome VARCHAR(255) NOT NULL,
        destinatario_telefone VARCHAR(20) NOT NULL,

        -- Informações do pacote
        quantidade_pacotes INTEGER NOT NULL DEFAULT 1,
        peso_total_kg NUMERIC(10,2) NOT NULL,
        volume_total_m3 NUMERIC(10,3),
        descricao_conteudo TEXT,
        observacoes TEXT,

        -- Cálculo de preço (valores salvos no momento da criação)
        tarifa_base NUMERIC(10,2) NOT NULL,
        preco_por_km NUMERIC(10,2) NOT NULL,
        distancia_km NUMERIC(10,2) NOT NULL,
        valor_parada NUMERIC(10,2) DEFAULT 0,
        valor_total NUMERIC(10,2) NOT NULL,

        -- Status da entrega
        status VARCHAR(30) NOT NULL DEFAULT 'aguardando_motorista',
        -- Status possíveis:
        -- aguardando_motorista: aguardando motorista aceitar a viagem
        -- motorista_aceito: motorista aceitou, aguardando coleta
        -- (depois vai para viagem_coletas e viagem_entregas)

        -- Viagem associada (quando motorista aceita)
        viagem_id VARCHAR REFERENCES viagens_intermunicipais(id) ON DELETE SET NULL,

        -- Auditoria
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Restrições
        CONSTRAINT chk_quantidade_pacotes CHECK (quantidade_pacotes > 0),
        CONSTRAINT chk_peso_total CHECK (peso_total_kg > 0),
        CONSTRAINT chk_valor_total CHECK (valor_total >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_entregas_inter_empresa ON entregas_intermunicipais(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_entregas_inter_rota ON entregas_intermunicipais(rota_id);
      CREATE INDEX IF NOT EXISTS idx_entregas_inter_data ON entregas_intermunicipais(data_agendada);
      CREATE INDEX IF NOT EXISTS idx_entregas_inter_status ON entregas_intermunicipais(status);
      CREATE INDEX IF NOT EXISTS idx_entregas_inter_viagem ON entregas_intermunicipais(viagem_id);
    `);
    console.log("✅ Tabela entregas_intermunicipais criada");

    await client.query('COMMIT');

    console.log('\n✨ Migration Etapa 3 concluída com sucesso!\n');
    console.log('Criado:');
    console.log('  ✅ Tabela viagens_intermunicipais');
    console.log('  ✅ Tabela entregas_intermunicipais');
    console.log('  ✅ Índices de performance\n');

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
