import "dotenv/config";
import { db } from "./db";
import { brands, vehicleModels } from "@shared/schema";

const brandsAndModels = [
  {
    brand: "Honda",
    models: [
      "CG 160",
      "CG 125",
      "Biz 125",
      "Pop 110i",
      "CB 500X",
      "CB 500F",
      "CBR 500R",
      "CB 650R",
      "CBR 650R",
      "CB 1000R",
      "CBR 1000RR",
      "NC 750X",
      "ADV 150",
      "PCX 150",
      "CB Twister 250",
      "XRE 300",
      "NXR 160 Bros",
    ],
  },
  {
    brand: "Yamaha",
    models: [
      "Factor 150",
      "Fazer 250",
      "XTZ 150 Crosser",
      "Lander 250",
      "XTZ 250 Ténéré",
      "MT-03",
      "MT-07",
      "MT-09",
      "R3",
      "R6",
      "R1",
      "Tracer 900GT",
      "Super Ténéré 1200",
      "NMAX 160",
      "YS 150 Fazer",
    ],
  },
  {
    brand: "Suzuki",
    models: [
      "Intruder 150",
      "GSX-S150",
      "V-Strom 650",
      "V-Strom 1050",
      "GSX-S750",
      "GSX-S1000",
      "GSX-R1000",
      "Boulevard M800",
      "Hayabusa",
    ],
  },
  {
    brand: "Kawasaki",
    models: [
      "Ninja 400",
      "Z400",
      "Versys 650",
      "Ninja 650",
      "Z650",
      "Versys 1000",
      "Z900",
      "Ninja 1000SX",
      "Z H2",
      "Ninja ZX-10R",
      "Ninja H2",
    ],
  },
  {
    brand: "BMW",
    models: [
      "G 310 R",
      "G 310 GS",
      "F 750 GS",
      "F 850 GS",
      "R 1250 GS",
      "S 1000 RR",
      "S 1000 R",
      "R 1250 RT",
      "R 1250 R",
      "R nineT",
    ],
  },
  {
    brand: "Harley-Davidson",
    models: [
      "Street 750",
      "Iron 883",
      "Forty-Eight",
      "Street Bob",
      "Fat Bob",
      "Low Rider S",
      "Road King",
      "Street Glide",
      "Road Glide",
      "Ultra Limited",
    ],
  },
  {
    brand: "Ducati",
    models: [
      "Scrambler Icon",
      "Monster 821",
      "Monster 1200",
      "Hypermotard 950",
      "Multistrada 950",
      "Multistrada 1260",
      "Panigale V2",
      "Panigale V4",
      "Diavel 1260",
    ],
  },
  {
    brand: "Triumph",
    models: [
      "Street Twin",
      "Bonneville T120",
      "Speed Twin",
      "Street Triple R",
      "Tiger 900",
      "Tiger 1200",
      "Rocket 3",
      "Thruxton RS",
    ],
  },
  {
    brand: "KTM",
    models: [
      "Duke 200",
      "Duke 390",
      "RC 390",
      "Adventure 390",
      "Duke 790",
      "Adventure 790",
      "Duke 890 R",
      "Adventure 1290",
      "Super Duke 1290 R",
    ],
  },
  {
    brand: "Royal Enfield",
    models: [
      "Classic 350",
      "Classic 500",
      "Himalayan",
      "Meteor 350",
      "Interceptor 650",
      "Continental GT 650",
    ],
  },
  {
    brand: "Shineray",
    models: [
      "Jet 50",
      "Phoenix 50",
      "Discover 125",
      "Adventure 150",
      "XY 150-11",
      "XY 200 Stalker",
    ],
  },
  {
    brand: "Dafra",
    models: [
      "Apache RTR 160",
      "Apache RTR 200",
      "NH 190",
      "Citycom 300i",
      "Maxsym 400i",
    ],
  },
  {
    brand: "Traxx",
    models: [
      "JH 50",
      "JH 150",
      "JL 125",
      "Sky 125",
      "TS 150",
      "TS 200",
    ],
  },
];

async function seedBrandsAndModels() {
  try {
    console.log("🔄 Iniciando seed de marcas e modelos...\n");

    for (const item of brandsAndModels) {
      console.log(`📝 Criando marca: ${item.brand}`);

      // Criar marca
      const [brand] = await db
        .insert(brands)
        .values({
          name: item.brand,
          active: true,
        })
        .returning();

      console.log(`✅ Marca "${item.brand}" criada com ID: ${brand.id}`);

      // Criar modelos
      console.log(`   📦 Criando ${item.models.length} modelos...`);
      for (const modelName of item.models) {
        await db.insert(vehicleModels).values({
          brandId: brand.id,
          name: modelName,
          active: true,
        });
      }
      console.log(`   ✅ ${item.models.length} modelos criados\n`);
    }

    console.log("✅ Seed concluído com sucesso!");
    console.log(
      `📊 Total: ${brandsAndModels.length} marcas e ${brandsAndModels.reduce(
        (acc, b) => acc + b.models.length,
        0
      )} modelos`
    );
  } catch (error: any) {
    console.error("❌ Erro no seed:", error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

seedBrandsAndModels();
