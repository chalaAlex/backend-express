const mongoose = require("mongoose");

const OperatingCorrider = new mongoose.Schema({
  startLocation: {
    type: String,
    default: "Addis Abeba",
  },

  destinationLocation: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("OperatingCorrider", OperatingCorrider);
