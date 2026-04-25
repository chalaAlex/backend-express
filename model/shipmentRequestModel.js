const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const freightSnapshotSchema = new Schema(
  {
    freightId: {
      type: Types.ObjectId,
      ref: "Freight",
      required: true,
    },
    cargoType: { type: String, required: true },
    weight: { type: Number, required: true },
    quantity: { type: Number, required: true },
    pickupLocation: {
      region: String,
      city: String,
      address: String,
    },
    deliveryLocation: {
      region: String,
      city: String,
      address: String,
    },
    pickupDate: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    specialRequirements: String,
  },
  { _id: false },
);

const requestSchema = new Schema(
  {
    freightOwnerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    carrierOwnerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    carrierId: {
      type: Types.ObjectId,
      ref: "Carrier",
      required: true,
    },

    freightIds: [
      {
        type: Types.ObjectId,
        ref: "Freight",
        required: true,
      },
    ],

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "IN_TRANSIT", "COMPLETED"],
      default: "COMPLETED",
    },

    isReviewed: {
      type: Boolean,
      default: false,
    },

    // One snapshot per freight
    freightSnapshots: [freightSnapshotSchema],

    proposedPrice: {
      type: Number,
      min: [0, "Proposed price must be non-negative"],
    },

    freightOwnerContact: {
      name: String,
      companyName: String,
      email: String,
      phone: String,
    },
  },
  { timestamps: true },
);

// One request per carrier per freight owner
requestSchema.index({ carrierId: 1, freightIds: 1 }, { unique: true });

module.exports = model("ShipmentRequest", requestSchema);