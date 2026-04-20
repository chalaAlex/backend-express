/**
 * Unit tests for paymentController
 * Validates: Requirements 1.1-1.6, 2.1-2.7, 3.1-3.5, 5.1-5.4, 9.1-9.3
 */

jest.mock('../model/paymentModel');
jest.mock('../model/freightModel');
jest.mock('../model/walletModel');
jest.mock('../model/walletTransactionModel');
jest.mock('../model/shipmentRequestModel');
jest.mock('../model/bidsModel');
jest.mock('../services/telebirrService');
jest.mock('../services/releasePaymentService');
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
  };
});

const Payment = require('../model/paymentModel');
const Freight = require('../model/freightModel');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const ShipmentRequest = require('../model/shipmentRequestModel');
const Bids = require('../model/bidsModel');
const telebirrService = require('../services/telebirrService');
const { releasePayment: releasePaymentService } = require('../services/releasePaymentService');

const {
  initiatePayment,
  handleWebhook,
  releasePayment,
  disputePayment,
  getPaymentStatus,
} = require('../controller/paymentController');

function mockReqRes(overrides = {}) {
  const req = { body: {}, params: {}, headers: {}, user: { _id: 'freight-owner-id' }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

describe('initiatePayment', () => {
  test('returns 400 if bookingType or sourceId missing', async () => {
    const { req, res, next } = mockReqRes({ body: {} });
    await initiatePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('returns 400 if bookingType is invalid', async () => {
    const { req, res, next } = mockReqRes({ body: { bookingType: 'INVALID', sourceId: 'sid' } });
    await initiatePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('returns 404 if REQUEST booking not found', async () => {
    ShipmentRequest.findOne = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ body: { bookingType: 'REQUEST', sourceId: 'sid' } });
    await initiatePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('returns 404 if BID booking not found', async () => {
    Bids.findOne = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ body: { bookingType: 'BID', sourceId: 'sid' } });
    await initiatePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('returns 400 if payment already HELD for same sourceId', async () => {
    ShipmentRequest.findOne = jest.fn().mockResolvedValue({ freightIds: ['fid'], carrierOwnerId: 'cid', proposedPrice: 1000 });
    Payment.findOne = jest.fn().mockResolvedValue({ status: 'HELD' });
    const { req, res, next } = mockReqRes({ body: { bookingType: 'REQUEST', sourceId: 'sid' } });
    await initiatePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('computes platformFee=10% and carrierAmount=90% of totalAmount', async () => {
    ShipmentRequest.findOne = jest.fn().mockResolvedValue({ freightIds: ['fid'], carrierOwnerId: 'cid', proposedPrice: 1000 });
    Payment.findOne = jest.fn().mockResolvedValue(null);
    Payment.create = jest.fn().mockResolvedValue({ _id: 'pid' });
    telebirrService.initiatePayment = jest.fn().mockResolvedValue({ toPayUrl: 'https://pay.url' });

    const { req, res, next } = mockReqRes({ body: { bookingType: 'REQUEST', sourceId: 'sid' } });
    await initiatePayment(req, res, next);

    const args = Payment.create.mock.calls[0][0];
    expect(args.platformFee).toBeCloseTo(100);
    expect(args.carrierAmount).toBeCloseTo(900);
    expect(args.status).toBe('PENDING');
  });

  test('returns 201 with toPayUrl on success', async () => {
    ShipmentRequest.findOne = jest.fn().mockResolvedValue({ freightIds: ['fid'], carrierOwnerId: 'cid', proposedPrice: 500 });
    Payment.findOne = jest.fn().mockResolvedValue(null);
    Payment.create = jest.fn().mockResolvedValue({ _id: 'pid' });
    telebirrService.initiatePayment = jest.fn().mockResolvedValue({ toPayUrl: 'https://pay.url' });

    const { req, res, next } = mockReqRes({ body: { bookingType: 'REQUEST', sourceId: 'sid' } });
    await initiatePayment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toPayUrl: 'https://pay.url' }) }));
  });
});

describe('handleWebhook', () => {
  test('returns 400 if signature is invalid', async () => {
    telebirrService.verifyWebhookSignature = jest.fn().mockReturnValue(false);
    const { req, res, next } = mockReqRes({ body: { outTradeNo: 'TRD-1', status: 'SUCCESS' }, headers: { 'x-telebirr-signature': 'bad' } });
    await handleWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 200 with error acknowledgment if outTradeNo not found', async () => {
    telebirrService.verifyWebhookSignature = jest.fn().mockReturnValue(true);
    Payment.findOne = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ body: { outTradeNo: 'TRD-UNKNOWN', status: 'SUCCESS' }, headers: { 'x-telebirr-signature': 'sig' } });
    await handleWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Payment not found' }));
  });

  test('returns 200 without reprocessing if already HELD (idempotency)', async () => {
    telebirrService.verifyWebhookSignature = jest.fn().mockReturnValue(true);
    Payment.findOne = jest.fn().mockResolvedValue({ status: 'HELD' });
    const { req, res, next } = mockReqRes({ body: { outTradeNo: 'TRD-1', status: 'SUCCESS' }, headers: { 'x-telebirr-signature': 'sig' } });
    await handleWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Already processed' }));
  });

  test('acknowledges non-SUCCESS events without processing', async () => {
    telebirrService.verifyWebhookSignature = jest.fn().mockReturnValue(true);
    const { req, res, next } = mockReqRes({ body: { outTradeNo: 'TRD-1', status: 'FAILED' }, headers: { 'x-telebirr-signature': 'sig' } });
    await handleWebhook(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(Payment.findOne).not.toHaveBeenCalled();
  });

  test('transitions PENDING to HELD, sets releaseAt +2 days, updates freight to IN_TRANSIT', async () => {
    telebirrService.verifyWebhookSignature = jest.fn().mockReturnValue(true);
    const payment = {
      status: 'PENDING', freightId: 'fid', carrierOwnerId: 'cid',
      carrierAmount: 900, _id: 'pid', save: jest.fn().mockResolvedValue(undefined),
    };
    Payment.findOne = jest.fn().mockResolvedValue(payment);
    Freight.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    Wallet.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'wid' });
    WalletTransaction.create = jest.fn().mockResolvedValue({});

    const { req, res, next } = mockReqRes({
      body: { outTradeNo: 'TRD-1', transactionId: 'TB-TX-1', status: 'SUCCESS' },
      headers: { 'x-telebirr-signature': 'sig' },
    });
    await handleWebhook(req, res, next);

    expect(payment.status).toBe('HELD');
    expect(payment.telebirrTransactionId).toBe('TB-TX-1');
    const diffMs = payment.releaseAt - payment.paidAt;
    expect(diffMs).toBeCloseTo(2 * 24 * 60 * 60 * 1000, -3);
    expect(Freight.findByIdAndUpdate).toHaveBeenCalledWith('fid', { status: 'IN_TRANSIT' }, expect.anything());
  });
});

