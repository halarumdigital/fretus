import { eq, and, sql } from "drizzle-orm";
import { db } from "../db.js";
import { drivers } from "@shared/schema";

/**
 * Gera um código único de indicação baseado no nome do entregador
 * Formato: NOME+2DIGITOS
 * Exemplo: João Silva -> JOAO12
 */
export async function generateReferralCode(driverName: string): Promise<string> {
  // Remove acentos e caracteres especiais
  const normalizedName = driverName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z\s]/g, "") // Remove caracteres não alfabéticos
    .trim()
    .split(' ')[0] // Pega apenas o primeiro nome
    .toUpperCase()
    .slice(0, 10); // Limita a 10 caracteres

  // Tenta até 100 vezes gerar um código único
  for (let attempt = 0; attempt < 100; attempt++) {
    // Gera 2 dígitos aleatórios
    const randomDigits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const code = `${normalizedName}${randomDigits}`;

    // Verifica se o código já existe
    const existingDriver = await db
      .select()
      .from(drivers)
      .where(eq(drivers.referralCode, code))
      .limit(1);

    if (existingDriver.length === 0) {
      return code;
    }
  }

  // Se não conseguir gerar um código único, adiciona timestamp
  const timestamp = Date.now().toString().slice(-4);
  return `${normalizedName}${timestamp}`;
}

/**
 * Valida se um código de indicação existe e retorna o motorista
 */
export async function validateReferralCode(code: string) {
  const driver = await db
    .select()
    .from(drivers)
    .where(eq(drivers.referralCode, code.toUpperCase()))
    .limit(1);

  if (driver.length > 0) {
    return {
      valid: true,
      driver: driver[0]
    };
  }

  return {
    valid: false,
    message: "Código de indicação inválido"
  };
}

/**
 * Verifica se o motorista indicado atingiu a meta de entregas
 * e processa a comissão se necessário
 */
export async function checkAndProcessReferralCommission(driverId: string, totalDeliveries: number) {
  try {
    // Importa as tabelas necessárias
    const { referralCommissions, referralSettings } = await import("@shared/schema");

    // Busca as configurações de indicação
    const settings = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.enabled, true))
      .limit(1);

    if (settings.length === 0) {
      return { processed: false, reason: "Sistema de indicação desabilitado" };
    }

    const currentSettings = settings[0];

    // Busca comissão pendente para este motorista
    const pendingCommission = await db
      .select()
      .from(referralCommissions)
      .where(and(
        eq(referralCommissions.referredDriverId, driverId),
        eq(referralCommissions.status, "pending")
      ))
      .limit(1);

    if (pendingCommission.length === 0) {
      return { processed: false, reason: "Sem comissão pendente" };
    }

    const commission = pendingCommission[0];

    // Verifica se atingiu a meta
    if (totalDeliveries >= commission.requiredDeliveries) {
      // Atualiza a comissão para qualificada
      await db
        .update(referralCommissions)
        .set({
          status: "qualified",
          completedDeliveries: totalDeliveries,
          qualifiedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(referralCommissions.id, commission.id));

      return {
        processed: true,
        commission: commission.commissionAmount,
        referrerId: commission.referrerDriverId
      };
    }

    // Atualiza apenas o contador de entregas
    await db
      .update(referralCommissions)
      .set({
        completedDeliveries: totalDeliveries,
        updatedAt: new Date()
      })
      .where(eq(referralCommissions.id, commission.id));

    return {
      processed: false,
      reason: `Faltam ${commission.requiredDeliveries - totalDeliveries} entregas para atingir a meta`
    };

  } catch (error) {
    console.error("Erro ao processar comissão de indicação:", error);
    return { processed: false, reason: "Erro ao processar comissão", error };
  }
}

/**
 * Atualiza o progresso de indicações ativas do motorista
 * Marca commissionEarned = true quando atingir a meta
 */
