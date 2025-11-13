console.log("🔍 Testando endpoints de FAQ...\n");

const endpoints = [
  {
    name: "FAQs para motoristas (v1)",
    url: "http://localhost:5010/api/v1/driver/faqs"
  },
  {
    name: "FAQs para empresas (v1)",
    url: "http://localhost:5010/api/v1/company/faqs"
  },
  {
    name: "FAQs públicas (todas)",
    url: "http://localhost:5010/api/public/faqs"
  },
  {
    name: "FAQs públicas (motoristas)",
    url: "http://localhost:5010/api/public/faqs/driver"
  }
];

for (const endpoint of endpoints) {
  console.log(`📡 Testando: ${endpoint.name}`);
  console.log(`   URL: ${endpoint.url}`);

  try {
    const response = await fetch(endpoint.url);
    const contentType = response.headers.get("content-type");

    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${contentType}`);

    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log(`   ✅ Retornou JSON`);
      console.log(`   Success: ${data.success}`);
      console.log(`   Total: ${data.total || 0}`);

      if (data.faqs && Array.isArray(data.faqs)) {
        console.log(`   Categorias: ${data.faqs.length}`);
        if (data.faqs.length > 0) {
          const firstCategory = data.faqs[0];
          console.log(`   Primeira categoria: ${firstCategory.category} (${firstCategory.items?.length || 0} items)`);
        }
      }
    } else if (contentType && contentType.includes("text/html")) {
      console.log(`   ❌ Retornou HTML ao invés de JSON`);
      console.log(`   ⚠️  Problema: O Vite está interceptando a rota da API`);
    } else {
      const text = await response.text();
      console.log(`   ⚠️  Resposta inesperada: ${text.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  }

  console.log("");
}

console.log("\n💡 Diagnóstico:");
console.log("Se todos endpoints retornam HTML, o problema está no servidor:");
console.log("1. O Vite está capturando todas as rotas com app.use('*')");
console.log("2. As rotas da API precisam ser verificadas antes do middleware do Vite");
console.log("3. Pode ser necessário excluir rotas /api/* do middleware do Vite");