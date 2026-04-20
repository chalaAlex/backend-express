/**
 * Unit tests for walletController
 * Validates: Requirements 6.1-6.4, 7.1-7.6
 */

jest.mock('../model/walletModel');
jest.mock('../model/walletTransactionModel');
jest.mock('../model/withdrawalRequestModel');

const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const WithdrawalRequest = require('../model/withdrawalRequestModel');

const { getWallet, getTransactions, requestWithdrawal } = require('../controller/walletController');

function mockReqRes(overrides = {}) {
  const req = {
    body: {},
    params: {},
    query: {},
    user: { _id: 'carrier-id', role: 'carrier_owner' },
    ...overrides,
  };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

// ─── getWallet ────────────────────────────────────────────────────────────────

describe('getWallet', () => {
  test('returns 403 if user is not carrier_owner', async () => {
    const { req, res, next } = mockReqRes({ user: { _id: 'uid', role: 'freight_owner' } });
    await getWallet(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('upserts wallet and returns balance/pendingBalance/currency', async () => {
    const wallet = { _id: 'wid', balance: 0, pendingBalance: 0, currency: 'ETB' };
    Wallet.findOneAndUpdate = jest.fn().mockResolvedValue(wallet);

    const { req, res, next } = mockReqRes();
    await getWallet(req, res, next);

    expect(Wallet.findOneAndUpdate).toHaveBeenCalledWith(
      { carrierOwnerId: 'carrier-id' },
      expect.anything(),
      expect.objectContaining({ upsert: true, new: true }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          wallet: expect.objectContaining({ balance: 0, pendingBalance: 0, currency: 'ETB' }),
        }),
      }),
    );
  });

  test('creates wallet with ETB currency if it does not exist (upsert)', async () => {
    const newWallet = { _id: 'new-wid', balance: 0, pendingBalance: 0, currency: 'ETB' };
    Wallet.findOneAndUpdate = jest.fn().mockResolvedValue(newWallet);

    const { req, res, next } = mockReqRes();
    await getWallet(req, res, next);

    const callArgs = Wallet.findOneAndUpdate.mock.calls[0];
    expect(callArgs[1]).toMatchObject({ $setOnInsert: { currency: 'ETB' } });
  });
});

// ─── getTransactions ──────────────────────────────────────────────────────────

describe('getTransactions', () => {
  test('returns 403 if user is not carrier_owner', async () => {
    const { req, res, next } = mockReqRes({ user: { _id: 'uid', role: 'admin' } });
    await getTransactions(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('returns empty list if wallet does not exist', async () => {
    Wallet.findOne = jest.fn().mockResolvedValue(null);
    const { req, res, next } = mockReqRes();
    await getTransactions(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ transactions: [], total: 0 }) }),
    );
  });

  test('returns paginated transactions ordered by createdAt desc', async () => {
    Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid' });
    const txns = [{ _id: 't1', type: 'RELEASE', amount: 900 }];
    const sortMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockResolvedValue(txns);
    WalletTransaction.find = jest.fn().mockReturnValue({ sort: sortMock, skip: skipMock, limit: limitMock });
    WalletTransaction.countDocuments = jest.fn().mockResolvedValue(1);

    const { req, res, next } = mockReqRes({ query: { page: '1', limit: '10' } });
    await getTransactions(req, res, next);

    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ transactions: txns, total: 1, page: 1, limit: 10 }),
      }),
    );
  });

  test('uses default page=1 limit=20 when not provided', async () => {
    Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid' });
    const sortMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockResolvedValue([]);
    WalletTransaction.find = jest.fn().mockReturnValue({ sort: sortMock, skip: skipMock, limit: limitMock });
    WalletTransaction.countDocuments = jest.fn().mockResolvedValue(0);

    const { req, res, next } = mockReqRes({ query: {} });
    await getTransactions(req, res, next);

    expect(skipMock).toHaveBeenCalledWith(0); // (1-1)*20
    expect(limitMock).toHaveBeenCalledWith(20);
  });
});

// ─── requestWithdrawal ────────────────────────────────────────────────────────

describe('requestWithdrawal', () => {
  test('returns 403 if user is not carrier_owner', async () => {
    const { req, res, next } = mockReqRes({ user: { _id: 'uid', role: 'freight_owner' }, body: { amount: 100 } });
    await requestWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  test('returns 400 if amount is missing or zero', async () => {
    const { req, res, next } = mockReqRes({ body: { amount: 0 } });
    await requestWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('returns 400 if amount is negative', async () => {
    const { req, res, next } = mockReqRes({ body: { amount: -50 } });
    await requestWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('returns 400 if amount exceeds wallet balance', async () => {
    Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid', balance: 100 });
    const { req, res, next } = mockReqRes({ body: { amount: 200 } });
    await requestWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('returns 400 if a PENDING withdrawal already exists', async () => {
    Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid', balance: 500 });
    WithdrawalRequest.findOne = jest.fn().mockResolvedValue({ status: 'PENDING' });
    const { req, res, next } = mockReqRes({ body: { amount: 100 } });
    await requestWithdrawal(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  test('creates WithdrawalRequest with PENDING status on success', async () => {
    Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid', balance: 500 });
    WithdrawalRequest.findOne = jest.fn().mockResolvedValue(null);
    const withdrawal = { _id: 'wrid', amount: 100, status: 'PENDING' };
    WithdrawalRequest.create = jest.fn().mockResolvedValue(withdrawal);

    const { req, res, next } = mockReqRes({ body: { amount: 100 } });
    await requestWithdrawal(req, res, next);

    expect(WithdrawalRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ carrierOwnerId: 'carrier-id', amount: 100, status: 'PENDING' }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ withdrawal }) }),
    );
  });
});
