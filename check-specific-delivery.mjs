import pg from 'pg';

const pool = new pg.Pool({
  connectionString: "postgresql://postgres:@0dJ2m0q82320@206.183.129.145:5432/fretus-dev"
});

const requestNumber = 'REQ-1762994528430-62';

console.log(`\n🔍 Buscando entrega: ${requestNumber}\n`);

// Buscar a entrega
const requestResult = await pool.query(`
  SELECT
    id,
    request_number
  FROM requests
  WHERE request_number = $1
`, [requestNumber]);

if (requestResult.rows.length === 0) {
  console.log('❌ Entrega não encontrada');
  await pool.end();
  process.exit(0);
}

const delivery = requestResult.rows[0];
console.log('📦 Entrega encontrada:');
console.log(`  ID: ${delivery.id}\n`);

// Buscar os stops desta entrega
const stopsResult = await pool.query(`
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

if (stopsResult.rows.length === 0) {
  console.log('⚠️  Nenhum stop encontrado para esta entrega');
} else {
  console.log(`📍 ${stopsResult.rows.length} stops encontrados:\n`);

  let totalWithWhatsapp = 0;
  let totalWithReference = 0;

  stopsResult.rows.forEach((stop) => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Stop ${stop.stop_order}:`);
    console.log(`  Nome: ${stop.customer_name || '(vazio)'}`);
    console.log(`  WhatsApp: ${stop.customer_whatsapp ? `✅ ${stop.customer_whatsapp}` : '❌ NULL'}`);
    console.log(`  Referência: ${stop.delivery_reference ? `✅ ${stop.delivery_reference}` : '❌ NULL'}`);
    console.log(`  Endereço: ${stop.address}`);

    if (stop.customer_whatsapp) totalWithWhatsapp++;
    if (stop.delivery_reference) totalWithReference++;
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`📊 RESUMO:`);
  console.log(`  Total de stops: ${stopsResult.rows.length}`);
  console.log(`  Com WhatsApp preenchido: ${totalWithWhatsapp}/${stopsResult.rows.length}`);
  console.log(`  Com Referência preenchida: ${totalWithReference}/${stopsResult.rows.length}`);

  if (totalWithWhatsapp === 0 && totalWithReference === 0) {
    console.log(`\n⚠️  PROBLEMA CONFIRMADO: WhatsApp e Referência estão NULL em todos os stops!`);
  } else if (totalWithWhatsapp > 0 || totalWithReference > 0) {
    console.log(`\n✅ SUCESSO: Alguns campos foram salvos!`);
  }
}

await pool.end();