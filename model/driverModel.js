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
    ref: "Truck",
  },

  carrierOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Driver = User.discriminator("Driver", driverSchema);
