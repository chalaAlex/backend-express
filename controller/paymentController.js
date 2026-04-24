const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Payment = require('../model/paymentModel');
const Freight = require('../model/freightModel');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const ShipmentRequest = require('../model/shipmentRequestModel');
const Bids = require('../model/bidsModel');
const User = require('../model/userModel');
const { releasePayment } = require('../services/releasePaymentService');
const { notify } = require('../utils/emailNotificationService');

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveBooking(bookingType, sourceId, freightOwnerId) {
  if (bookingType === 'REQUEST') {
    let req = await ShipmentRequest.findOne({ _id: sourceId, freightOwnerId });
    if (!req) req = await ShipmentRequest.findOne({ freightIds: sourceId, freightOwnerId });
    if (!req) return null;
    return {
      freightId: req.freightIds[0],
      carrierOwnerId: req.carrierOwnerId,
      totalAmount: req.proposedPrice,
      resolvedSourceId: req._id,
      resolvedBookingType: 'REQUEST',
    };
  }

  if (bookingType === 'BID') {
    let bid = await Bids.findOne({ _id: sourceId, freightOwnerId });
    if (!bid) bid = await Bids.findOne({ freightId: sourceId, freightOwnerId });
    if (!bid) return null;
    return {
      freightId: bid.freightId,
      carrierOwnerId: bid.carrierOwnerId,
      totalAmount: bid.bidAmount,
      resolvedSourceId: bid._id,
      resolvedBookingType: 'BID',
    };
  }

  // AUTO — sourceId is the freightId, try REQUEST first then BID
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

// ─── Controllers ────────────────────────────────────────────────────────────

// POST /payments/initiate
// Freight owner selects a gateway and creates a PENDING payment record.
// No external API is called — the app navigates to the mock checkout screen.
exports.initiatePayment = catchAsync(async (req, res, next) => {
  const { bookingType, sourceId, gateway } = req.body;

  if (!bookingType || !sourceId) {
    return next(new AppError('bookingType and sourceId are required', 400));
  }
  if (!['REQUEST', 'BID', 'AUTO'].includes(bookingType)) {
    return next(new AppError('bookingType must be REQUEST, BID, or AUTO', 400));
  }
  if (!['telebirr', 'cbe', 'chapa'].includes(gateway)) {
    return next(new AppError('gateway must be telebirr, cbe, or chapa', 400));
  }

  const booking = await resolveBooking(bookingType, sourceId, req.user._id);
  if (!booking) return next(new AppError('Booking not found', 404));

  // Duplicate guard — if a PENDING payment already exists, return it so the
  // user can resume the checkout they already started instead of erroring.
  // If HELD or RELEASED, block it — booking is already paid.
  const existing = await Payment.findOne({
    sourceId: booking.resolvedSourceId,
    status: { $in: ['PENDING', 'HELD', 'RELEASED'] },
  });
  if (existing) {
    if (existing.status === 'PENDING') {
      // Resume — return the existing pending payment so the app goes to checkout
      return res.status(200).json({
        status: 'success',
        data: { payment: existing },
      });
    }
    return next(new AppError('This booking has already been paid', 400));
  }

  const { freightId, carrierOwnerId, totalAmount } = booking;
  const platformFee = parseFloat((totalAmount * 0.1).toFixed(2));
  const carrierAmount = parseFloat((totalAmount * 0.9).toFixed(2));
  const outTradeNo = `TRD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const payment = await Payment.create({
    outTradeNo,
    bookingType: booking.resolvedBookingType,
    sourceId: booking.resolvedSourceId,
    freightId,
    freightOwnerId: req.user._id,
    carrierOwnerId,
    totalAmount,
    platformFee,
    carrierAmount,
    gateway,
    status: 'PENDING',
  });

  res.status(201).json({
    status: 'success',
    data: { payment },
  });
});

// POST /payments/confirm
// Called when the user taps "Pay Now" on the mock checkout screen.
// Runs the escrow operations sequentially (no transaction — local MongoDB
// standalone does not support multi-document transactions).
exports.confirmPayment = catchAsync(async (req, res, next) => {
  const { outTradeNo } = req.body;

  if (!outTradeNo) return next(new AppError('outTradeNo is required', 400));

  const payment = await Payment.findOne({ outTradeNo });
  if (!payment) return next(new AppError('Payment not found', 404));

  if (payment.status !== 'PENDING') {
    return next(new AppError('Payment has already been processed', 400));
  }

  const now = new Date();
  const releaseAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days

  // 1. Move payment to HELD
  payment.status = 'HELD';
  payment.paidAt = now;
  payment.releaseAt = releaseAt;
  await payment.save();

  // 2. Freight → IN_TRANSIT
  await Freight.findByIdAndUpdate(payment.freightId, { status: 'IN_TRANSIT' });

  // 3. Credit carrier's pending wallet balance
  const wallet = await Wallet.findOneAndUpdate(
    { carrierOwnerId: payment.carrierOwnerId },
    {
      $inc: { pendingBalance: payment.carrierAmount },
      $setOnInsert: { currency: 'ETB', balance: 0 },
    },
    { upsert: true, new: true },
  );

  // 4. Record HOLD wallet transaction
  await WalletTransaction.create({
    walletId: wallet._id,
    paymentId: payment._id,
    type: 'HOLD',
    amount: payment.carrierAmount,
    description: `Escrow hold for freight ${payment.freightId}`,
  });

  // 5. Send email to carrier owner (non-blocking)
  try {
    const [carrier, freight] = await Promise.all([
      User.findById(payment.carrierOwnerId).select('email firstName lastName'),
      Freight.findById(payment.freightId).select('route schedule'),
    ]);
    await notify('payment.confirmed', { payment, carrier, freight });
  } catch (err) {
    console.error('[confirmPayment] Email notification failed:', err.message);
  }

  res.status(200).json({
    status: 'success',
    data: { payment },
  });
});

// POST /payments/:id/release
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

// POST /payments/:id/dispute
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
  payment.releaseAt = undefined; // cron will skip it
  await payment.save();

  res.status(200).json({ status: 'success', data: { payment } });
});

// GET /payments/my-payments
// Returns all payments for the logged-in user (works for both roles).
exports.getMyPayments = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const role = req.user.role;

  const filter = role === 'carrier_owner'
    ? { carrierOwnerId: userId }
    : { freightOwnerId: userId };

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    data: { payments, total, page, limit },
  });
});

// GET /payments/by-freight/:freightId
// Returns the active (HELD) payment for a freight so the owner can release it.
exports.getPaymentByFreight = catchAsync(async (req, res, next) => {
  const payment = await Payment.findOne({
    freightId: req.params.freightId,
    freightOwnerId: req.user._id,
    status: 'HELD',
  });
  if (!payment) return next(new AppError('No active payment found for this freight', 404));

  res.status(200).json({
    status: 'success',
    data: {
      payment: {
        _id: payment._id,
        status: payment.status,
        gateway: payment.gateway,
        totalAmount: payment.totalAmount,
        platformFee: payment.platformFee,
        carrierAmount: payment.carrierAmount,
        outTradeNo: payment.outTradeNo,
        paidAt: payment.paidAt,
        releaseAt: payment.releaseAt,
      },
    },
  });
});

// GET /payments/:requestId
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
        gateway: payment.gateway,
        totalAmount: payment.totalAmount,
        platformFee: payment.platformFee,
        carrierAmount: payment.carrierAmount,
        outTradeNo: payment.outTradeNo,
        paidAt: payment.paidAt,
        releasedAt: payment.releasedAt,
        releaseAt: payment.releaseAt,
      },
    },
  });
});
