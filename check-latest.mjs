import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev"
});

// Buscar a entrega mais recente
const result = await pool.query(`
  SELECT id, request_number, created_at
  FROM requests
  ORDER BY created_at DESC
  LIMIT 1
`);

if (result.rows.length === 0) {
  console.log('❌ Nenhuma entrega encontrada');
  await pool.end();
  process.exit(0);
}

const delivery = result.rows[0];
console.log(`\n📦 Entrega mais recente: ${delivery.request_number}`);
console.log(`Criada em: ${delivery.created_at}\n`);

// Buscar stops
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

if (stops.rows.length === 0) {
  console.log('⚠️  Entrega sem múltiplos stops');
} else {
  console.log(`📍 ${stops.rows.length} stops encontrados:\n`);
  stops.rows.forEach((stop) => {
    console.log(`Stop ${stop.stop_order}:`);
    console.log(`  Nome: ${stop.customer_name || '(vazio)'}`);
    console.log(`  WhatsApp: ${stop.customer_whatsapp || '❌ NULL'}`);
    console.log(`  Referência: ${stop.delivery_reference || '❌ NULL'}`);
    console.log(`  Endereço: ${stop.address}`);
    console.log('');
  });
}

await pool.end();
