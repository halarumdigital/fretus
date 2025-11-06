import "dotenv/config";
import { pool } from "./db";

async function checkData() {
  try {
    const { rows: brands } = await pool.query("SELECT COUNT(*) as total FROM brands");
    console.log("✅ Brands count:", brands[0].total);

    const { rows: models } = await pool.query("SELECT COUNT(*) as total FROM vehicle_models");
    console.log("✅ Models count:", models[0].total);

    const { rows: brandsData } = await pool.query("SELECT * FROM brands LIMIT 5");
    console.log("\n📝 Sample brands:");
    brandsData.forEach(b => console.log(`  - ${b.name}`));

    const { rows: modelsData } = await pool.query(`
      SELECT vm.name, b.name as brand_name
      FROM vehicle_models vm
      JOIN brands b ON vm.brand_id = b.id
      LIMIT 10
    `);
    console.log("\n📝 Sample models:");
    modelsData.forEach(m => console.log(`  - ${m.brand_name} ${m.name}`));

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.end();
  }
}

checkData();
