/**
 * Property-based tests for emailNotificationService
 * Uses fast-check to validate universal properties across many generated inputs.
 *
 * Feature: carrier-email-notifications
 */

jest.mock('../utils/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../model/userModel', () => ({
  findById: jest.fn(),
}));

const fc = require('fast-check');
const { sendEmail } = require('../utils/email');
const { notify } = require('../utils/emailNotificationService');

const KNOWN_EVENTS = ['carrier.created', 'carrier.verified'];

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Non-empty string arbitrary */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 });

/** Valid carrier arbitrary */
const validCarrier = fc.record({
  plateNumber: nonEmptyString,
  model: nonEmptyString,
  truckOwner: fc.record({
    _id: nonEmptyString,
    email: fc.emailAddress(),
  }),
});

/** Recognized event name arbitrary */
const knownEvent = fc.constantFrom(...KNOWN_EVENTS);

/** Unknown event name: any string that is NOT a known event */
const unknownEvent = fc.string({ minLength: 1, maxLength: 40 }).filter(
  (s) => !KNOWN_EVENTS.includes(s),
);

/** Carrier with truckOwner that has no email (or empty string) */
const carrierWithNoOwnerEmail = fc.record({
  plateNumber: nonEmptyString,
  model: nonEmptyString,
  truckOwner: fc.oneof(
    // object without email field
    fc.record({ _id: nonEmptyString }),
    // object with empty email
    fc.record({ _id: nonEmptyString, email: fc.constant('') }),
  ),
});

// ---------------------------------------------------------------------------
// Property 1: Known events always produce a sendEmail call
// Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1
// ---------------------------------------------------------------------------

describe('Feature: carrier-email-notifications, Property 1: Known events always produce a sendEmail call', () => {
  test('sendEmail is called exactly once with non-empty subject and message', async () => {
    await fc.assert(
      fc.asyncProperty(knownEvent, validCarrier, async (eventName, carrier) => {
        jest.resetAllMocks();
        sendEmail.mockResolvedValue(undefined);

        await notify(eventName, { carrier });

        expect(sendEmail).toHaveBeenCalledTimes(1);

        const { subject, message } = sendEmail.mock.calls[0][0];
        expect(typeof subject).toBe('string');
        expect(subject.length).toBeGreaterThan(0);
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Unknown events never throw
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe('Feature: carrier-email-notifications, Property 2: Unknown events never throw', () => {
  test('notify resolves and sendEmail is never called for unrecognized events', async () => {
    await fc.assert(
      fc.asyncProperty(unknownEvent, validCarrier, async (eventName, carrier) => {
        jest.resetAllMocks();
        sendEmail.mockResolvedValue(undefined);

        await expect(notify(eventName, { carrier })).resolves.toBeUndefined();
        expect(sendEmail).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Email failures are non-blocking
// Validates: Requirements 1.5, 2.5
// ---------------------------------------------------------------------------

describe('Feature: carrier-email-notifications, Property 3: Email failures are non-blocking', () => {
  test('notify resolves even when sendEmail rejects', async () => {
    await fc.assert(
      fc.asyncProperty(
        knownEvent,
        validCarrier,
        fc.string({ minLength: 1, maxLength: 80 }),
        async (eventName, carrier, errorMessage) => {
          jest.resetAllMocks();
          sendEmail.mockRejectedValue(new Error(errorMessage));

          await expect(notify(eventName, { carrier })).resolves.toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Missing owner email is non-blocking
// Validates: Requirements 1.4, 2.4, 4.3
// ---------------------------------------------------------------------------

describe('Feature: carrier-email-notifications, Property 4: Missing owner email is non-blocking', () => {
  test('notify resolves without calling sendEmail when owner has no email', async () => {
    const User = require('../model/userModel');

    await fc.assert(
      fc.asyncProperty(knownEvent, carrierWithNoOwnerEmail, async (eventName, carrier) => {
        jest.resetAllMocks();
        sendEmail.mockResolvedValue(undefined);
        // DB lookup also returns an owner without email
        User.findById.mockResolvedValue({ _id: carrier.truckOwner._id });

        await expect(notify(eventName, { carrier })).resolves.toBeUndefined();
        expect(sendEmail).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });
});
