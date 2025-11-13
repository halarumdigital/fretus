-- Criar tabela de notificações push
CREATE TABLE IF NOT EXISTS push_notifications (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informações da notificação
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data TEXT, -- JSON string com dados adicionais

    -- Destinatário(s)
    target_type VARCHAR(20) NOT NULL, -- 'driver', 'city'
    target_id VARCHAR, -- ID do motorista específico
    target_city_id VARCHAR REFERENCES service_locations(id), -- ID da cidade

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,

    -- Contadores
    total_recipients INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,

    -- Admin que enviou
    sent_by VARCHAR REFERENCES users(id),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP
);