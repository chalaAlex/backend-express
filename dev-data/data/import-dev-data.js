const mongoose = require('mongoose');
const fs = require('fs');
const dotenv = require('dotenv');
const Tour = require('./../../model/internModel');
const Intern = require('./../../model/internModel');
dotenv.config({ path: '../../config.env' });

mongoose.connect(process.env.DATABASE_LOCAL, {
}).then(() => console.log('Local database connection successfull!')).catch(err => {
  console.log("ERROR: " + err);
});

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8')
);

const interns = JSON.parse(
  fs.readFileSync(`${__dirname}/interns-simple.json`, 'utf-8')
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Intern.create(interns);
    // await Tour.create(interns);
    console.log('Data successfully loaded!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await Intern.deleteMany();
    // await Tour.deleteMany();
    console.log('Data successfully deleted!');
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

console.log(process.argv);