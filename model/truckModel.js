const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema(
  {
    // Business ID (separate from Mongo _id)
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: String,
      required: true,
      trim: true,
    },

    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },

    capacityTons: {
      type: Number,
      required: true,
      min: 0,
    },

    carrierType: {
      type: String,
      required: true,
      enum: ["flatbed", "refrigerated", "dryVan"],
      lowercase: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      index: true, // Enables location-based filtering
    },

    radiusKm: {
      type: Number,
      required: true,
      min: 0,
    },

    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true, // Frequently queried field
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
    versionKey: false,
  },
);

module.exports = mongoose.model("Truck", truckSchema);
