const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const Region = require('../../model/regionModel');
const City = require('../../model/cityModel');
const CargoType = require('../../model/cargoType');
const Location = require('../../model/locationModel');

dotenv.config({ path: path.resolve(__dirname, '../../config.env') });

// const DB = process.env.DATABASE_LOCAL || 'mongodb://localhost:27017/smart_truck';

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB)
  .then(() => console.log('✅ DB connected'))
  .catch((err) => { console.error('❌ DB connection failed:', err); process.exit(1); });

// ── Seed data ─────────────────────────────────────────────────────────────────

const cargoTypes = [
  { cargoType: 'General Cargo' },
  { cargoType: 'Perishable Goods' },
  { cargoType: 'Hazardous Materials' },
  { cargoType: 'Livestock' },
  { cargoType: 'Construction Materials' },
  { cargoType: 'Agricultural Products' },
  { cargoType: 'Electronics' },
  { cargoType: 'Furniture' },
  { cargoType: 'Fuel & Petroleum' },
  { cargoType: 'Medical Supplies' },
  { cargoType: 'Textiles & Clothing' },
  { cargoType: 'Machinery & Equipment' },
];

const regions = [
  { name: 'Addis Ababa', country: 'Ethiopia' },
  { name: 'Afar', country: 'Ethiopia' },
  { name: 'Amhara', country: 'Ethiopia' },
  { name: 'Benishangul-Gumuz', country: 'Ethiopia' },
  { name: 'Dire Dawa', country: 'Ethiopia' },
  { name: 'Gambela', country: 'Ethiopia' },
  { name: 'Harari', country: 'Ethiopia' },
  { name: 'Oromia', country: 'Ethiopia' },
  { name: 'Sidama', country: 'Ethiopia' },
  { name: 'Somali', country: 'Ethiopia' },
  { name: "Southern Nations, Nationalities, and Peoples' Region", country: 'Ethiopia' },
  { name: 'Tigray', country: 'Ethiopia' },
];

// Cities keyed by region name
const citiesByRegion = {
  'Addis Ababa': ['Addis Ababa'],
  'Afar': ['Semera', 'Asayita', 'Logia'],
  'Amhara': ['Bahir Dar', 'Gondar', 'Dessie', 'Debre Birhan', 'Debre Markos', 'Woldia'],
  'Benishangul-Gumuz': ['Asosa', 'Metekel', 'Kamashi'],
  'Dire Dawa': ['Dire Dawa'],
  'Gambela': ['Gambela', 'Itang'],
  'Harari': ['Harar'],
  'Oromia': ['Adama', 'Bishoftu', 'Jimma', 'Nekemte', 'Ambo', 'Shashamane', 'Bale Robe', 'Asella'],
  'Sidama': ['Hawassa', 'Yirgalem'],
  'Somali': ['Jijiga', 'Gode', 'Kebri Dahar', 'Dolo Odo'],
  "Southern Nations, Nationalities, and Peoples' Region": ['Arba Minch', 'Wolaita Sodo', 'Hosanna', 'Dilla'],
  'Tigray': ['Mekelle', 'Axum', 'Adigrat', 'Shire'],
};

// Location documents — flat { region, city[] } shape used by the /location endpoint
const locations = [
  { region: 'Addis Ababa', city: ['Addis Ababa'] },
  { region: 'Afar', city: ['Semera', 'Asayita', 'Logia'] },
  { region: 'Amhara', city: ['Bahir Dar', 'Gondar', 'Dessie', 'Debre Birhan', 'Debre Markos', 'Woldia'] },
  { region: 'Benishangul-Gumuz', city: ['Asosa', 'Metekel', 'Kamashi'] },
  { region: 'Dire Dawa', city: ['Dire Dawa'] },
  { region: 'Gambela', city: ['Gambela', 'Itang'] },
  { region: 'Harari', city: ['Harar'] },
  { region: 'Oromia', city: ['Adama', 'Bishoftu', 'Jimma', 'Nekemte', 'Ambo', 'Shashamane', 'Bale Robe', 'Asella'] },
  { region: 'Sidama', city: ['Hawassa', 'Yirgalem'] },
  { region: 'Somali', city: ['Jijiga', 'Gode', 'Kebri Dahar', 'Dolo Odo'] },
  { region: "Southern Nations, Nationalities, and Peoples' Region", city: ['Arba Minch', 'Wolaita Sodo', 'Hosanna', 'Dilla'] },
  { region: 'Tigray', city: ['Mekelle', 'Axum', 'Adigrat', 'Shire'] },
];

// ── Import ────────────────────────────────────────────────────────────────────

const importData = async () => {
  try {
    // Cargo types
    console.log('📦 Importing cargo types...');
    await CargoType.deleteMany();
    const createdCargo = await CargoType.create(cargoTypes);
    console.log(`   ✅ ${createdCargo.length} cargo types imported`);

    // Regions
    console.log('📍 Importing regions...');
    await Region.deleteMany();
    const createdRegions = await Region.create(regions);
    console.log(`   ✅ ${createdRegions.length} regions imported`);

    // Cities — build array with resolved region ObjectIds`
    console.log('🏙️  Importing cities...');
    await City.deleteMany();
    const cities = [];
    for (const r of createdRegions) {
      const names = citiesByRegion[r.name] ?? [];
      for (const name of names) {
        cities.push({ name, region: r._id });
      }
    }
    const createdCities = await City.create(cities);
    console.log(`   ✅ ${createdCities.length} cities imported`);

    // Location — flat { region, city[] } for the /location endpoint
    console.log('📌 Importing locations...');
    await Location.deleteMany();
    const createdLocations = await Location.create(locations);
    console.log(`   ✅ ${createdLocations.length} location records imported`);

    console.log('\n🎉 Done!');
    console.log(`   Cargo types : ${createdCargo.length}`);
    console.log(`   Regions     : ${createdRegions.length}`);
    console.log(`   Cities      : ${createdCities.length}`);
    console.log(`   Locations   : ${createdLocations.length}`);
  } catch (err) {
    console.error('❌ Import failed:', err);
  }
  process.exit();
};

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteData = async () => {
  try {
    console.log('🗑️  Deleting cargo types, regions, cities and locations...');
    await Promise.all([
      CargoType.deleteMany(),
      City.deleteMany(),
      Region.deleteMany(),
      Location.deleteMany(),
    ]);
    console.log('✅ All data deleted');
  } catch (err) {
    console.error('❌ Delete failed:', err);
  }
  process.exit();
};

// ── CLI ───────────────────────────────────────────────────────────────────────

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
} else {
  console.log('Usage:');
  console.log('  node seed-cargo-region-city.js --import');
  console.log('  node seed-cargo-region-city.js --delete');
  process.exit();
}
