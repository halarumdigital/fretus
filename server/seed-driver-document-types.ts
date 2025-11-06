import "dotenv/config";
import { storage } from "./storage";

async function seedDriverDocumentTypes() {
  try {
    console.log("🔄 Iniciando seed: Tipos de documentos de motorista...\n");

    const documentTypes = [
      {
        name: "CNH",
        description: "Carteira Nacional de Habilitação",
        required: true,
        active: true,
      },
      {
        name: "Comprovante de residência",
        description: "Comprovante de residência atualizado (últimos 3 meses)",
        required: true,
        active: true,
      },
      {
        name: "CRLV",
        description: "Certificado de Registro e Licenciamento de Veículo",
        required: true,
        active: true,
      },
      {
        name: "Selfie",
        description: "Foto do motorista (selfie)",
        required: true,
        active: true,
      },
    ];

    console.log(`📝 Criando ${documentTypes.length} tipos de documentos...\n`);

    for (const docType of documentTypes) {
      const created = await storage.createDriverDocumentType(docType);
      console.log(`✅ Tipo de documento criado: ${created.name}`);
    }

    console.log(`\n✅ Seed concluído! ${documentTypes.length} tipos de documentos criados.`);
  } catch (error: any) {
    console.error("❌ Erro no seed:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

seedDriverDocumentTypes();
