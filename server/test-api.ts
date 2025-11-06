import "dotenv/config";
import { storage } from "./storage";

async function testAPIs() {
  try {
    console.log("🔍 Testing brands API...");
    const brands = await storage.getAllBrands();
    console.log(`✅ Brands: ${brands.length} items`);
    console.log("First brand:", JSON.stringify(brands[0], null, 2));

    console.log("\n🔍 Testing models API...");
    const models = await storage.getAllVehicleModels();
    console.log(`✅ Models: ${models.length} items`);
    console.log("First model:", JSON.stringify(models[0], null, 2));

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

testAPIs();
