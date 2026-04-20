const mongoose = require("mongoose");
const { Schema, model, Types } = mongoose;

const notificationSchema = new Schema(
  {
    recipientId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["BID_RECEIVED", "SHIPMENT_REQUEST_RECEIVED"],
      required: true,
    },

    referenceId: {
      type: Types.ObjectId,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    body: {
      type: String,
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, createdAt: -1 });

module.exports = model("Notification", notificationSchema);
