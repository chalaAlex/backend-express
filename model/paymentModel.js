const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const paymentSchema = new Schema(
  {
    outTradeNo: { type: String, unique: true, required: true },
    bookingType: { type: String, enum: ['REQUEST', 'BID'], required: true },
    sourceId: { type: Types.ObjectId, required: true }, // ShipmentRequest._id or Bids._id
    freightId: { type: Types.ObjectId, ref: 'Freight', required: true },
    freightOwnerId: { type: Types.ObjectId, ref: 'User', required: true },
    carrierOwnerId: { type: Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true }, // 10% of totalAmount
    carrierAmount: { type: Number, required: true }, // 90% of totalAmount
    gateway: { type: String, enum: ['telebirr', 'cbe', 'chapa'], required: true },
    status: {
      type: String,
      enum: ['PENDING', 'HELD', 'RELEASED', 'DISPUTED', 'REFUNDED'],
      default: 'PENDING',
    },
    paidAt: { type: Date },
    releasedAt: { type: Date },
    releaseAt: { type: Date }, // paidAt + 2 days
  },
  { timestamps: true },
);

module.exports = model('Payment', paymentSchema);
