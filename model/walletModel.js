const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const walletSchema = new Schema(
  {
    carrierOwnerId: { type: Types.ObjectId, ref: 'User', unique: true, required: true },
    balance: { type: Number, default: 0 },         // available balance
    pendingBalance: { type: Number, default: 0 },  // held, not yet released
    currency: { type: String, default: 'ETB' },
  },
  { timestamps: true },
);

module.exports = model('Wallet', walletSchema);
