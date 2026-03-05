const mongoose = require("mongoose");
const fs = require("fs");
const dotenv = require("dotenv");
const Freight = require("./../../model/freightModel");
dotenv.config({ path: "../../config.env" });
const Carrier = require("./../../model/carrierModel");
const Company = require("./../../model/companyModel");

mongoose
  .connect(process.env.DATABASE_LOCAL, {})
  .then(() => console.log("Local database connection successfull!"))
  .catch((err) => {
    console.log("ERROR: " + err);
  });

const company = JSON.parse(
  fs.readFileSync(`${__dirname}/company.json`, "utf-8"),
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Company.create(company);
    // await Tour.create(interns);
    console.log("Data successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Company.deleteMany();
    // await Tour.deleteMany();
    console.log("Data successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}
