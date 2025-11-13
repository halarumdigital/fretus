import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev"
});

console.log('\n🔍 Buscando entregas com múltiplos stops...\n');

// Buscar entregas que têm registros na tabela delivery_stops
const result = await pool.query(`
  SELECT
    r.id,
    r.request_number,
    r.created_at,
    COUNT(ds.stop_order) as num_stops
  FROM requests r
  INNER JOIN delivery_stops ds ON ds.request_id = r.id
  GROUP BY r.id, r.request_number, r.created_at
  HAVING COUNT(ds.stop_order) > 1
  ORDER BY r.created_at DESC
  LIMIT 5
`);

if (result.rows.length === 0) {
  console.log('❌ Nenhuma entrega com múltiplos stops encontrada');
  await pool.end();
  process.exit(0);
}

console.log(`📦 ${result.rows.length} entregas com múltiplos stops encontradas:\n`);

for (const delivery of result.rows) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📦 Entrega: ${delivery.request_number}`);
  console.log(`   Total de stops: ${delivery.num_stops}`);

  // Buscar detalhes dos stops
  const stops = await pool.query(`
    SELECT
      stop_order,
      customer_name,
      customer_whatsapp,
      delivery_reference,
      address
    FROM delivery_stops
    WHERE request_id = $1
    ORDER BY stop_order ASC
  `, [delivery.id]);

  let hasWhatsapp = 0;
  let hasReference = 0;

  stops.rows.forEach((stop) => {
    console.log(`\n   Stop ${stop.stop_order}:`);
    console.log(`     Nome: ${stop.customer_name || '(vazio)'}`);
    console.log(`     WhatsApp: ${stop.customer_whatsapp ? `✅ ${stop.customer_whatsapp}` : '❌ NULL'}`);
    console.log(`     Referência: ${stop.delivery_reference ? `✅ ${stop.delivery_reference}` : '❌ NULL'}`);

    if (stop.customer_whatsapp) hasWhatsapp++;
    if (stop.delivery_reference) hasReference++;
  });

  console.log(`\n   📊 Resumo:`);
  console.log(`     Com WhatsApp: ${hasWhatsapp}/${delivery.num_stops}`);
  console.log(`     Com Referência: ${hasReference}/${delivery.num_stops}`);

  if (hasWhatsapp === 0 && hasReference === 0) {
    console.log(`     ⚠️ PROBLEMA: Nenhum campo preenchido!`);
  } else if (hasWhatsapp > 0 || hasReference > 0) {
    console.log(`     ✅ OK: Alguns campos preenchidos`);
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

await pool.end();