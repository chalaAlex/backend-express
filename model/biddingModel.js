const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const biddingSchema = new Schema(
  {
    freightOwnerId: {
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
  },
  { timestamps: true },
);

biddingSchema.index({ carrierId: 1, freightId: 1 }, { unique: true });

module.exports = model("Bidding", biddingSchema);
