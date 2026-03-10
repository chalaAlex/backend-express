const mongoose = require("mongoose");
const User = require("../model/userModel");

const driverSchema = new mongoose.Schema({
  licenseNumber: {
    type: String,
    required: true,
  },

  licenseExpiry: Date,

  assignedTruck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Carrier",
  },

  carrierOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Driver = User.discriminator("driver", driverSchema);

module.exports = Driver;
