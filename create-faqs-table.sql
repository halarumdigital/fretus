-- Criar tabela FAQs
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
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_target ON faqs(target);
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(active);
CREATE INDEX IF NOT EXISTS idx_faqs_display_order ON faqs(display_order);