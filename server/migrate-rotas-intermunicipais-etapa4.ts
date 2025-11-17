#!/usr/bin/env node
/**
 * Migration: Rotas Intermunicipais - Etapa 4: Tabelas de Controle de Coletas e Entregas
 *
 * Esta migration cria:
 * 1. Tabela viagem_coletas (registro de cada coleta na viagem)
 * 2. Tabela viagem_entregas (registro de cada entrega na viagem)
 */

import { pool } from './db';

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Iniciando Migration - Etapa 4: Tabelas de Controle de Coletas e Entregas');

    await client.query('BEGIN');

    // ========================================
    // TABELA: viagem_coletas
    // ========================================
    console.log("📦 Criando tabela viagem_coletas...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS viagem_coletas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Referências
        viagem_id VARCHAR NOT NULL REFERENCES viagens_intermunicipais(id) ON DELETE CASCADE,
        entrega_id VARCHAR NOT NULL REFERENCES entregas_intermunicipais(id) ON DELETE CASCADE,

        -- Informações da coleta
        endereco_coleta TEXT NOT NULL,
        latitude VARCHAR(50),
        longitude VARCHAR(50),

        -- Status da coleta
        status VARCHAR(30) NOT NULL DEFAULT 'pendente',
        -- Status possíveis:
        -- pendente: aguardando motorista iniciar a coleta
        -- a_caminho: motorista está indo para o local de coleta
        -- chegou: motorista chegou no local
        -- coletado: pacote foi coletado com sucesso
        -- falhou: falha na coleta (cliente ausente, etc)

        -- Ordem de coleta na rota
        ordem_coleta INTEGER NOT NULL,

        -- Horários
        horario_previsto TIMESTAMP,
        horario_chegada TIMESTAMP,
        horario_coleta TIMESTAMP,

        -- Informações adicionais
        observacoes TEXT,
        motivo_falha TEXT,

        -- Foto do pacote coletado
        foto_comprovante_url TEXT,

        -- Auditoria
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Restrições
        UNIQUE(viagem_id, entrega_id),
        CONSTRAINT chk_ordem_coleta CHECK (ordem_coleta > 0)
      );

      CREATE INDEX IF NOT EXISTS idx_viagem_coletas_viagem ON viagem_coletas(viagem_id);
      CREATE INDEX IF NOT EXISTS idx_viagem_coletas_entrega ON viagem_coletas(entrega_id);
      CREATE INDEX IF NOT EXISTS idx_viagem_coletas_status ON viagem_coletas(status);
      CREATE INDEX IF NOT EXISTS idx_viagem_coletas_ordem ON viagem_coletas(viagem_id, ordem_coleta);
    `);
    console.log("✅ Tabela viagem_coletas criada");

    // ========================================
    // TABELA: viagem_entregas
    // ========================================
    console.log("📬 Criando tabela viagem_entregas...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS viagem_entregas (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Referências
        viagem_id VARCHAR NOT NULL REFERENCES viagens_intermunicipais(id) ON DELETE CASCADE,
        entrega_id VARCHAR NOT NULL REFERENCES entregas_intermunicipais(id) ON DELETE CASCADE,
        coleta_id VARCHAR NOT NULL REFERENCES viagem_coletas(id) ON DELETE CASCADE,

        -- Informações da entrega
        endereco_entrega TEXT NOT NULL,
        latitude VARCHAR(50),
        longitude VARCHAR(50),
        destinatario_nome VARCHAR(255) NOT NULL,
        destinatario_telefone VARCHAR(20) NOT NULL,

        -- Status da entrega
        status VARCHAR(30) NOT NULL DEFAULT 'pendente',
        -- Status possíveis:
        -- pendente: aguardando motorista chegar no destino
        -- a_caminho: motorista está indo para o local de entrega
        -- chegou: motorista chegou no local
        -- entregue: pacote foi entregue com sucesso
        -- recusado: destinatário recusou o pacote
        -- ausente: destinatário ausente (após tentativas)
        -- devolvido: pacote devolvido ao remetente

        -- Ordem de entrega na rota
        ordem_entrega INTEGER NOT NULL,

        -- Horários
        horario_previsto TIMESTAMP,
        horario_chegada TIMESTAMP,
        horario_entrega TIMESTAMP,

        -- Informações da entrega
        nome_recebedor VARCHAR(255),
        cpf_recebedor VARCHAR(14),
        observacoes TEXT,
        motivo_falha TEXT,

        -- Comprovantes
        foto_comprovante_url TEXT,
        assinatura_url TEXT,

        -- Avaliação (opcional)
        avaliacao_estrelas INTEGER,
        avaliacao_comentario TEXT,

        -- Auditoria
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Restrições
        UNIQUE(viagem_id, entrega_id),
        CONSTRAINT chk_ordem_entrega CHECK (ordem_entrega > 0),
        CONSTRAINT chk_avaliacao_estrelas CHECK (avaliacao_estrelas IS NULL OR (avaliacao_estrelas >= 1 AND avaliacao_estrelas <= 5))
      );

      CREATE INDEX IF NOT EXISTS idx_viagem_entregas_viagem ON viagem_entregas(viagem_id);
      CREATE INDEX IF NOT EXISTS idx_viagem_entregas_entrega ON viagem_entregas(entrega_id);
      CREATE INDEX IF NOT EXISTS idx_viagem_entregas_coleta ON viagem_entregas(coleta_id);
      CREATE INDEX IF NOT EXISTS idx_viagem_entregas_status ON viagem_entregas(status);
      CREATE INDEX IF NOT EXISTS idx_viagem_entregas_ordem ON viagem_entregas(viagem_id, ordem_entrega);
    `);
    console.log("✅ Tabela viagem_entregas criada");

    await client.query('COMMIT');

    console.log('\n✨ Migration Etapa 4 concluída com sucesso!\n');
    console.log('Criado:');
    console.log('  ✅ Tabela viagem_coletas (controle de coletas)');
    console.log('  ✅ Tabela viagem_entregas (controle de entregas)');
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
