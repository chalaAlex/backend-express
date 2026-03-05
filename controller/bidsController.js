const Bids = require("../model/bidsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const { Types } = require("mongoose");

const Freight = require("../model/freightModel");
const Carrier = require("../model/carrierModel");
const filterObj = require("../utils/filterObj");

// --------------------------- GET ALL BID -----------------------//
exports.getAllBid = catchAsync(async (req, res) => {
  let filter = {};
  if (req.params.freightId) filter = { freightId: req.params.freightId };
  const bids = await Bids.find(filter);

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all bids",
    total: bids.length,
    data: bids,
  });
});

// ---------------------------- CREATE BID -----------------------//
exports.createBid = catchAsync(async (req, res, next) => {
  if (!req.body.carrierOwnerId) req.body.carrierOwnerId = req.user.id;
  if (!req.body.freightId) req.body.freightId = req.params.freightId;

  const carrierOwnerId = req.body.carrierOwnerId;
  const freightId = req.body.freightId;

  // Check freight
  const freight = await Freight.findById(freightId);
  console.log(freightId)
  const freightOwnerId = freight.freightOwnerId.toString();

  if (!freight) {
    return next(
      new AppError("We couldn't find the freight you need to bid on", 404),
    );
  }

  if (!["OPEN", "BIDDING"].includes(freight.status)) {
    return next(
      new AppError(
        "You can't bid on Booked, Completed or Cancelled freights",
        400,
      ),
    );
  }

  // Validate bidAmount
  const { carrierId, bidAmount, message } = req.body;

  if (typeof bidAmount !== "number" || Number.isNaN(bidAmount)) {
    return next(new AppError("bidAmount must be a number", 400));
  }

  // Check truck
  const truck = await Truck.findById(carrierId);

  if (!truck) {
    return next(
      new AppError("We couldn't find the truck you need to bid with", 404),
    );
  }

  // ensure truck belongs to logged-in carrier
  if (truck.truckOwner.toString() !== carrierOwnerId.toString()) {
    return next(new AppError("This truck does not belong to you", 403));
  }

  // capacity validation
  if (truck.loadCapacity < freight.truckRequirement.minCapacityKg) {
    return next(
      new AppError(
        "This truck does not meet the freight minimum capacity requirement",
        400,
      ),
    );
  }

  // Prevent duplicate bid
  const existingBid = await Bids.findOne({
    freightId,
    carrierOwnerId,
  });

  if (existingBid) {
    return next(new AppError("You have already placed a bid", 400));
  }

  // Create bid
  const newBid = await Bids.create({
    freightOwnerId,
    carrierOwnerId,
    freightId,
    carrierId,
    bidAmount,
    message,
  });

  await Freight.findByIdAndUpdate(freightId, {
    $inc: { bidCount: 1 },
    ...(freight.status === "OPEN" && { status: "BIDDING" }),
  });

  res.status(201).json({
    statusCode: 201,
    message: "Successfully created bid",
    data: {
      bid: newBid,
    },
  });
});

// --------------------------- GET BID ---------------------------//
exports.getBid = catchAsync(async (req, res, next) => {
  const bidding = await Bids.findById(req.params.id);
  if (!bidding) {
    return next(new AppError("No bid found with that id", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Bid successfully retrieved",
    data: {
      bidding,
    },
  });
});

// --------------------------- UPDATE BID ---------------------------//
exports.updateBid = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  console.log(req.user.id);

  // 1️⃣ Validate ID format
  if (!Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid bidding ID", 400));
  }

  // 2️⃣ Allow only specific fields
  const allowedFields = ["bidAmount", "message"];
  const updateData = filterObj(req.body, allowedFields);

  // ❗ No valid fields sent
  if (Object.keys(updateData).length === 0) {
    return next(new AppError("No valid fields provided for update", 400));
  }

  // 3️⃣ Field-level validation
  if ("bidAmount" in updateData) {
    if (
      typeof updateData.bidAmount !== "number" ||
      Number.isNaN(updateData.bidAmount) ||
      updateData.bidAmount <= 0
    ) {
      return next(new AppError("bidAmount must be a positive number", 400));
    }
  }

  if ("message" in updateData && updateData.message.trim().length < 5) {
    return next(new AppError("Message must be at least 5 characters", 400));
  }

  // 4️⃣ Get existing bid
  const existingBid = await Bids.findById(id);

  if (!existingBid) {
    return next(new AppError("No bid found with that id", 404));
  }

  const isBidOwner = await Truck.exists({
    _id: existingBid.carrierId,
    truckOwner: req.user.id,
  });

  if (!isBidOwner) {
    return next(new AppError("You are not allowed to update this bid", 403));
  }

  // 6️⃣ Business rule → prevent update if freight closed
  const freight = await Freight.findById(existingBid.freightId);

  if (!freight || !freight.isAvailable) {
    return next(new AppError("Bids is already closed for this freight", 400));
  }

  // (Optional) prevent update after bid accepted
  if (existingBid.status === "ACCEPTED") {
    return next(new AppError("Accepted bid cannot be updated", 400));
  }

  // 7️⃣ Perform update
  const updatedBid = await Bids.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    message: "Bids updated successfully",
    data: updatedBids,
  });
});

// --------------------------- DELETE BID ---------------------------//
exports.deleteBid = catchAsync(async (req, res, next) => {
  const bidding = await Bids.findByIdAndDelete(req.params.id);
  if (!bidding) {
    return next(new AppError("No bid found with that id", 404));
  }
  res.status(204).json({
    statusCode: 204,
    message: "Successfully deleted bidding",
    data: null,
  });
});
