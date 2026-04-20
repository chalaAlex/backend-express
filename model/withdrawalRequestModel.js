const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const withdrawalRequestSchema = new Schema(
  {
    carrierOwnerId: { type: Types.ObjectId, ref: 'User', required: true },
    walletId: { type: Types.ObjectId, ref: 'Wallet', required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = model('WithdrawalRequest', withdrawalRequestSchema);
