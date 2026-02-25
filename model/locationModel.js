const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
  },
  city: Array,
});

module.exports = mongoose.model("Location", locationSchema);