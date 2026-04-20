const crypto = require('crypto');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Payment = require('../model/paymentModel');
const Freight = require('../model/freightModel');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const ShipmentRequest = require('../model/shipmentRequestModel');
const Bids = require('../model/bidsModel');
const telebirrService = require('../services/telebirrService');
const { releasePayment } = require('../services/releasePaymentService');

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveBooking(bookingType, sourceId, freightOwnerId) {
  if (bookingType === 'REQUEST') {
    let req = await ShipmentRequest.findOne({ _id: sourceId, freightOwnerId });
    if (!req) {
      req = await ShipmentRequest.findOne({ freightIds: sourceId, freightOwnerId });
    }
    if (!req) return null;
    return {
      freightId: req.freightIds[0],
      carrierOwnerId: req.carrierOwnerId,
      totalAmount: req.proposedPrice,
      resolvedSourceId: req._id,
    };
  } else if (bookingType === 'BID') {
    let bid = await Bids.findOne({ _id: sourceId, freightOwnerId });
    if (!bid) {
      bid = await Bids.findOne({ freightId: sourceId, freightOwnerId });
    }
    if (!bid) return null;
    return {
      freightId: bid.freightId,
      carrierOwnerId: bid.carrierOwnerId,
      totalAmount: bid.bidAmount,
      resolvedSourceId: bid._id,
    };
  } else if (bookingType === 'AUTO') {
    // Try ShipmentRequest first, then Bid — sourceId is always the freightId
    const req = await ShipmentRequest.findOne({ freightIds: sourceId, freightOwnerId });
    if (req) {
      return {
        freightId: req.freightIds[0],
        carrierOwnerId: req.carrierOwnerId,
        totalAmount: req.proposedPrice,
        resolvedSourceId: req._id,
        resolvedBookingType: 'REQUEST',
      };
    }
    const bid = await Bids.findOne({ freightId: sourceId, freightOwnerId });
    if (bid) {
      return {
        freightId: bid.freightId,
        carrierOwnerId: bid.carrierOwnerId,
        totalAmount: bid.bidAmount,
        resolvedSourceId: bid._id,
        resolvedBookingType: 'BID',
      };
    }
    return null;
  }
  return null;
}

// ─── Controllers ────────────────────────────────────────────────────────────

exports.initiatePayment = catchAsync(async (req, res, next) => {
  const { bookingType, sourceId } = req.body;

  if (!bookingType || !sourceId) {
    return next(new AppError('bookingType and sourceId are required', 400));
  }
  if (!['REQUEST', 'BID', 'AUTO'].includes(bookingType)) {
    return next(new AppError('bookingType must be REQUEST, BID, or AUTO', 400));
  }

  const booking = await resolveBooking(bookingType, sourceId, req.user._id);
  if (!booking) return next(new AppError('Booking not found', 404));

  const resolvedType = booking.resolvedBookingType || bookingType;
  const resolvedSourceId = booking.resolvedSourceId || sourceId;

  // Duplicate check
  const existing = await Payment.findOne({
    sourceId: resolvedSourceId,
    status: { $in: ['HELD', 'RELEASED'] },
  });
  if (existing) return next(new AppError('Booking has already been paid', 400));

  const { freightId, carrierOwnerId, totalAmount } = booking;
  const platformFee = parseFloat((totalAmount * 0.1).toFixed(2));
  const carrierAmount = parseFloat((totalAmount * 0.9).toFixed(2));
  const outTradeNo = `TRD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const payment = await Payment.create({
    outTradeNo,
    bookingType: resolvedType,
    sourceId: resolvedSourceId,
    freightId,
    freightOwnerId: req.user._id,
    carrierOwnerId,
    totalAmount,
    platformFee,
    carrierAmount,
    status: 'PENDING',
  });

  const notifyUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/v1/payments/webhook`;
  const returnUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/payment/success`;

  const { toPayUrl } = await telebirrService.initiatePayment({
    outTradeNo,
    totalAmount,
    notifyUrl,
    returnUrl,
    subject: `Freight payment ${freightId}`,
  });

  res.status(201).json({
    status: 'success',
    data: { payment, toPayUrl },
  });
});

exports.handleWebhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-telebirr-signature'];
  const isValid = telebirrService.verifyWebhookSignature(req.body, signature);
  if (!isValid) {
    return res.status(400).json({ status: 'fail', message: 'Invalid webhook signature' });
  }

  const { outTradeNo, transactionId, status: tbStatus } = req.body;

  // Only process successful payments
  if (tbStatus !== 'SUCCESS') {
    return res.status(200).json({ status: 'success', message: 'Non-success event acknowledged' });
  }

  const payment = await Payment.findOne({ outTradeNo });
  if (!payment) {
    return res.status(200).json({ status: 'success', error: 'Payment not found' });
  }

  // Idempotency: already processed
  if (payment.status !== 'PENDING') {
    return res.status(200).json({ status: 'success', message: 'Already processed' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const now = new Date();
    const releaseAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days

    payment.status = 'HELD';
    payment.telebirrTransactionId = transactionId;
    payment.paidAt = now;
    payment.releaseAt = releaseAt;
    await payment.save({ session });

    await Freight.findByIdAndUpdate(payment.freightId, { status: 'IN_TRANSIT' }, { session });

    const wallet = await Wallet.findOneAndUpdate(
      { carrierOwnerId: payment.carrierOwnerId },
      { $inc: { pendingBalance: payment.carrierAmount }, $setOnInsert: { currency: 'ETB' } },
      { upsert: true, new: true, session },
    );

    await WalletTransaction.create(
      [
        {
          walletId: wallet._id,
          paymentId: payment._id,
          type: 'HOLD',
          amount: payment.carrierAmount,
          description: `Escrow hold for freight ${payment.freightId}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }

  res.status(200).json({ status: 'success', message: 'Payment held in escrow' });
});

exports.releasePayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(new AppError('Payment not found', 404));

  if (payment.freightOwnerId.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  if (payment.status !== 'HELD') {
    return next(new AppError('Payment cannot be released in its current state', 400));
  }

  const released = await releasePayment(payment._id);

  res.status(200).json({ status: 'success', data: { payment: released } });
});

exports.disputePayment = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) return next(new AppError('Payment not found', 404));

  if (payment.freightOwnerId.toString() !== req.user._id.toString()) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }
  if (payment.status !== 'HELD') {
    return next(new AppError('Payment cannot be disputed in its current state', 400));
  }

  payment.status = 'DISPUTED';
  payment.releaseAt = undefined;
  await payment.save();

  res.status(200).json({ status: 'success', data: { payment } });
});

exports.getPaymentStatus = catchAsync(async (req, res, next) => {
  const payment = await Payment.findById(req.params.requestId);
  if (!payment) return next(new AppError('Payment not found', 404));

  const userId = req.user._id.toString();
  const isFreightOwner = payment.freightOwnerId.toString() === userId;
  const isCarrierOwner = payment.carrierOwnerId.toString() === userId;

  if (!isFreightOwner && !isCarrierOwner) {
    return next(new AppError('You do not have permission to perform this action', 403));
  }

  res.status(200).json({
    status: 'success',
    data: {
      payment: {
        _id: payment._id,
        status: payment.status,
        totalAmount: payment.totalAmount,
        platformFee: payment.platformFee,
        carrierAmount: payment.carrierAmount,
        paidAt: payment.paidAt,
        releasedAt: payment.releasedAt,
        releaseAt: payment.releaseAt,
        outTradeNo: payment.outTradeNo,
      },
    },
  });
});
