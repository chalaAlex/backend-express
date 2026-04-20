/**
 * Unit tests for adminPaymentController
 * Validates: Requirements 5.5, 5.6, 7.4, 7.5, 8.1-8.3
 */

jest.mock('../model/paymentModel');
jest.mock('../model/walletModel');
jest.mock('../model/walletTransactionModel');
jest.mock('../model/withdrawalRequestModel');
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
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const WithdrawalRequest = require('../model/withdrawalRequestModel');
const { releasePayment } = require('../services/releasePaymentService');

const { resolveDispute, processWithdrawal } = require('../controller/adminPaymentController');

function mockReqRes(overrides = {}) {
  const req = { body: {}, params: {}, query: {}, user: { _id: 'admin-id', role: 'admin' }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

describe('resolveDispute', () => {
  test('returns 404 if payment not found', async () => {
    Payment.findById = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ params: { id: 'pid' }, body: { resolution: 'RELEASE' } });
    await resolveDispute(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('returns 400 if payment is not DISPUTED', async () => {
    Payment.findById = jest.fn().mockResolvedValue({ status: 'HELD', save: jest.fn() });
    const { req, res, next } = mockReqRes({ params: { id: 'pid' }, body: { resolution: 'RELEASE' } });
    await resolveDispute(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('RELEASE path: sets status to HELD then calls releasePayment', async () => {
    const payment = { _id: 'pid', status: 'DISPUTED', carrierOwnerId: 'cid', carrierAmount: 900, save: jest.fn().mockResolvedValue(undefined) };
    Payment.findById = jest.fn().mockResolvedValue(payment);
    releasePayment.mockResolvedValue({ ...payment, status: 'RELEASED' });
    const { req, res, next } = mockReqRes({ params: { id: 'pid' }, body: { resolution: 'RELEASE' } });
    await resolveDispute(req, res, next);
    expect(payment.status).toBe('HELD');
    expect(releasePayment).toHaveBeenCalledWith(payment._id);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('REFUND path: sets status to REFUNDED and decrements pendingBalance', async () => {
    const payment = { _id: 'pid', status: 'DISPUTED', carrierOwnerId: 'cid', carrierAmount: 900, save: jest.fn().mockResolvedValue(undefined) };
    Payment.findById = jest.fn().mockResolvedValue(payment);
    Wallet.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'wid' });
    Wallet.findOne = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue({ _id: 'wid' }) });
    WalletTransaction.create = jest.fn().mockResolvedValue({});
    const { req, res, next } = mockReqRes({ params: { id: 'pid' }, body: { resolution: 'REFUND' } });
    await resolveDispute(req, res, next);
    expect(payment.status).toBe('REFUNDED');
    expect(Wallet.findOneAndUpdate).toHaveBeenCalledWith({ carrierOwnerId: 'cid' }, { $inc: { pendingBalance: -900 } }, expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 for invalid resolution value', async () => {
    const payment = { _id: 'pid', status: 'DISPUTED', save: jest.fn() };
    Payment.findById = jest.fn().mockResolvedValue(payment);
    const { req, res, next } = mockReqRes({ params: { id: 'pid' }, body: { resolution: 'INVALID' } });
    await resolveDispute(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('processWithdrawal', () => {
  test('returns 404 if withdrawal not found', async () => {
    WithdrawalRequest.findById = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes({ params: { id: 'wrid' }, body: { status: 'APPROVED' } });
    await processWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  test('returns 400 if withdrawal is not PENDING', async () => {
    WithdrawalRequest.findById = jest.fn().mockResolvedValue({ status: 'APPROVED', save: jest.fn() });
    const { req, res, next } = mockReqRes({ params: { id: 'wrid' }, body: { status: 'APPROVED' } });
    await processWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('APPROVED path: deducts balance, creates DEBIT transaction, sets processedAt', async () => {
    const withdrawal = { _id: 'wrid', walletId: 'wid', carrierOwnerId: 'cid', amount: 200, status: 'PENDING', save: jest.fn().mockResolvedValue(undefined) };
    WithdrawalRequest.findById = jest.fn().mockResolvedValue(withdrawal);
    const wallet = { _id: 'wid', balance: 500, save: jest.fn().mockResolvedValue(undefined) };
    Wallet.findById = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(wallet) });
    WalletTransaction.create = jest.fn().mockResolvedValue({});
    const { req, res, next } = mockReqRes({ params: { id: 'wrid' }, body: { status: 'APPROVED' } });
    await processWithdrawal(req, res, next);
    expect(wallet.balance).toBe(300);
    expect(WalletTransaction.create).toHaveBeenCalledWith([expect.objectContaining({ type: 'DEBIT', amount: 200 })], expect.anything());
    expect(withdrawal.status).toBe('APPROVED');
    expect(withdrawal.processedAt).toBeDefined();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('APPROVED path: returns 400 if wallet balance is insufficient', async () => {
    const withdrawal = { _id: 'wrid', walletId: 'wid', carrierOwnerId: 'cid', amount: 1000, status: 'PENDING', save: jest.fn() };
    WithdrawalRequest.findById = jest.fn().mockResolvedValue(withdrawal);
    const wallet = { _id: 'wid', balance: 50, save: jest.fn() };
    Wallet.findById = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue(wallet) });
    const { req, res, next } = mockReqRes({ params: { id: 'wrid' }, body: { status: 'APPROVED' } });
    await processWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('REJECTED path: sets status to REJECTED and sets processedAt', async () => {
    const withdrawal = { _id: 'wrid', status: 'PENDING', save: jest.fn().mockResolvedValue(undefined) };
    WithdrawalRequest.findById = jest.fn().mockResolvedValue(withdrawal);
    const { req, res, next } = mockReqRes({ params: { id: 'wrid' }, body: { status: 'REJECTED' } });
    await processWithdrawal(req, res, next);
    expect(withdrawal.status).toBe('REJECTED');
    expect(withdrawal.processedAt).toBeDefined();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 400 for invalid status value', async () => {
    const withdrawal = { _id: 'wrid', status: 'PENDING', save: jest.fn() };
    WithdrawalRequest.findById = jest.fn().mockResolvedValue(withdrawal);
    const { req, res, next } = mockReqRes({ params: { id: 'wrid' }, body: { status: 'INVALID' } });
    await processWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
