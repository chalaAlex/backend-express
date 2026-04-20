const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const WithdrawalRequest = require('../model/withdrawalRequestModel');

exports.getWallet = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'carrier_owner') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const wallet = await Wallet.findOneAndUpdate(
    { carrierOwnerId: req.user._id },
    { $setOnInsert: { currency: 'ETB', balance: 0, pendingBalance: 0 } },
    { upsert: true, new: true },
  );

  res.status(200).json({
    status: 'success',
    data: {
      wallet: {
        _id: wallet._id,
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        currency: wallet.currency,
      },
    },
  });
});

exports.getTransactions = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'carrier_owner') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const wallet = await Wallet.findOne({ carrierOwnerId: req.user._id });
  if (!wallet) {
    return res.status(200).json({ status: 'success', data: { transactions: [], total: 0 } });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ walletId: wallet._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    WalletTransaction.countDocuments({ walletId: wallet._id }),
  ]);

  res.status(200).json({
    status: 'success',
    data: { transactions, total, page, limit },
  });
});

exports.requestWithdrawal = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'carrier_owner') {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError('Withdrawal amount must be greater than zero', 400));
  }

  const wallet = await Wallet.findOne({ carrierOwnerId: req.user._id });
  if (!wallet || wallet.balance < amount) {
    return next(new AppError('Insufficient wallet balance', 400));
  }

  const pendingExists = await WithdrawalRequest.findOne({
    carrierOwnerId: req.user._id,
    status: 'PENDING',
  });
  if (pendingExists) {
    return next(new AppError('A withdrawal request is already pending', 400));
  }

  const withdrawal = await WithdrawalRequest.create({
    carrierOwnerId: req.user._id,
    walletId: wallet._id,
    amount,
    status: 'PENDING',
  });

  res.status(201).json({ status: 'success', data: { withdrawal } });
});
