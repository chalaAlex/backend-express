const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Payment = require('../model/paymentModel');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const WithdrawalRequest = require('../model/withdrawalRequestModel');
const { releasePayment } = require('../services/releasePaymentService');

// ─── Disputes ────────────────────────────────────────────────────────────────

exports.listDisputes = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [disputes, total] = await Promise.all([
    Payment.find({ status: 'DISPUTED' }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments({ status: 'DISPUTED' }),
  ]);

  res.status(200).json({ status: 'success', data: { disputes, total, page, limit } });
});

exports.resolveDispute = catchAsync(async (req, res, next) => {
  const { resolution } = req.body; // 'RELEASE' or 'REFUND'
  const payment = await Payment.findById(req.params.id);

  if (!payment) return next(new AppError('Payment not found', 404));
  if (payment.status !== 'DISPUTED') {
    return next(new AppError('Payment is not in DISPUTED status', 400));
  }

  if (resolution === 'RELEASE') {
    // Temporarily set to HELD so releasePayment can process it
    payment.status = 'HELD';
    await payment.save();
    const released = await releasePayment(payment._id);
    return res.status(200).json({ status: 'success', data: { payment: released } });
  }

  if (resolution === 'REFUND') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      payment.status = 'REFUNDED';
      await payment.save({ session });

      // Reverse the HOLD transaction by decrementing pendingBalance
      await Wallet.findOneAndUpdate(
        { carrierOwnerId: payment.carrierOwnerId },
        { $inc: { pendingBalance: -payment.carrierAmount } },
        { session },
      );

      // Mark the original HOLD transaction as reversed via a CREDIT entry
      const wallet = await Wallet.findOne({ carrierOwnerId: payment.carrierOwnerId }).session(session);
      if (wallet) {
        await WalletTransaction.create(
          [
            {
              walletId: wallet._id,
              paymentId: payment._id,
              type: 'CREDIT',
              amount: -payment.carrierAmount,
              description: `Refund reversal for disputed payment ${payment._id}`,
            },
          ],
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }

    return res.status(200).json({ status: 'success', data: { payment } });
  }

  return next(new AppError('resolution must be RELEASE or REFUND', 400));
});

// ─── Withdrawals ─────────────────────────────────────────────────────────────

exports.listWithdrawals = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const [withdrawals, total] = await Promise.all([
    WithdrawalRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    WithdrawalRequest.countDocuments(filter),
  ]);

  res.status(200).json({ status: 'success', data: { withdrawals, total, page, limit } });
});

exports.processWithdrawal = catchAsync(async (req, res, next) => {
  const { status } = req.body; // 'APPROVED' or 'REJECTED'
  const withdrawal = await WithdrawalRequest.findById(req.params.id);

  if (!withdrawal) return next(new AppError('Withdrawal request not found', 404));
  if (withdrawal.status !== 'PENDING') {
    return next(new AppError('Withdrawal request is not in PENDING status', 400));
  }

  const now = new Date();

  if (status === 'APPROVED') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const wallet = await Wallet.findById(withdrawal.walletId).session(session);
      if (!wallet || wallet.balance < withdrawal.amount) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError('Insufficient wallet balance', 400));
      }

      wallet.balance -= withdrawal.amount;
      await wallet.save({ session });

      await WalletTransaction.create(
        [
          {
            walletId: wallet._id,
            paymentId: null,
            type: 'DEBIT',
            amount: withdrawal.amount,
            description: `Withdrawal approved for carrier ${withdrawal.carrierOwnerId}`,
          },
        ],
        { session },
      );

      withdrawal.status = 'APPROVED';
      withdrawal.processedAt = now;
      await withdrawal.save({ session });

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }

    return res.status(200).json({ status: 'success', data: { withdrawal } });
  }

  if (status === 'REJECTED') {
    withdrawal.status = 'REJECTED';
    withdrawal.processedAt = now;
    await withdrawal.save();
    return res.status(200).json({ status: 'success', data: { withdrawal } });
  }

  return next(new AppError('status must be APPROVED or REJECTED', 400));
});
