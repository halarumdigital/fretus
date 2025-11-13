import { db } from "./server/db.js";
import { faqs } from "./shared/schema.js";
import { eq } from "drizzle-orm";

console.log("🔍 Verificando FAQs no banco de dados...\n");

// Buscar todas as FAQs
const allFaqs = await db
  .select()
  .from(faqs)
  .orderBy(faqs.target, faqs.category);

console.log(`📊 Total de FAQs encontradas: ${allFaqs.length}`);

// Contar por target
const driverFaqs = allFaqs.filter(f => f.target === 'driver');
const companyFaqs = allFaqs.filter(f => f.target === 'company');
const activeFaqs = allFaqs.filter(f => f.active);

console.log(`\n📈 Estatísticas:`);
console.log(`   - FAQs para motoristas: ${driverFaqs.length}`);
console.log(`   - FAQs para empresas: ${companyFaqs.length}`);
console.log(`   - FAQs ativas: ${activeFaqs.length}`);
console.log(`   - FAQs inativas: ${allFaqs.length - activeFaqs.length}`);

// Mostrar FAQs de motoristas ativas
const activeDriverFaqs = allFaqs.filter(f => f.target === 'driver' && f.active);
console.log(`\n🚗 FAQs ativas para motoristas: ${activeDriverFaqs.length}`);

if (activeDriverFaqs.length > 0) {
  console.log("\nPrimeiras 3 FAQs de motoristas:");
  activeDriverFaqs.slice(0, 3).forEach((faq, i) => {
    console.log(`\n${i + 1}. Categoria: ${faq.category}`);
    console.log(`   Pergunta: ${faq.question}`);
    console.log(`   Resposta: ${faq.answer?.substring(0, 100)}...`);
    console.log(`   Ordem: ${faq.displayOrder || 0}`);
  });
}

// Testar endpoint diretamente
console.log("\n\n📡 Testando endpoint /api/v1/driver/faqs...");
try {
  const response = await fetch("http://localhost:5010/api/v1/driver/faqs");

  if (!response.ok) {
    console.log(`❌ Erro HTTP: ${response.status} ${response.statusText}`);
    const text = await response.text();
    if (text.includes("<!DOCTYPE")) {
      console.log("⚠️  Está retornando HTML ao invés de JSON - o servidor backend pode não estar configurado corretamente");
      console.log("💡 Possíveis problemas:");
      console.log("   1. O servidor Express não está rodando");
      console.log("   2. O Vite está interceptando a rota");
      console.log("   3. O proxy do Vite não está configurado");
    } else {
      console.log("Resposta:", text);
    }
  } else {
    const data = await response.json();
    console.log(`✅ Endpoint funcionando!`);
    console.log(`   - Success: ${data.success}`);
    console.log(`   - Total de FAQs: ${data.total || 0}`);
    console.log(`   - Categorias: ${data.faqs?.length || 0}`);
  }
} catch (error) {
  console.log(`❌ Erro ao testar endpoint: ${error.message}`);
}

process.exit(0);