export async function updateDriverReferralProgress(driverId: string, totalDeliveries: number) {
  try {
    const { driverReferrals, referralSettings } = await import("@shared/schema");

    // Busca as configurações de indicação
    const settings = await db
      .select()
      .from(referralSettings)
      .where(eq(referralSettings.enabled, true))
      .limit(1);

    if (settings.length === 0) {
      return { updated: false, reason: "Sistema de indicação desabilitado" };
    }

    const currentSettings = settings[0];
    const minimumDeliveries = currentSettings.minimumDeliveries;

    // Busca indicações ativas onde este motorista é o indicado
    const activeReferrals = await db
      .select()
      .from(driverReferrals)
      .where(and(
        eq(driverReferrals.referredDriverId, driverId),
        eq(driverReferrals.status, "active")
      ));

    if (activeReferrals.length === 0) {
      return { updated: false, reason: "Sem indicações ativas" };
    }

    let updatedCount = 0;

    const commissionAmount = currentSettings.commissionAmount;

    for (const referral of activeReferrals) {
      // Se já atingiu a meta e ainda não foi marcado como earned
      const hasNoCommission = !referral.commissionEarned || referral.commissionEarned === "0";
      if (totalDeliveries >= minimumDeliveries && hasNoCommission) {
        await db
          .update(driverReferrals)
          .set({
            deliveriesCompleted: totalDeliveries,
            commissionEarned: commissionAmount,
            updatedAt: new Date()
          })
          .where(eq(driverReferrals.id, referral.id));

        updatedCount++;
      }
      // Atualiza apenas o contador de entregas
      else if (totalDeliveries !== referral.deliveriesCompleted) {
        await db
          .update(driverReferrals)
          .set({
            deliveriesCompleted: totalDeliveries,
            updatedAt: new Date()
          })
          .where(eq(driverReferrals.id, referral.id));

        updatedCount++;
      }
    }

    return {
      updated: true,
      updatedCount,
      qualifiedCount: activeReferrals.filter((r: any) => totalDeliveries >= minimumDeliveries).length
    };

  } catch (error) {
    console.error("Erro ao atualizar progresso de indicação:", error);
    return { updated: false, reason: "Erro ao atualizar progresso", error };
  }
}

/**
 * Atualiza o progresso de indicações de empresas
 * Verifica se a empresa atingiu a meta e marca como qualified
 */
export async function updateCompanyReferralProgress(companyId: string) {
  try {
    const { companyReferrals, referralSettings, requests } = await import("@shared/schema");

    console.log("🔍 Atualizando progresso de indicação de empresa:", companyId);

    // Buscar referência de indicação da empresa
    const referral = await db
      .select()
      .from(companyReferrals)
      .where(and(
        eq(companyReferrals.companyId, companyId),
        eq(companyReferrals.status, "pending")
      ))
      .limit(1);

    if (referral.length === 0) {
      console.log("   ℹ️ Nenhuma indicação pendente para esta empresa");
      return { updated: false, reason: "Nenhuma indicação pendente" };
    }

    const currentReferral = referral[0];

    // Contar TODAS as entregas completadas pela empresa
    const completedDeliveries = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(requests)
      .where(and(
        eq(requests.companyId, companyId),
        eq(requests.isCompleted, true)
      ));

    const totalCompletedDeliveries = completedDeliveries[0]?.count || 0;
    console.log(`   📊 Total de entregas completadas: ${totalCompletedDeliveries}/${currentReferral.requiredDeliveries}`);

    // Verificar se atingiu a meta
    if (totalCompletedDeliveries >= currentReferral.requiredDeliveries) {
      console.log("   🎉 Meta atingida! Marcando como qualified");

      await db
        .update(companyReferrals)
        .set({
          status: "qualified",
          completedDeliveries: totalCompletedDeliveries,
          qualifiedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(companyReferrals.id, currentReferral.id));

      return {
        updated: true,
        qualified: true,
        commission: currentReferral.commissionAmount,
        referrerDriverId: currentReferral.referrerDriverId,
        completedDeliveries: totalCompletedDeliveries
      };
    }

    // Atualizar apenas o contador
    await db
      .update(companyReferrals)
      .set({
        completedDeliveries: totalCompletedDeliveries,
        updatedAt: new Date()
      })
      .where(eq(companyReferrals.id, currentReferral.id));

    console.log(`   ✅ Contador atualizado. Faltam ${currentReferral.requiredDeliveries - totalCompletedDeliveries} entregas`);

    return {
      updated: true,
      qualified: false,
      completedDeliveries: totalCompletedDeliveries,
      remaining: currentReferral.requiredDeliveries - totalCompletedDeliveries
    };

  } catch (error) {
    console.error("Erro ao atualizar progresso de indicação de empresa:", error);
    return { updated: false, reason: "Erro ao atualizar progresso", error };
  }
}