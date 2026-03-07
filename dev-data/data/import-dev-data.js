const mongoose = require("mongoose");
const fs = require("fs");
const dotenv = require("dotenv");

// Fix the path to config.env
dotenv.config({ path: "./config.env" });

const Freight = require("./../../model/freightModel");
const Carrier = require("./../../model/carrierModel");
const Company = require("./../../model/companyModel");

// Use the correct database connection
const DB = process.env.DATABASE_LOCAL || 'mongodb://localhost:27017/smart_truck';

console.log('Connecting to database:', DB);

mongoose
  .connect(DB, {})
  .then(() => {
    
    console.log("Database connection successful!");
    console.log("Connected to database:", mongoose.connection.name);
  })
  .catch((err) => {
    console.log("ERROR: " + err);
    process.exit(1);
  });

const companies = JSON.parse(
  fs.readFileSync(`${__dirname}/company.json`, "utf-8"),
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    console.log(`Importing ${companies.length} companies...`);
    const result = await Company.create(companies);
    console.log(`Data successfully loaded! Created ${result.length} companies.`);
    console.log("Collection name:", Company.collection.name);
    
    // Verify the data was inserted
    const count = await Company.countDocuments();
    console.log(`Total companies in database: ${count}`);
  } catch (err) {
    console.log("Import error:", err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    const result = await Company.deleteMany();
    console.log(`Data successfully deleted! Removed ${result.deletedCount} companies.`);
  } catch (err) {
    console.log("Delete error:", err);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
} else {
  process.exit();
}
