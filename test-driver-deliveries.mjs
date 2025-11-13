// Teste simples com fetch direto
const fetch = (await import('node-fetch')).default;

// Buscar um motorista de teste
const driversList = await db
  .select({
    id: drivers.id,
    name: drivers.name,
  })
  .from(drivers)
  .limit(1);

if (driversList.length === 0) {
  console.log("❌ Nenhum motorista encontrado no banco de dados");
  process.exit(1);
}

const testDriver = driversList[0];
console.log(`✅ Motorista encontrado: ${testDriver.name} (ID: ${testDriver.id})`);

// Buscar entregas do motorista
const deliveries = await db
  .select({
    id: requests.id,
    requestNumber: requests.requestNumber,
    isCompleted: requests.isCompleted,
    isCancelled: requests.isCancelled,
  })
  .from(requests)
  .where(eq(requests.driverId, testDriver.id))
  .limit(5);

console.log(`\n📦 Entregas encontradas: ${deliveries.length}`);

if (deliveries.length > 0) {
  console.log("\n🔍 Testando endpoint GET /api/driver/:driverId/deliveries");

  // Testar endpoint
  const testCases = [
    {
      description: "Buscar todas as entregas agrupadas por dia",
      url: `http://localhost:5010/api/driver/${testDriver.id}/deliveries?groupBy=day`
    },
    {
      description: "Buscar entregas agrupadas por semana",
      url: `http://localhost:5010/api/driver/${testDriver.id}/deliveries?groupBy=week`
    },
    {
      description: "Buscar entregas agrupadas por mês",
      url: `http://localhost:5010/api/driver/${testDriver.id}/deliveries?groupBy=month`
    },
    {
      description: "Buscar entregas com filtro de data",
      url: `http://localhost:5010/api/driver/${testDriver.id}/deliveries?groupBy=day&startDate=2025-11-01&endDate=2025-11-30`
    }
  ];

  for (const test of testCases) {
    console.log(`\n📝 ${test.description}`);
    console.log(`   URL: ${test.url}`);

    try {
      const response = await fetch(test.url);
      const data = await response.json();

      if (response.ok) {
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   📊 Estatísticas:`);
        console.log(`      - Total de entregas: ${data.stats?.totalDeliveries || 0}`);
        console.log(`      - Entregas concluídas: ${data.stats?.completedDeliveries || 0}`);
        console.log(`      - Entregas canceladas: ${data.stats?.cancelledDeliveries || 0}`);
        console.log(`      - Ganhos totais: R$ ${data.stats?.totalEarnings || 0}`);
        console.log(`      - Distância total: ${data.stats?.totalDistance || 0} km`);
        console.log(`      - Períodos agrupados: ${data.grouped?.length || 0}`);

        if (data.grouped && data.grouped.length > 0) {
          const firstGroup = data.grouped[0];
          console.log(`   📅 Primeiro período: ${firstGroup.period}`);
          console.log(`      - Entregas: ${firstGroup.stats.total}`);
          console.log(`      - Ganhos: R$ ${firstGroup.stats.earnings}`);
        }
      } else {
        console.log(`   ❌ Status: ${response.status}`);
        console.log(`   ❌ Erro: ${data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro na requisição: ${error.message}`);
    }
  }
} else {
  console.log("⚠️  Nenhuma entrega encontrada para este motorista");
  console.log("   Por favor, crie algumas entregas de teste primeiro");
}

process.exit(0);