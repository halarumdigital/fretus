import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev"
});

const requestNumber = 'REQ-1762994528430-62';

console.log(`\n🔍 Buscando entrega de 1 stop: ${requestNumber}\n`);

// Buscar a entrega completa
const requestResult = await pool.query(`
  SELECT
    id,
    request_number,
    customer_name,
    customer_whatsapp,
    delivery_reference,
    created_at
  FROM requests
  WHERE request_number = $1
`, [requestNumber]);

if (requestResult.rows.length === 0) {
  console.log('❌ Entrega não encontrada');
  await pool.end();
  process.exit(0);
}

const delivery = requestResult.rows[0];
console.log('📦 Entrega encontrada (1 stop - tabela requests):');
console.log(`  ID: ${delivery.id}`);
console.log(`  Número: ${delivery.request_number}`);
console.log(`  Cliente: ${delivery.customer_name || '(vazio)'}`);
console.log(`  WhatsApp: ${delivery.customer_whatsapp ? `✅ ${delivery.customer_whatsapp}` : '❌ NULL'}`);
console.log(`  Referência: ${delivery.delivery_reference ? `✅ ${delivery.delivery_reference}` : '❌ NULL'}`);
console.log(`  Criada em: ${delivery.created_at}\n`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Comparar com uma entrega de múltiplos stops
console.log('\n📊 COMPARAÇÃO COM ENTREGA DE MÚLTIPLOS STOPS:\n');

const multiStopResult = await pool.query(`
  SELECT
    r.id,
    r.request_number,
    r.customer_name,
    r.customer_whatsapp,
    r.delivery_reference
  FROM requests r
  INNER JOIN delivery_stops ds ON ds.request_id = r.id
  GROUP BY r.id, r.request_number, r.customer_name, r.customer_whatsapp, r.delivery_reference
  ORDER BY r.created_at DESC
  LIMIT 1
`);

if (multiStopResult.rows.length > 0) {
  const multiStop = multiStopResult.rows[0];
  console.log('📦 Entrega com múltiplos stops (tabela requests):');
  console.log(`  Número: ${multiStop.request_number}`);
  console.log(`  Cliente (tabela requests): ${multiStop.customer_name || '(vazio)'}`);
  console.log(`  WhatsApp (tabela requests): ${multiStop.customer_whatsapp ? `✅ ${multiStop.customer_whatsapp}` : '❌ NULL'}`);
  console.log(`  Referência (tabela requests): ${multiStop.delivery_reference ? `✅ ${multiStop.delivery_reference}` : '❌ NULL'}`);

  // Buscar os stops
  const stops = await pool.query(`
    SELECT customer_whatsapp, delivery_reference
    FROM delivery_stops
    WHERE request_id = $1
  `, [multiStop.id]);

  const withWhatsapp = stops.rows.filter(s => s.customer_whatsapp).length;
  const withReference = stops.rows.filter(s => s.delivery_reference).length;

  console.log(`\n  Dados na tabela delivery_stops:`);
  console.log(`    Com WhatsApp: ${withWhatsapp}/${stops.rows.length}`);
  console.log(`    Com Referência: ${withReference}/${stops.rows.length}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

await pool.end();