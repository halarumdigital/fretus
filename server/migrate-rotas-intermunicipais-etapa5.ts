#!/usr/bin/env node
/**
 * Migration: Rotas Intermunicipais - Etapa 5: Triggers e Funções Automáticas
 *
 * Esta migration cria:
 * 1. Trigger para atualizar automaticamente updated_at
 * 2. Trigger para atualizar capacidade da viagem quando entrega é aceita
 * 3. Trigger para atualizar status da entrega quando motorista aceita
 * 4. Função para criar automaticamente coletas e entregas quando viagem é criada
 */

import { pool } from './db';

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando Migration - Etapa 5: Triggers e Funções Automáticas');

    await client.query('BEGIN');

    // ========================================
    // 1. TRIGGER: Atualizar updated_at automaticamente
    // ========================================
    console.log("⚙️  Criando triggers para updated_at...");

    // Função genérica já existe, apenas criar triggers para novas tabelas
    await client.query(`
      -- Trigger para entregas_intermunicipais
      DROP TRIGGER IF EXISTS update_entregas_intermunicipais_updated_at ON entregas_intermunicipais;
      CREATE TRIGGER update_entregas_intermunicipais_updated_at
        BEFORE UPDATE ON entregas_intermunicipais
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Trigger para viagens_intermunicipais
      DROP TRIGGER IF EXISTS update_viagens_intermunicipais_updated_at ON viagens_intermunicipais;
      CREATE TRIGGER update_viagens_intermunicipais_updated_at
        BEFORE UPDATE ON viagens_intermunicipais
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Trigger para viagem_coletas
      DROP TRIGGER IF EXISTS update_viagem_coletas_updated_at ON viagem_coletas;
      CREATE TRIGGER update_viagem_coletas_updated_at
        BEFORE UPDATE ON viagem_coletas
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

      -- Trigger para viagem_entregas
      DROP TRIGGER IF EXISTS update_viagem_entregas_updated_at ON viagem_entregas;
      CREATE TRIGGER update_viagem_entregas_updated_at
        BEFORE UPDATE ON viagem_entregas
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log("✅ Triggers updated_at criados");

    // ========================================
    // 2. FUNÇÃO: Atualizar capacidade da viagem quando entrega é vinculada
    // ========================================
    console.log("⚙️  Criando função para atualizar capacidade da viagem...");

    await client.query(`
      -- Função para atualizar capacidade quando viagem_id é definida em entregas_intermunicipais
      CREATE OR REPLACE FUNCTION atualizar_capacidade_viagem()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Se viagem_id foi definida (motorista aceitou a entrega)
        IF NEW.viagem_id IS NOT NULL AND (OLD.viagem_id IS NULL OR OLD.viagem_id != NEW.viagem_id) THEN
          -- Atualizar capacidade da viagem
          UPDATE viagens_intermunicipais
          SET
            pacotes_aceitos = pacotes_aceitos + NEW.quantidade_pacotes,
            peso_aceito_kg = peso_aceito_kg + NEW.peso_total_kg,
            updated_at = NOW()
          WHERE id = NEW.viagem_id;

          -- Verificar se não excedeu a capacidade
          IF EXISTS (
            SELECT 1 FROM viagens_intermunicipais
            WHERE id = NEW.viagem_id
              AND (pacotes_aceitos > capacidade_pacotes_total
                OR peso_aceito_kg > capacidade_peso_kg_total)
          ) THEN
            RAISE EXCEPTION 'Capacidade da viagem excedida';
          END IF;

          -- Atualizar status da entrega para 'motorista_aceito'
          NEW.status = 'motorista_aceito';
        END IF;

        -- Se viagem_id foi removida (motorista cancelou)
        IF NEW.viagem_id IS NULL AND OLD.viagem_id IS NOT NULL THEN
          -- Reverter capacidade da viagem
          UPDATE viagens_intermunicipais
          SET
            pacotes_aceitos = pacotes_aceitos - OLD.quantidade_pacotes,
            peso_aceito_kg = peso_aceito_kg - OLD.peso_total_kg,
            updated_at = NOW()
          WHERE id = OLD.viagem_id;

          -- Voltar status para 'aguardando_motorista'
          NEW.status = 'aguardando_motorista';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Criar trigger
      DROP TRIGGER IF EXISTS trigger_atualizar_capacidade_viagem ON entregas_intermunicipais;
      CREATE TRIGGER trigger_atualizar_capacidade_viagem
        BEFORE UPDATE OF viagem_id ON entregas_intermunicipais
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_capacidade_viagem();
    `);

    console.log("✅ Função de capacidade criada");

    // ========================================
    // 3. FUNÇÃO: Criar coletas e entregas automaticamente quando motorista aceita
    // ========================================
    console.log("⚙️  Criando função para criar coletas e entregas automaticamente...");

    await client.query(`
      -- Função para criar registros de coleta e entrega quando viagem_id é definida
      CREATE OR REPLACE FUNCTION criar_coleta_entrega_automatica()
      RETURNS TRIGGER AS $$
      DECLARE
        v_ordem_coleta INTEGER;
        v_ordem_entrega INTEGER;
        v_coleta_id VARCHAR;
      BEGIN
        -- Apenas se viagem_id foi definida e não existia antes
        IF NEW.viagem_id IS NOT NULL AND (OLD.viagem_id IS NULL OR OLD.viagem_id != NEW.viagem_id) THEN

          -- Calcular próxima ordem de coleta para esta viagem
          SELECT COALESCE(MAX(ordem_coleta), 0) + 1
          INTO v_ordem_coleta
          FROM viagem_coletas
          WHERE viagem_id = NEW.viagem_id;

          -- Criar registro de coleta
          INSERT INTO viagem_coletas (
            viagem_id,
            entrega_id,
            endereco_coleta,
            latitude,
            longitude,
            status,
            ordem_coleta
          ) VALUES (
            NEW.viagem_id,
            NEW.id,
            NEW.endereco_coleta_completo,
            NEW.endereco_coleta_latitude,
            NEW.endereco_coleta_longitude,
            'pendente',
            v_ordem_coleta
          ) RETURNING id INTO v_coleta_id;

          -- Calcular próxima ordem de entrega para esta viagem
          SELECT COALESCE(MAX(ordem_entrega), 0) + 1
          INTO v_ordem_entrega
          FROM viagem_entregas
          WHERE viagem_id = NEW.viagem_id;

          -- Criar registro de entrega
          INSERT INTO viagem_entregas (
            viagem_id,
            entrega_id,
            coleta_id,
            endereco_entrega,
            latitude,
            longitude,
            destinatario_nome,
            destinatario_telefone,
            status,
            ordem_entrega
          ) VALUES (
            NEW.viagem_id,
            NEW.id,
            v_coleta_id,
            NEW.endereco_entrega_completo,
            NEW.endereco_entrega_latitude,
            NEW.endereco_entrega_longitude,
            NEW.destinatario_nome,
            NEW.destinatario_telefone,
            'pendente',
            v_ordem_entrega
          );

        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Criar trigger (executar APÓS atualização de capacidade)
      DROP TRIGGER IF EXISTS trigger_criar_coleta_entrega ON entregas_intermunicipais;
      CREATE TRIGGER trigger_criar_coleta_entrega
        AFTER UPDATE OF viagem_id ON entregas_intermunicipais
        FOR EACH ROW
        EXECUTE FUNCTION criar_coleta_entrega_automatica();
    `);

    console.log("✅ Função de criação automática criada");

    // ========================================
    // 4. FUNÇÃO: Validar status da viagem com base nas coletas/entregas
    // ========================================
    console.log("⚙️  Criando função para validar status da viagem...");

    await client.query(`
      -- Função para atualizar status da viagem baseado nas coletas e entregas
      CREATE OR REPLACE FUNCTION atualizar_status_viagem()
      RETURNS TRIGGER AS $$
      DECLARE
        v_total_coletas INTEGER;
        v_coletas_pendentes INTEGER;
        v_coletas_coletadas INTEGER;
        v_total_entregas INTEGER;
        v_entregas_pendentes INTEGER;
        v_entregas_entregues INTEGER;
      BEGIN
        -- Contar coletas
        SELECT
          COUNT(*),
          COUNT(*) FILTER (WHERE status = 'pendente'),
          COUNT(*) FILTER (WHERE status = 'coletado')
        INTO v_total_coletas, v_coletas_pendentes, v_coletas_coletadas
        FROM viagem_coletas
        WHERE viagem_id = COALESCE(NEW.viagem_id, OLD.viagem_id);

        -- Contar entregas
        SELECT
          COUNT(*),
          COUNT(*) FILTER (WHERE status = 'pendente'),
          COUNT(*) FILTER (WHERE status = 'entregue')
        INTO v_total_entregas, v_entregas_pendentes, v_entregas_entregues
        FROM viagem_entregas
        WHERE viagem_id = COALESCE(NEW.viagem_id, OLD.viagem_id);

        -- Atualizar status da viagem
        UPDATE viagens_intermunicipais
        SET status = CASE
          -- Todas entregas concluídas
          WHEN v_entregas_entregues = v_total_entregas AND v_total_entregas > 0 THEN 'concluida'
          -- Há entregas em andamento
          WHEN v_entregas_pendentes < v_total_entregas THEN 'em_entrega'
          -- Todas coletas feitas, nenhuma entrega ainda
          WHEN v_coletas_coletadas = v_total_coletas AND v_total_coletas > 0 THEN 'em_transito'
          -- Há coletas em andamento
          WHEN v_coletas_pendentes < v_total_coletas THEN 'em_coleta'
          -- Status padrão
          ELSE status
        END,
        updated_at = NOW()
        WHERE id = COALESCE(NEW.viagem_id, OLD.viagem_id);

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Triggers para coletas
      DROP TRIGGER IF EXISTS trigger_atualizar_status_viagem_coleta ON viagem_coletas;
      CREATE TRIGGER trigger_atualizar_status_viagem_coleta
        AFTER INSERT OR UPDATE OF status ON viagem_coletas
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_status_viagem();

      -- Triggers para entregas
      DROP TRIGGER IF EXISTS trigger_atualizar_status_viagem_entrega ON viagem_entregas;
      CREATE TRIGGER trigger_atualizar_status_viagem_entrega
        AFTER INSERT OR UPDATE OF status ON viagem_entregas
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_status_viagem();
    `);

    console.log("✅ Função de validação de status criada");

    await client.query('COMMIT');

    console.log('\n✨ Migration Etapa 5 concluída com sucesso!\n');
    console.log('Criado:');
    console.log('  ✅ Triggers de updated_at para todas as tabelas');
    console.log('  ✅ Função de atualização automática de capacidade');
    console.log('  ✅ Função de criação automática de coletas e entregas');
    console.log('  ✅ Função de validação de status da viagem\n');
    console.log('🎉 Sistema de rotas intermunicipais completamente configurado!\n');

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
