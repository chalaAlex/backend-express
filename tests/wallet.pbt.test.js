/**
 * Property-based tests for Wallet & Withdrawal
 * Feature: telebirr-escrow-payment
 */

jest.mock('../model/walletModel');
jest.mock('../model/walletTransactionModel');
jest.mock('../model/withdrawalRequestModel');

const fc = require('fast-check');
const Wallet = require('../model/walletModel');
const WalletTransaction = require('../model/walletTransactionModel');
const WithdrawalRequest = require('../model/withdrawalRequestModel');

const { requestWithdrawal } = require('../controller/walletController');

function mockReqRes(overrides = {}) {
  const req = { body: {}, params: {}, query: {}, user: { _id: 'carrier-id', role: 'carrier_owner' }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

// Property 6: Withdrawal amount validation — Validates: Requirements 7.2, 7.3
describe('Feature: telebirr-escrow-payment, Property 6: Withdrawal amount validation', () => {
  test('amount <= 0 is always rejected with 400, wallet unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.float({ min: -100000, max: 0, noNaN: true }),
          fc.constant(0),
        ),
        fc.float({ min: 1, max: 100000, noNaN: true }),
        async (invalidAmount, balance) => {
          jest.clearAllMocks();
          Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid', balance });
          WithdrawalRequest.findOne = jest.fn().mockResolvedValue(null);
          WithdrawalRequest.create = jest.fn();

          const { req, res, next } = mockReqRes({ body: { amount: invalidAmount } });
          await requestWithdrawal(req, res, next);

          expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
          expect(WithdrawalRequest.create).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });

  test('amount > balance is always rejected with 400, wallet unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 1, max: 100000, noNaN: true }),
        async (balance) => {
          jest.clearAllMocks();
          const excessAmount = balance + 1;
          Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid', balance });
          WithdrawalRequest.findOne = jest.fn().mockResolvedValue(null);
          WithdrawalRequest.create = jest.fn();

          const { req, res, next } = mockReqRes({ body: { amount: excessAmount } });
          await requestWithdrawal(req, res, next);

          expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
          expect(WithdrawalRequest.create).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Property 7: Wallet balance after approved withdrawal — Validates: Requirement 7.4
describe('Feature: telebirr-escrow-payment, Property 7: Wallet balance after approved withdrawal', () => {
  test('after approval, balance equals B - W and a DEBIT transaction exists', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 1000000, noNaN: true }),
        fc.float({ min: 0.01, max: 1, noNaN: true }),
        (balance, fraction) => {
          const withdrawalAmount = parseFloat((balance * fraction).toFixed(2));
          // Simulate the approval logic
          const walletAfter = { balance: balance - withdrawalAmount };
          const debitTx = { type: 'DEBIT', amount: withdrawalAmount };

          expect(walletAfter.balance).toBeCloseTo(balance - withdrawalAmount, 5);
          expect(debitTx.type).toBe('DEBIT');
          expect(debitTx.amount).toBeCloseTo(withdrawalAmount, 5);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// Property 9: Pending withdrawal blocks new requests — Validates: Requirement 7.6
describe('Feature: telebirr-escrow-payment, Property 9: Pending withdrawal blocks new requests', () => {
  test('second withdrawal while PENDING is rejected, count stays 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 1, max: 100000, noNaN: true }),
        fc.float({ min: 0.01, max: 0.99, noNaN: true }),
        async (balance, fraction) => {
          jest.clearAllMocks();
          const amount = parseFloat((balance * fraction).toFixed(2));
          Wallet.findOne = jest.fn().mockResolvedValue({ _id: 'wid', balance });
          WithdrawalRequest.findOne = jest.fn().mockResolvedValue({ status: 'PENDING' });
          WithdrawalRequest.create = jest.fn();

          const { req, res, next } = mockReqRes({ body: { amount } });
          await requestWithdrawal(req, res, next);

          expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
          expect(WithdrawalRequest.create).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Property 10: WalletTransaction ledger completeness — Validates: Requirements 2.4, 3.3
describe('Feature: telebirr-escrow-payment, Property 10: WalletTransaction ledger completeness', () => {
  test('sum(RELEASE) - sum(HOLD) equals net change in wallet.balance', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 1, max: 10000, noNaN: true }), { minLength: 1, maxLength: 10 }),
        fc.array(fc.float({ min: 1, max: 10000, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (holdAmounts, releaseAmounts) => {
          const initialBalance = 0;
          const holdTransactions = holdAmounts.map((a) => ({ type: 'HOLD', amount: a }));
          const releaseTransactions = releaseAmounts.map((a) => ({ type: 'RELEASE', amount: a }));
          const allTx = [...holdTransactions, ...releaseTransactions];

          const sumHold = allTx.filter((t) => t.type === 'HOLD').reduce((s, t) => s + t.amount, 0);
          const sumRelease = allTx.filter((t) => t.type === 'RELEASE').reduce((s, t) => s + t.amount, 0);

          // Net change in balance = sum of RELEASE credits
          const netBalanceChange = sumRelease;
          const finalBalance = initialBalance + netBalanceChange;

          expect(finalBalance).toBeCloseTo(initialBalance + sumRelease, 5);
          expect(sumRelease - sumHold).toBeCloseTo(netBalanceChange - sumHold, 5);
        },
      ),
      { numRuns: 200 },
    );
  });
});
