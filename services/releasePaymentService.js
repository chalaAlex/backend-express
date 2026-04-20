const mongoose = require('mongoose');
const Payment = require('../model/paymentModel');
const Freight = require('../model/freightModel');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const AppError = require('../utils/appError');

/**
 * Atomically release a HELD payment to the carrier's wallet.
 * Can be called from manual release, auto-release, or admin dispute resolution.
 *
 * @param {string|ObjectId} paymentId
 * @param {mongoose.ClientSession|null} [session] - optional existing session
 */
async function releasePayment(paymentId, session = null) {
  const ownSession = !session;
  if (ownSession) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) throw new AppError('Payment not found', 404);
    if (payment.status !== 'HELD') {
      throw new AppError('Payment cannot be released in its current state', 400);
    }

    const now = new Date();

    // 1. Update payment status
    payment.status = 'RELEASED';
    payment.releasedAt = now;
    await payment.save({ session });

    // 2. Update freight status to COMPLETED
    await Freight.findByIdAndUpdate(
      payment.freightId,
      { status: 'COMPLETED' },
      { session },
    );

    // 3. Upsert wallet and credit carrierAmount
    const wallet = await Wallet.findOneAndUpdate(
      { carrierOwnerId: payment.carrierOwnerId },
      {
        $inc: { balance: payment.carrierAmount, pendingBalance: -payment.carrierAmount },
        $setOnInsert: { currency: 'ETB' },
      },
      { upsert: true, new: true, session },
    );

    // 4. Create RELEASE WalletTransaction
    await WalletTransaction.create(
      [
        {
          walletId: wallet._id,
          paymentId: payment._id,
          type: 'RELEASE',
          amount: payment.carrierAmount,
          description: `Payment released for freight ${payment.freightId}`,
        },
      ],
      { session },
    );

    if (ownSession) {
      await session.commitTransaction();
      session.endSession();
    }

    return payment;
  } catch (err) {
    if (ownSession) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
}

module.exports = { releasePayment };
