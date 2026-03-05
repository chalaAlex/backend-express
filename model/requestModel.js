const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

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
      ref: "Truck",
      required: true,
    },

    freightId: {
      type: Types.ObjectId,
      ref: "Freight",
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"],
      default: "PENDING",
    },

    // Freight information snapshot (embedded subdocument)
    freightSnapshot: {
      cargoType: {
        type: String,
        required: true,
      },
      weight: {
        type: Number,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
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
      pickupDate: {
        type: Date,
        required: true,
      },
      deliveryDate: {
        type: Date,
        required: true,
      },
      specialRequirements: String,
      distance: {
        type: Number,
        required: true,
      },
    },

    proposedPrice: {
      type: Number,
      min: [0, "Proposed price must be non-negative"],
    },

    // Freight owner contact info (embedded subdocument)
    freightOwnerContact: {
      name: String,
      companyName: String,
      email: String,
      phone: String,
    },
  },
  { timestamps: true },
);

// Compound unique index to prevent duplicate freight-carrier combinations
requestSchema.index({ freightId: 1, carrierId: 1 }, { unique: true });

module.exports = model("Request", requestSchema);
