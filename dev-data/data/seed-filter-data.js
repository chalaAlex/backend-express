const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Region = require("../../model/regionModel");
const City = require("../../model/cityModel");
const Brand = require("../../model/brandModel");
const Feature = require("../../model/featureModel");
const CarrierType = require("../../model/carrierTypeModel");

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE_LOCAL || 'mongodb://localhost:27017/smart_truck';

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB connection successful!"));

// Ethiopian Regions
const regions = [
  { name: "Addis Ababa", country: "Ethiopia" },
  { name: "Afar", country: "Ethiopia" },
  { name: "Amhara", country: "Ethiopia" },
  { name: "Benishangul-Gumuz", country: "Ethiopia" },
  { name: "Dire Dawa", country: "Ethiopia" },
  { name: "Gambela", country: "Ethiopia" },
  { name: "Harari", country: "Ethiopia" },
  { name: "Oromia", country: "Ethiopia" },
  { name: "Sidama", country: "Ethiopia" },
  { name: "Somali", country: "Ethiopia" },
  { name: "Southern Nations, Nationalities, and Peoples' Region", country: "Ethiopia" },
  { name: "Tigray", country: "Ethiopia" },
];

// Truck Brands
const brands = [
  { name: "Volvo", description: "Swedish manufacturer of heavy-duty trucks" },
  { name: "Scania", description: "Swedish manufacturer of commercial vehicles" },
  { name: "Mercedes-Benz", description: "German manufacturer of premium trucks" },
  { name: "MAN", description: "German commercial vehicle manufacturer" },
  { name: "DAF", description: "Dutch truck manufacturer" },
  { name: "Isuzu", description: "Japanese commercial vehicle manufacturer" },
  { name: "Freightliner", description: "American truck manufacturer" },
  { name: "Kenworth", description: "American truck manufacturer" },
  { name: "Peterbilt", description: "American truck manufacturer" },
  { name: "Iveco", description: "Italian industrial vehicle manufacturer" },
  { name: "Hino", description: "Japanese truck manufacturer" },
  { name: "Mitsubishi Fuso", description: "Japanese commercial vehicle manufacturer" },
];

// Truck Features
const features = [
  { name: "GPS", icon: "location_on", description: "Real-time GPS tracking system" },
  { name: "Air Conditioning", icon: "ac_unit", description: "Climate control system" },
  { name: "Hydraulic Lift", icon: "elevator", description: "Hydraulic loading system" },
  { name: "Refrigeration Unit", icon: "ac_unit", description: "Temperature-controlled cargo area" },
  { name: "Tail Lift", icon: "arrow_upward", description: "Rear loading platform" },
  { name: "Temperature Control", icon: "thermostat", description: "Advanced temperature management" },
  { name: "Side Loader", icon: "swap_horiz", description: "Side loading capability" },
  { name: "Crane", icon: "construction", description: "Mounted crane for heavy lifting" },
  { name: "Tarpaulin Cover", icon: "roofing", description: "Weather protection cover" },
  { name: "Tracking System", icon: "gps_fixed", description: "Advanced tracking and monitoring" },
  { name: "Power Steering", icon: "settings", description: "Enhanced steering control" },
  { name: "ABS Brakes", icon: "speed", description: "Anti-lock braking system" },
  { name: "Sleeper Cab", icon: "hotel", description: "Sleeping compartment for drivers" },
  { name: "Bluetooth", icon: "bluetooth", description: "Wireless connectivity" },
  { name: "Backup Camera", icon: "videocam", description: "Rear view camera system" },
];

// Carrier Types
const carrierTypes = [
  { name: "Flatbed", icon: "local_shipping", description: "Open platform for large cargo" },
  { name: "Refrigerated", icon: "ac_unit", description: "Temperature-controlled transport" },
  { name: "Dry Van", icon: "inventory_2", description: "Enclosed trailer for dry goods" },
  { name: "Tanker", icon: "water_drop", description: "Liquid cargo transport" },
  { name: "Container", icon: "widgets", description: "Standardized container transport" },
  { name: "Box Truck", icon: "local_shipping", description: "Enclosed box for general cargo" },
  { name: "Dump Truck", icon: "construction", description: "Tipping cargo bed for bulk materials" },
];

