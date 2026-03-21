const ShipmentRequest = require("../model/shipmentRequestModel");
const Freight = require("../model/freightModel");
const Carrier = require("../model/carrierModel");
const User = require("../model/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

// --------------------------- CREATE REQUEST -----------------------//
exports.createRequests = catchAsync(async (req, res, next) => {
  const { carrierId, freightIds, proposedPrice } = req.body;
  const freightOwnerId = req.user.id;

  // Validate input
  if (!carrierId) {
    return next(new AppError("Carrier ID is required", 400));
  }

  if (!freightIds || !Array.isArray(freightIds) || freightIds.length === 0) {
    return next(new AppError("At least one freight ID is required", 400));
  }

  // Fetch carrier
  const truck = await Carrier.findById(carrierId);
  if (!truck) {
    return next(new AppError("Carrier not found", 404));
  }

  const carrierOwnerId = truck.truckOwner;

  // Check for existing request for this carrier + freight owner pair
  const existingRequest = await ShipmentRequest.findOne({ carrierId, freightOwnerId });
  if (existingRequest) {
    return next(
      new AppError(
        "A request already exists between you and this carrier",
        409,
      ),
    );
  }

  // Fetch all freights
  const freights = await Freight.find({ _id: { $in: freightIds } });

  if (freights.length === 0) {
    return next(new AppError("No valid freights found", 404));
  }

  // Verify ownership and status for each freight
  for (const freight of freights) {
    if (freight.freightOwnerId.toString() !== freightOwnerId) {
      return next(
        new AppError(
          `You are not authorized to send requests for freight ${freight._id}`,
          403,
        ),
      );
    }
    if (!["OPEN", "BIDDING"].includes(freight.status)) {
      return next(
        new AppError(
          `Freight ${freight._id} has status ${freight.status} and cannot be requested`,
          400,
        ),
      );
    }
  }

  // Build snapshots array — one per freight
  const freightSnapshots = freights.map((freight) => ({
    freightId: freight._id,
    cargoType: freight.cargo.type,
    weight: freight.cargo.weightKg,
    quantity: freight.cargo.quantity || 1,
    pickupLocation: {
      region: freight.route.pickup.region,
      city: freight.route.pickup.city,
      address: freight.route.pickup.address,
    },
    deliveryLocation: {
      region: freight.route.dropoff.region,
      city: freight.route.dropoff.city,
      address: freight.route.dropoff.address,
    },
    pickupDate: freight.schedule.pickupDate,
    deliveryDate: freight.schedule.deliveryDeadline,
    specialRequirements: freight.cargo.description,
  }));

  // Get freight owner contact info
  const freightOwner = await User.findById(freightOwnerId);
  const freightOwnerContact = {
    name: `${freightOwner.firstName} ${freightOwner.lastName || ""}`.trim(),
    companyName: freightOwner.companyName || "",
    email: freightOwner.email,
    phone: freightOwner.phone,
  };

  // Create single request document
  const newRequest = await ShipmentRequest.create({
    freightOwnerId,
    carrierOwnerId,
    carrierId,
    freightIds: freights.map((f) => f._id),
    status: "PENDING",
    freightSnapshots,
    proposedPrice: proposedPrice || undefined,
    freightOwnerContact,
  });

  res.status(201).json({
    statusCode: 201,
    message: "Request created successfully",
    data: {
      request: newRequest,
    },
  });
});

// --------------------------- CANCEL REQUEST -----------------------//
exports.cancelRequest = catchAsync(async (req, res, next) => {
  const requestId = req.params.id;
  const freightOwnerId = req.user.id;

  // Fetch request
  const request = await ShipmentRequest.findById(requestId);

  if (!request) {
    return next(new AppError("Request not found", 404));
  }

  // Verify ownership
  if (request.freightOwnerId.toString() !== freightOwnerId) {
    return next(
      new AppError("You are not authorized to cancel this request", 403),
    );
  }

  // Verify status is PENDING
  if (request.status !== "PENDING") {
    return next(
      new AppError(
        `Cannot cancel request with status ${request.status}. Only PENDING requests can be cancelled`,
        400,
      ),
    );
  }

  // Update status to CANCELLED
  request.status = "CANCELLED";
  await request.save();

  res.status(200).json({
    statusCode: 200,
    message: "Request cancelled successfully",
    data: {
      request,
    },
  });
});

// --------------------------- ACCEPT REQUEST -----------------------//
exports.acceptRequest = catchAsync(async (req, res, next) => {
  const requestId = req.params.id;
  const carrierOwnerId = req.user.id;

  // Fetch request and populate carrier
  const request = await ShipmentRequest.findById(requestId).populate("carrierId");

  if (!request) {
    return next(new AppError("Request not found", 404));
  }

  // Verify carrier ownership
  if (request.carrierId.truckOwner.toString() !== carrierOwnerId) {
    return next(
      new AppError("You are not authorized to accept this request", 403),
    );
  }

  // Verify status is PENDING
  if (request.status !== "PENDING") {
    return next(
      new AppError(
        `Cannot accept request with status ${request.status}. Only PENDING requests can be accepted`,
        400,
      ),
    );
  }

  // Fetch freight and verify it's not already booked
  const freight = await Freight.findById(request.freightIds);

  if (!freight) {
    return next(new AppError("Freight not found", 404));
  }

  if (freight.status === "BOOKED") {
    return next(
      new AppError("Freight is already booked by another carrier", 409),
    );
  }

  // Start transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Update request status to ACCEPTED
    request.status = "ACCEPTED";
    await request.save({ session });

    // Update freight status to BOOKED
    freight.status = "BOOKED";
    await freight.save({ session });

    // Find and update all other pending requests to REJECTED
    const autoRejectedResult = await ShipmentRequest.updateMany(
      {
        freightIds: request.freightIds,
        status: "PENDING",
        _id: { $ne: requestId },
      },
      { status: "REJECTED" },
      { session },
    );

    await session.commitTransaction();

    res.status(200).json({
      statusCode: 200,
      message: "Request accepted successfully",
      data: {
        request,
        freight,
        autoRejectedCount: autoRejectedResult.modifiedCount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// --------------------------- REJECT REQUEST -----------------------//
exports.rejectRequest = catchAsync(async (req, res, next) => {
  const requestId = req.params.id;
  const carrierOwnerId = req.user.id;

  // Fetch request and populate carrier
  const request = await ShipmentRequest.findById(requestId).populate("carrierId");

  if (!request) {
    return next(new AppError("Request not found", 404));
  }

  // Verify carrier ownership
  if (request.carrierId.truckOwner.toString() !== carrierOwnerId) {
    return next(
      new AppError("You are not authorized to reject this request", 403),
    );
  }

  // Verify status is PENDING
  if (request.status !== "PENDING") {
    return next(
      new AppError(
        `Cannot reject request with status ${request.status}. Only PENDING requests can be rejected`,
        400,
      ),
    );
  }

  // Update status to REJECTED
  request.status = "REJECTED";
  await request.save();

  res.status(200).json({
    statusCode: 200,
    message: "Request rejected successfully",
    data: {
      request,
    },
  });
});

// --------------------------- GET SENT REQUESTS -----------------------//
exports.getSentRequests = catchAsync(async (req, res, next) => {
  const freightOwnerId = req.user.id;

  // Build filter
  const filter = { freightOwnerId };

  // Add optional status filter
  if (req.query.status) {
    filter.status = req.query.status.toUpperCase();
  }

  // Add optional freightIds filter
  if (req.query.freightIds) {
    filter.freightIds = req.query.freightIds;
  }

  // Query requests
  const requests = await ShipmentRequest.find(filter)
    .populate("carrierId", "model brand plateNumber")
    .populate("freightIds", "cargo route schedule status")
    .sort({ createdAt: -1 });

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved sent requests",
    total: requests.length,
    data: {
      requests,
    },
  });
});

// --------------------------- GET RECEIVED REQUESTS -----------------------//
exports.getReceivedRequests = catchAsync(async (req, res, next) => {
  const carrierOwnerId = req.user.id;

  // Find all trucks owned by the user
  const trucks = await Carrier.find({ truckOwner: carrierOwnerId });
  const truckIds = trucks.map((truck) => truck._id);

  if (truckIds.length === 0) {
    return res.status(200).json({
      statusCode: 200,
      message: "No trucks found for this carrier owner",
      total: 0,
      data: {
        requests: [],
      },
    });
  }

  // Build filter
  const filter = { carrierId: { $in: truckIds } };

  // Add optional status filter
  if (req.query.status) {
    filter.status = req.query.status.toUpperCase();
  }

  // Query requests
  const requests = await ShipmentRequest.find(filter)
    .populate("freightIds", "cargo route schedule status")
    .populate("freightOwnerId", "firstName lastName email phone")
    .populate("carrierId", "model brand plateNumber")
    .sort({ createdAt: -1 });

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved received requests",
    total: requests.length,
    data: {
      requests,
    },
  });
});
