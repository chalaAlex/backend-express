const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const walletTransactionSchema = new Schema(
  {
    walletId: { type: Types.ObjectId, ref: 'Wallet', required: true },
    paymentId: { type: Types.ObjectId, ref: 'Payment' },
    type: { type: String, enum: ['HOLD', 'RELEASE', 'DEBIT', 'CREDIT'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

module.exports = model('WalletTransaction', walletTransactionSchema);