describe('releasePayment', () => {
  test('returns 404 if payment not found', async () => {
    Payment.findById = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await releasePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('returns 403 if user is not the freight owner', async () => {
    Payment.findById = jest.fn().mockResolvedValue({ freightOwnerId: { toString: () => 'other-user' }, status: 'HELD' });
    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await releasePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('returns 400 if payment status is not HELD', async () => {
    Payment.findById = jest.fn().mockResolvedValue({ freightOwnerId: { toString: () => 'freight-owner-id' }, status: 'PENDING' });
    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await releasePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('calls releasePaymentService and returns 200 on success', async () => {
    const payment = { _id: 'pid', freightOwnerId: { toString: () => 'freight-owner-id' }, status: 'HELD' };
    Payment.findById = jest.fn().mockResolvedValue(payment);
    releasePaymentService.mockResolvedValue({ ...payment, status: 'RELEASED' });

    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await releasePayment(req, res, next);

    expect(releasePaymentService).toHaveBeenCalledWith(payment._id);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('disputePayment', () => {
  test('returns 404 if payment not found', async () => {
    Payment.findById = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await disputePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('returns 403 if user is not the freight owner', async () => {
    Payment.findById = jest.fn().mockResolvedValue({ freightOwnerId: { toString: () => 'other-user' }, status: 'HELD' });
    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await disputePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('returns 400 if payment status is not HELD', async () => {
    Payment.findById = jest.fn().mockResolvedValue({ freightOwnerId: { toString: () => 'freight-owner-id' }, status: 'RELEASED' });
    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await disputePayment(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('sets status to DISPUTED and clears releaseAt', async () => {
    const payment = {
      freightOwnerId: { toString: () => 'freight-owner-id' },
      status: 'HELD', releaseAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    Payment.findById = jest.fn().mockResolvedValue(payment);
    const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
    await disputePayment(req, res, next);

    expect(payment.status).toBe('DISPUTED');
    expect(payment.releaseAt).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('getPaymentStatus', () => {
  test('returns 404 if payment not found', async () => {
    Payment.findById = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ params: { requestId: 'pid' } });
    await getPaymentStatus(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('returns 403 if user is neither freight owner nor carrier owner', async () => {
    Payment.findById = jest.fn().mockResolvedValue({
      freightOwnerId: { toString: () => 'owner-a' },
      carrierOwnerId: { toString: () => 'owner-b' },
    });
    const { req, res, next } = mockReqRes({ params: { requestId: 'pid' } });
    await getPaymentStatus(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('returns 200 with payment fields for freight owner', async () => {
    Payment.findById = jest.fn().mockResolvedValue({
      _id: 'pid', status: 'HELD', totalAmount: 1000, platformFee: 100, carrierAmount: 900,
      paidAt: new Date(), releasedAt: null, releaseAt: new Date(), outTradeNo: 'TRD-1',
      freightOwnerId: { toString: () => 'freight-owner-id' },
      carrierOwnerId: { toString: () => 'carrier-id' },
    });
    const { req, res, next } = mockReqRes({ params: { requestId: 'pid' } });
    await getPaymentStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ payment: expect.objectContaining({ status: 'HELD', totalAmount: 1000 }) }) })
    );
  });

  test('returns 200 for carrier owner', async () => {
    Payment.findById = jest.fn().mockResolvedValue({
      _id: 'pid', status: 'RELEASED', totalAmount: 500, platformFee: 50, carrierAmount: 450,
      paidAt: new Date(), releasedAt: new Date(), releaseAt: null, outTradeNo: 'TRD-2',
      freightOwnerId: { toString: () => 'other-owner' },
      carrierOwnerId: { toString: () => 'freight-owner-id' },
    });
    const { req, res, next } = mockReqRes({ params: { requestId: 'pid' } });
    await getPaymentStatus(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
