import { readFileSync, writeFileSync } from 'fs';

const filePath = './server/routes.ts';
const content = readFileSync(filePath, 'utf8');

// Procurar e substituir o bloco de código
const oldCode = `      // Filtrar promoções válidas para hoje
      const validPromotions = activePromotions.filter(promo => {
        const validDates = promo.validDates.split(',');
        return validDates.includes(today);
      });

      // Formatar resposta para o app
      const formattedPromotions = validPromotions.map(promo => ({
        id: promo.id,
        name: promo.name,
        description: promo.rule,
        validDates: promo.validDates.split(','),
        goal: promo.deliveryQuantity
      }));`;

const newCode = `      // Filtrar promoções com datas válidas >= hoje (futuras ou hoje)
      const validPromotions = activePromotions.filter(promo => {
        const validDates = promo.validDates.split(',');
        // Retorna true se pelo menos uma data for >= hoje
        return validDates.some(date => date >= today);
      });

      // Formatar resposta para o app
      const formattedPromotions = validPromotions.map(promo => ({
        id: promo.id,
        type: promo.type,
        name: promo.name,
        description: promo.rule,
        validDates: promo.validDates.split(','),
        goal: promo.deliveryQuantity,
        prize: promo.prize
      }));`;

if (content.includes(oldCode)) {
  const updatedContent = content.replace(oldCode, newCode);
  writeFileSync(filePath, updatedContent, 'utf8');
  console.log('✓ Endpoint /api/v1/driver/promotions atualizado com sucesso!');
  console.log('✓ Agora retorna promoções futuras e inclui os campos type e prize');
} else {
  console.log('⚠ Código antigo não encontrado. O arquivo pode já estar atualizado.');
}
