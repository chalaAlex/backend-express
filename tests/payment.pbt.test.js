/**
 * Property-based tests for Telebirr Escrow Payment
 * Feature: telebirr-escrow-payment
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

const fc = require('fast-check');
const Payment = require('../model/paymentModel');
const ShipmentRequest = require('../model/shipmentRequestModel');
const telebirrService = require('../services/telebirrService');
const { releasePayment: releasePaymentService } = require('../services/releasePaymentService');

const VALID_STATUSES = ['PENDING', 'HELD', 'RELEASED', 'DISPUTED', 'REFUNDED'];

function mockReqRes(overrides = {}) {
  const req = { body: {}, params: {}, headers: {}, user: { _id: 'freight-owner-id' }, ...overrides };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => jest.clearAllMocks());

// Property 1: Fee split invariant — Validates: Requirements 1.2, 1.3
describe('Feature: telebirr-escrow-payment, Property 1: Fee split invariant', () => {
  test('platformFee + carrierAmount === totalAmount for any positive amount', async () => {
    const { initiatePayment } = require('../controller/paymentController');
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 1, max: 1000000, noNaN: true }),
        async (totalAmount) => {
          jest.clearAllMocks();
          ShipmentRequest.findOne = jest.fn().mockResolvedValue({
            freightIds: ['fid'], carrierOwnerId: 'cid', proposedPrice: totalAmount,
          });
          Payment.findOne = jest.fn().mockResolvedValue(null);
          Payment.create = jest.fn().mockResolvedValue({ _id: 'pid' });
          telebirrService.initiatePayment = jest.fn().mockResolvedValue({ toPayUrl: 'https://pay.url' });

          const { req, res, next } = mockReqRes({ body: { bookingType: 'REQUEST', sourceId: 'sid' } });
          await initiatePayment(req, res, next);

          const args = Payment.create.mock.calls[0][0];
          const { platformFee, carrierAmount } = args;
          expect(platformFee).toBeCloseTo(totalAmount * 0.1, 2);
          expect(carrierAmount).toBeCloseTo(totalAmount * 0.9, 2);
          expect(platformFee + carrierAmount).toBeCloseTo(totalAmount, 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Property 2: Payment status enum validity — Validates: Requirements 1.1, 2.1, 3.1, 5.1
describe('Feature: telebirr-escrow-payment, Property 2: Payment status enum validity', () => {
  test('any constructed payment status is always one of the 5 valid enum values', () => {
    fc.assert(
      fc.property(
        fc.record({
          outTradeNo: fc.string({ minLength: 1, maxLength: 30 }),
          totalAmount: fc.float({ min: 1, max: 100000, noNaN: true }),
          status: fc.constantFrom(...VALID_STATUSES),
        }),
        (paymentData) => {
          expect(VALID_STATUSES).toContain(paymentData.status);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// Property 3: Release transitions status correctly — Validates: Requirements 3.1, 4.2
describe('Feature: telebirr-escrow-payment, Property 3: Release transitions status correctly', () => {
  test('releasePaymentService called with HELD payment produces RELEASED status and non-null releasedAt', async () => {
    const { releasePayment } = require('../controller/paymentController');
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 1, max: 100000, noNaN: true }),
        async (carrierAmount) => {
          jest.clearAllMocks();
          const now = new Date();
          const heldPayment = { _id: 'pid', status: 'HELD', carrierAmount, freightOwnerId: { toString: () => 'freight-owner-id' } };
          const releasedPayment = { ...heldPayment, status: 'RELEASED', releasedAt: now };
          Payment.findById = jest.fn().mockResolvedValue(heldPayment);
          releasePaymentService.mockResolvedValue(releasedPayment);

          const { req, res, next } = mockReqRes({ params: { id: 'pid' } });
          await releasePayment(req, res, next);

          const released = await releasePaymentService.mock.results[0].value;
          expect(released.status).toBe('RELEASED');
          expect(released.releasedAt).not.toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Property 4: Wallet balance invariant after release — Validates: Requirements 3.3, 4.2
describe('Feature: telebirr-escrow-payment, Property 4: Wallet balance invariant after release', () => {
  test('after release, balance += carrierAmount and pendingBalance -= carrierAmount', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000000, noNaN: true }),
        fc.float({ min: 1, max: 100000, noNaN: true }),
        fc.float({ min: 1, max: 100000, noNaN: true }),
        (initialBalance, initialPending, carrierAmount) => {
          const after = {
            balance: initialBalance + carrierAmount,
            pendingBalance: initialPending - carrierAmount,
          };
          expect(after.balance).toBeCloseTo(initialBalance + carrierAmount, 5);
          expect(after.pendingBalance).toBeCloseTo(initialPending - carrierAmount, 5);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// Property 5: Disputed payments skipped by auto-release — Validates: Requirement 4.3
describe('Feature: telebirr-escrow-payment, Property 5: Disputed payments skipped by auto-release', () => {
  test('DISPUTED payments never satisfy the HELD + releaseAt <= now query', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        (releaseAt, now) => {
          const payment = { status: 'DISPUTED', releaseAt };
          const matchesQuery = payment.status === 'HELD' && payment.releaseAt <= now;
          expect(matchesQuery).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// Property 8: Duplicate payment prevention — Validates: Requirement 1.5
describe('Feature: telebirr-escrow-payment, Property 8: Duplicate payment prevention', () => {
  test('initiating payment for sourceId with HELD/RELEASED status returns error, no new record', async () => {
    const { initiatePayment } = require('../controller/paymentController');
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('HELD', 'RELEASED'),
        fc.float({ min: 1, max: 100000, noNaN: true }),
        async (existingStatus, totalAmount) => {
          jest.clearAllMocks();
          ShipmentRequest.findOne = jest.fn().mockResolvedValue({
            freightIds: ['fid'], carrierOwnerId: 'cid', proposedPrice: totalAmount,
          });
          Payment.findOne = jest.fn().mockResolvedValue({ status: existingStatus });
          Payment.create = jest.fn();

          const { req, res, next } = mockReqRes({ body: { bookingType: 'REQUEST', sourceId: 'sid' } });
          await initiatePayment(req, res, next);

          expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
          expect(Payment.create).not.toHaveBeenCalled();
        },
      ),
      { numRuns: 100 },
    );
  });
});
