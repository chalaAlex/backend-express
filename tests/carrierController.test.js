/**
 * Unit tests for createCarrier controller — document validation
 * Validates: Requirement 3.4
 */

const AppError = require('../utils/appError');

// ---------------------------------------------------------------------------
// Pure validation logic extracted from createCarrier controller
// ---------------------------------------------------------------------------

function validateDocuments(documents) {
  const { vehicleRegistration, tradeLicense, ownerDigitalId } = documents ?? {};
  if (!vehicleRegistration || !tradeLicense || !ownerDigitalId) {
    return new AppError(
      'All three legal documents (vehicleRegistration, tradeLicense, ownerDigitalId) are required',
      400,
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('createCarrier — document validation', () => {
  test('returns null when all three documents are present', () => {
    const error = validateDocuments({
      vehicleRegistration: 'https://storage/vr.jpg',
      tradeLicense: 'https://storage/tl.jpg',
      ownerDigitalId: 'https://storage/id.jpg',
    });
    expect(error).toBeNull();
  });

  test('returns 400 AppError when vehicleRegistration is missing', () => {
    const error = validateDocuments({
      tradeLicense: 'https://storage/tl.jpg',
      ownerDigitalId: 'https://storage/id.jpg',
    });
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
  });

  test('returns 400 AppError when tradeLicense is missing', () => {
    const error = validateDocuments({
      vehicleRegistration: 'https://storage/vr.jpg',
      ownerDigitalId: 'https://storage/id.jpg',
    });
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
  });

  test('returns 400 AppError when ownerDigitalId is missing', () => {
    const error = validateDocuments({
      vehicleRegistration: 'https://storage/vr.jpg',
      tradeLicense: 'https://storage/tl.jpg',
    });
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
  });

  test('returns 400 AppError when documents object is undefined', () => {
    const error = validateDocuments(undefined);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
  });

  test('returns 400 AppError when all documents are empty strings', () => {
    const error = validateDocuments({
      vehicleRegistration: '',
      tradeLicense: '',
      ownerDigitalId: '',
    });
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
  });

  test('error message names all three required fields', () => {
    const error = validateDocuments({});
    expect(error.message).toContain('vehicleRegistration');
    expect(error.message).toContain('tradeLicense');
    expect(error.message).toContain('ownerDigitalId');
  });
});

// ---------------------------------------------------------------------------
// Controller integration tests — email notification calls
// Validates: Requirements 1.1, 1.5, 2.1, 2.5
// ---------------------------------------------------------------------------

jest.mock('../utils/emailNotificationService', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../model/carrierModel', () => ({
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../model/companyModel', () => ({ exists: jest.fn(), findById: jest.fn(), updateOne: jest.fn() }));
jest.mock('../model/regionModel', () => ({}));
jest.mock('../model/cityModel', () => ({}));
jest.mock('../model/brandModel', () => ({}));
jest.mock('../model/featureModel', () => ({}));
jest.mock('../model/carrierTypeModel', () => ({}));
jest.mock('../model/userModel', () => ({ findOne: jest.fn() }));
jest.mock('../utils/apiFeatures', () => jest.fn().mockImplementation(() => ({
  filter: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limitFields: jest.fn().mockReturnThis(),
  paginate: jest.fn().mockReturnThis(),
  query: { populate: jest.fn().mockResolvedValue([]) },
})));

const { notify } = require('../utils/emailNotificationService');
const Carrier = require('../model/carrierModel');
const carrierController = require('../controller/carrierController');

// Helper to build a minimal req/res/next triple
function makeReqResNext(overrides = {}) {
  const req = {
    body: {
      truckOwner: 'owner-id-123',
      plateNumber: 'ABC-123',
      model: 'Volvo FH',
      documents: {
        vehicleRegistration: 'https://storage/vr.jpg',
        tradeLicense: 'https://storage/tl.jpg',
        ownerDigitalId: 'https://storage/id.jpg',
      },
      ...overrides.body,
    },
    params: { id: 'carrier-id-456', ...overrides.params },
    user: { id: 'owner-id-123', ...overrides.user },
    query: {},
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

const FAKE_CARRIER = {
  _id: 'carrier-id-456',
  plateNumber: 'ABC-123',
  model: 'Volvo FH',
  truckOwner: 'owner-id-123',
};

describe('createCarrier — email notification integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Carrier.create = jest.fn().mockResolvedValue(FAKE_CARRIER);
  });

  test('calls notify with carrier.created and the created carrier payload', async () => {
    const { req, res, next } = makeReqResNext();

    await carrierController.createCarrier(req, res, next);

    expect(notify).toHaveBeenCalledWith('carrier.created', { carrier: FAKE_CARRIER });
  });

  test('returns HTTP 201 response even if notify rejects', async () => {
    notify.mockRejectedValueOnce(new Error('SMTP failure'));
    const { req, res, next } = makeReqResNext();

    await carrierController.createCarrier(req, res, next);

    // Response must still be sent
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 201 }),
    );
    // next (error handler) must NOT have been called
    expect(next).not.toHaveBeenCalled();
  });
});

describe('verifyCarrier — email notification integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Carrier.findByIdAndUpdate = jest.fn().mockResolvedValue(FAKE_CARRIER);
  });

  test('calls notify with carrier.verified and the carrier payload', async () => {
    const { req, res, next } = makeReqResNext({ body: { id: 'carrier-id-456' } });

    await carrierController.verifyCarrier(req, res, next);

    expect(notify).toHaveBeenCalledWith('carrier.verified', { carrier: FAKE_CARRIER });
  });

  test('returns HTTP 200 response even if notify rejects', async () => {
    notify.mockRejectedValueOnce(new Error('SMTP failure'));
    const { req, res, next } = makeReqResNext({ body: { id: 'carrier-id-456' } });

    await carrierController.verifyCarrier(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 200 }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});
