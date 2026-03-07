const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const bidsSchema = new Schema(
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

    bidAmount: {
      type: Number,
      required: true,
      min: [1, "Bid amount must be greater than 0"],
    },

    message: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"],
      default: "PENDING",
    },
  },
  { timestamps: true },
);

bidsSchema.index({ carrierId: 1, freightId: 1 }, { unique: true });

module.exports = model("Bids", bidsSchema);