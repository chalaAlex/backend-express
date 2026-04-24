const Payment = require('../model/paymentModel');
const Freight = require('../model/freightModel');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const AppError = require('../utils/appError');

/**
 * Release a HELD payment to the carrier's wallet.
 * Runs sequentially — no MongoDB transaction required (compatible with
 * standalone local instances that don't support replica-set transactions).
 *
 * Called from: manual release, auto-release cron, admin dispute resolution.
 */
async function releasePayment(paymentId) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new AppError('Payment not found', 404);
  if (payment.status !== 'HELD') {
    throw new AppError('Payment cannot be released in its current state', 400);
  }

  const now = new Date();

  // 1. Update payment status
  payment.status = 'RELEASED';
  payment.releasedAt = now;
  await payment.save();

  // 2. Update freight status to COMPLETED
  await Freight.findByIdAndUpdate(payment.freightId, { status: 'COMPLETED' });

  // 3. Move carrierAmount from pendingBalance → balance
  const wallet = await Wallet.findOneAndUpdate(
    { carrierOwnerId: payment.carrierOwnerId },
    {
      $inc: { balance: payment.carrierAmount, pendingBalance: -payment.carrierAmount },
      $setOnInsert: { currency: 'ETB' },
    },
    { upsert: true, new: true },
  );

  // 4. Record RELEASE wallet transaction
  await WalletTransaction.create({
    walletId: wallet._id,
    paymentId: payment._id,
    type: 'RELEASE',
    amount: payment.carrierAmount,
    description: `Payment released for freight ${payment.freightId}`,
  });

  return payment;
}

module.exports = { releasePayment };
