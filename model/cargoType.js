const mongoose = require("mongoose");
const CargoTypeScheme = new mongoose.Schema({
  cargoType: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("CargoType", CargoTypeScheme);
