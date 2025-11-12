import { pool } from "./server/db";

async function fixDriverRatings() {
  try {
    console.log("🔧 Recalculando ratings dos motoristas...");

    // Buscar todos os motoristas que têm avaliações
    const { rows: driversWithRatings } = await pool.query(`
      SELECT DISTINCT driver_id
      FROM company_driver_ratings
    `);

    console.log(`📊 Encontrados ${driversWithRatings.length} motoristas com avaliações`);

    for (const { driver_id } of driversWithRatings) {
      // Calcular média de avaliações para cada motorista
      const { rows: ratingStats } = await pool.query(`
        SELECT
          AVG(rating)::numeric(10,2) as avg_rating,
          COUNT(*)::integer as total_ratings,
          SUM(rating)::integer as sum_rating
        FROM company_driver_ratings
        WHERE driver_id = $1
      `, [driver_id]);

      const stats = ratingStats[0];

      // Atualizar dados do motorista
      await pool.query(`
        UPDATE drivers
        SET
          rating = $1,
          rating_total = $2,
          no_of_ratings = $3
        WHERE id = $4
      `, [
        stats.avg_rating || '0',
        stats.sum_rating?.toString() || '0',
        stats.total_ratings || 0,
        driver_id
      ]);

      console.log(`✅ Motorista ${driver_id}: ${stats.avg_rating} (${stats.total_ratings} avaliações)`);
    }

    console.log("\n✅ Ratings recalculados com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao recalcular ratings:", error);
    process.exit(1);
  }
}

fixDriverRatings();
