// Teste simples do endpoint de entregas do motorista

console.log("🔍 Testando endpoint GET /api/driver/:driverId/deliveries\n");

// ID de teste - você pode substituir por um ID real de motorista
const testDriverId = "test-driver-id"; // Substitua por um ID real

const testCases = [
  {
    description: "Buscar todas as entregas agrupadas por dia",
    url: `http://localhost:5010/api/driver/${testDriverId}/deliveries?groupBy=day`
  },
  {
    description: "Buscar entregas agrupadas por semana",
    url: `http://localhost:5010/api/driver/${testDriverId}/deliveries?groupBy=week`
  },
  {
    description: "Buscar entregas agrupadas por mês",
    url: `http://localhost:5010/api/driver/${testDriverId}/deliveries?groupBy=month`
  },
  {
    description: "Buscar entregas com filtro de data",
    url: `http://localhost:5010/api/driver/${testDriverId}/deliveries?groupBy=day&startDate=2025-11-01&endDate=2025-11-30`
  }
];

for (const test of testCases) {
  console.log(`📝 ${test.description}`);
  console.log(`   URL: ${test.url.replace(testDriverId, '{driverId}')}`);

  try {
    const response = await fetch(test.url);
    const data = await response.json();

    if (response.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📊 Resposta recebida com sucesso`);

      if (data.stats) {
        console.log(`   📈 Estatísticas:`);
        console.log(`      - Total de entregas: ${data.stats.totalDeliveries || 0}`);
        console.log(`      - Entregas concluídas: ${data.stats.completedDeliveries || 0}`);
        console.log(`      - Entregas canceladas: ${data.stats.cancelledDeliveries || 0}`);
        console.log(`      - Ganhos totais: R$ ${data.stats.totalEarnings?.toFixed(2) || '0.00'}`);
        console.log(`      - Distância total: ${data.stats.totalDistance || 0} km`);
      }

      if (data.grouped) {
        console.log(`   📅 Períodos agrupados: ${data.grouped.length}`);
        if (data.grouped.length > 0) {
          const firstGroup = data.grouped[0];
          console.log(`   📅 Primeiro período: ${firstGroup.period}`);
          console.log(`      - Total: ${firstGroup.stats.total}`);
          console.log(`      - Ganhos: R$ ${firstGroup.stats.earnings?.toFixed(2) || '0.00'}`);
        }
      }
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   ❌ Mensagem: ${data.message || 'Erro desconhecido'}`);
    }
  } catch (error) {
    console.log(`   ❌ Erro na requisição: ${error.message}`);
  }

  console.log("");
}

console.log("\n✅ Teste concluído!");
console.log("📌 Nota: Use um ID de motorista válido do banco de dados para testes reais");
console.log("📌 Você pode encontrar IDs válidos no painel de administração em /motoristas");