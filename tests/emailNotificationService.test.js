/**
 * Unit tests for emailNotificationService
 * Validates: Requirements 1.1–1.5, 2.1–2.5, 3.3, 4.2, 4.3
 */

// Mock dependencies before requiring the module under test
jest.mock('../utils/email', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('../model/userModel', () => ({
  findById: jest.fn(),
}));

const { sendEmail } = require('../utils/email');
const User = require('../model/userModel');
const { notify } = require('../utils/emailNotificationService');

// A carrier payload with a populated truckOwner (object with email)
const populatedPayload = {
  carrier: {
    plateNumber: 'ABC-1234',
    model: 'Volvo FH16',
    truckOwner: {
      _id: 'owner-id-123',
      email: 'owner@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  sendEmail.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// carrier.created
// ---------------------------------------------------------------------------

describe('notify("carrier.created", payload)', () => {
  test('calls sendEmail with subject containing "registration" (case-insensitive)', async () => {
    await notify('carrier.created', populatedPayload);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { subject } = sendEmail.mock.calls[0][0];
    expect(subject.toLowerCase()).toContain('registration');
  });

  test('calls sendEmail with body containing plate number and model', async () => {
    await notify('carrier.created', populatedPayload);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { message } = sendEmail.mock.calls[0][0];
    expect(message).toContain('ABC-1234');
    expect(message).toContain('Volvo FH16');
  });

  test('calls sendEmail with the resolved owner email', async () => {
    await notify('carrier.created', populatedPayload);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'owner@example.com' }),
    );
  });
});

// ---------------------------------------------------------------------------
// carrier.verified
// ---------------------------------------------------------------------------

describe('notify("carrier.verified", payload)', () => {
  test('calls sendEmail with subject containing "verified" (case-insensitive)', async () => {
    await notify('carrier.verified', populatedPayload);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { subject } = sendEmail.mock.calls[0][0];
    expect(subject.toLowerCase()).toContain('verified');
  });

  test('calls sendEmail with body containing plate number and model', async () => {
    await notify('carrier.verified', populatedPayload);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { message } = sendEmail.mock.calls[0][0];
    expect(message).toContain('ABC-1234');
    expect(message).toContain('Volvo FH16');
  });
});

// ---------------------------------------------------------------------------
// Unknown event
// ---------------------------------------------------------------------------

describe('notify("unknown.event", payload)', () => {
  test('does not call sendEmail', async () => {
    await notify('unknown.event', populatedPayload);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('resolves without throwing', async () => {
    await expect(notify('unknown.event', populatedPayload)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// sendEmail rejection is non-blocking
// ---------------------------------------------------------------------------

describe('when sendEmail rejects', () => {
  test('notify still resolves without throwing', async () => {
    sendEmail.mockRejectedValue(new Error('SMTP failure'));
    await expect(notify('carrier.created', populatedPayload)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// truckOwner has no email field
// ---------------------------------------------------------------------------

describe('when truckOwner has no email field', () => {
  test('notify resolves without calling sendEmail', async () => {
    const payload = {
      carrier: {
        plateNumber: 'XYZ-9999',
        model: 'MAN TGX',
        truckOwner: { _id: 'owner-id-456' }, // no email
      },
    };

    // resolveRecipient will fall through to User.findById because truckOwner
    // is an object but has no email — it will use _id as ownerId
    User.findById.mockResolvedValue({ _id: 'owner-id-456' }); // no email on returned doc

    await expect(notify('carrier.created', payload)).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Populated truckOwner skips DB query
// ---------------------------------------------------------------------------

describe('when truckOwner is already populated (object with email)', () => {
  test('User.findById is not called', async () => {
    await notify('carrier.created', populatedPayload);
    expect(User.findById).not.toHaveBeenCalled();
  });
});
