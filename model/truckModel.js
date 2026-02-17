const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const truckSchema = new mongoose.Schema(
  {
    truckOwner: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
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

    pricePerKm: {
      type: Number,
      required: true,
      min: 0,
    },

    loadCapacity: {
      type: Number,
      required: true,
      min: 0,
    },

    features: {
      type: String,
      required: true,
      enum: ["flatbed", "refrigerated", "dryVan"],
      lowercase: true,
    },

    location: {
      type: String,
      trim: true,
      required: true,
    },

    radiusKm: {
      type: Number,
      // required: true,
      min: 0,
    },

    image: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],

    isAvailable: {
      type: Boolean,
      default: true,
      index: true, // Frequently queried field
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Truck", truckSchema);
