const mongoose = require("mongoose");
const { Types } = mongoose;

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

const truckSchema = new mongoose.Schema(
  {
    truckOwner: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    driver: [
      {
        type: Types.ObjectId,
        ref: "User",
      },
    ],

    company: {
      type: Types.ObjectId,
      ref: "Company",
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    plateNumber: {
      type: String,
      unique: true,
      required: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    loadCapacity: {
      type: Number,
      required: true,
      min: 0,
    },

    features: [
      {
        type: String,
        required: true,
      },
    ],

    operatingCorrider: {
      type: OperatingCorrider,
      required: true,
    },

    image: [
      {
        type: String,
        trim: true,
      },
    ],

    aboutTruck: {
      type: String,
      required: true,
      max: 150,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true, // Frequently queried field
    },
    isFeatured: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Carrier", truckSchema);