// Import Data
const importData = async () => {
  try {
    console.log("🗑️  Deleting existing data...");
    await Region.deleteMany();
    await City.deleteMany();
    await Brand.deleteMany();
    await Feature.deleteMany();
    await CarrierType.deleteMany();
    console.log("✅ Existing data deleted!\n");

    // Import Regions
    console.log("📍 Importing regions...");
    const createdRegions = await Region.create(regions);
    console.log(`✅ ${createdRegions.length} regions imported!\n`);

    // Create cities for each region
    console.log("🏙️  Importing cities...");
    const cities = [];
    
    // Addis Ababa
    const addisAbaba = createdRegions.find(r => r.name === "Addis Ababa");
    cities.push({ name: "Addis Ababa", region: addisAbaba._id });

    // Oromia
    const oromia = createdRegions.find(r => r.name === "Oromia");
    cities.push(
      { name: "Adama", region: oromia._id },
      { name: "Bishoftu", region: oromia._id },
      { name: "Jimma", region: oromia._id },
      { name: "Nekemte", region: oromia._id },
      { name: "Ambo", region: oromia._id },
      { name: "Shashamane", region: oromia._id }
    );

    // Amhara
    const amhara = createdRegions.find(r => r.name === "Amhara");
    cities.push(
      { name: "Bahir Dar", region: amhara._id },
      { name: "Gondar", region: amhara._id },
      { name: "Dessie", region: amhara._id },
      { name: "Debre Birhan", region: amhara._id },
      { name: "Debre Markos", region: amhara._id }
    );

    // Tigray
    const tigray = createdRegions.find(r => r.name === "Tigray");
    cities.push(
      { name: "Mekelle", region: tigray._id },
      { name: "Axum", region: tigray._id },
      { name: "Adigrat", region: tigray._id },
      { name: "Shire", region: tigray._id }
    );

    // Dire Dawa
    const direDawa = createdRegions.find(r => r.name === "Dire Dawa");
    cities.push({ name: "Dire Dawa", region: direDawa._id });

    // Harari
    const harari = createdRegions.find(r => r.name === "Harari");
    cities.push({ name: "Harar", region: harari._id });

    // Somali
    const somali = createdRegions.find(r => r.name === "Somali");
    cities.push(
      { name: "Jijiga", region: somali._id },
      { name: "Gode", region: somali._id },
      { name: "Kebri Dahar", region: somali._id }
    );

    // Sidama
    const sidama = createdRegions.find(r => r.name === "Sidama");
    cities.push(
      { name: "Hawassa", region: sidama._id },
      { name: "Yirgalem", region: sidama._id }
    );

    // Afar
    const afar = createdRegions.find(r => r.name === "Afar");
    cities.push(
      { name: "Semera", region: afar._id },
      { name: "Asayita", region: afar._id }
    );

    // Benishangul-Gumuz
    const benishangul = createdRegions.find(r => r.name === "Benishangul-Gumuz");
    cities.push(
      { name: "Asosa", region: benishangul._id },
      { name: "Metekel", region: benishangul._id }
    );

    // Gambela
    const gambela = createdRegions.find(r => r.name === "Gambela");
    cities.push({ name: "Gambela", region: gambela._id });

    // SNNPR
    const snnpr = createdRegions.find(r => r.name === "Southern Nations, Nationalities, and Peoples' Region");
    cities.push(
      { name: "Arba Minch", region: snnpr._id },
      { name: "Wolaita Sodo", region: snnpr._id },
      { name: "Hosanna", region: snnpr._id }
    );

    const createdCities = await City.create(cities);
    console.log(`✅ ${createdCities.length} cities imported!\n`);

    // Import Brands
    console.log("🚛 Importing brands...");
    const createdBrands = await Brand.create(brands);
    console.log(`✅ ${createdBrands.length} brands imported!\n`);

    // Import Features
    console.log("⚙️  Importing features...");
    const createdFeatures = await Feature.create(features);
    console.log(`✅ ${createdFeatures.length} features imported!\n`);

    // Import Carrier Types
    console.log("📦 Importing carrier types...");
    const createdCarrierTypes = await CarrierType.create(carrierTypes);
    console.log(`✅ ${createdCarrierTypes.length} carrier types imported!\n`);

    console.log("🎉 All filter data imported successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Regions: ${createdRegions.length}`);
    console.log(`   - Cities: ${createdCities.length}`);
    console.log(`   - Brands: ${createdBrands.length}`);
    console.log(`   - Features: ${createdFeatures.length}`);
    console.log(`   - Carrier Types: ${createdCarrierTypes.length}`);
    
  } catch (err) {
    console.error("❌ Error importing data:", err);
  }
  process.exit();
};

// Delete Data
const deleteData = async () => {
  try {
    console.log("🗑️  Deleting all filter data...");
    await Region.deleteMany();
    await City.deleteMany();
    await Brand.deleteMany();
    await Feature.deleteMany();
    await CarrierType.deleteMany();
    console.log("✅ All filter data deleted successfully!");
  } catch (err) {
    console.error("❌ Error deleting data:", err);
  }
  process.exit();
};

// Check command line arguments
if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
} else {
  console.log("❌ Invalid command!");
  console.log("\nUsage:");
  console.log("  node seed-filter-data.js --import   (Import filter data)");
  console.log("  node seed-filter-data.js --delete   (Delete filter data)");
  process.exit();
}
