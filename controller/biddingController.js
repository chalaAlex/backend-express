const Bidding = require("./../model/biddingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Freight = require("./../model/freightModel");
const Truck = require("./../model/truckModel");
const APIFeatures = require("./../utils/apiFeatures");
const filterObj = require("../utils/filterObj");
const { Types } = require("mongoose");

// ------------------------ CREATE BID -----------------------//
exports.createBidding = catchAsync(async (req, res, next) => {
  const { freightId, carrierId } = { ...req.body };
  if (req.user.role !== "carrier_owner") {
    return next(new AppError("You must be a carrier owner to send a bid", 403));
  }
  const freight = await Freight.findById(freightId);
  if (!freight) {
    return next(
      new AppError("We couldn't find the freight you ned to bid on", 404),
    );
  }

  if (!["OPEN", "BIDDING"].includes(freight.status)) {
    return next(
      new AppError("You can't bid on Booked, Completed or Cancelled frieghts"),
    );
  }

  const truck = await Truck.findById(req.body.carrierId);

  if (!truck) {
    return next(
      new AppError("We couldn't find the truck you need to bid with", 404),
    );
  }

  if (
    typeof req.body.bidAmount !== "number" ||
    Number.isNaN(req.body.bidAmount)
  ) {
    return next(new AppError("bidAmount must be a number", 400));
  }

  if (truck.loadCapacity < freight.truckRequirement.minCapacityKg)
    throw new AppError(
      "This truck does not meet the freight minimum capacity requirement",
      400,
    );

  const existingBid = await Bidding.findOne({
    freightId,
    carrierId,
  });

  console.log(existingBid);
  if (existingBid) throw new AppError("You have already placed a bid");

  const newBidding = await Bidding.create(req.body);

  if (freight.status === "OPEN") {
    await Freight.findByIdAndUpdate(freightId, { status: "BIDDING" });
  }

  res.status(201).json({
    statusCode: 201,
    message: "Successfully created bidding",
    data: {
      bidding: newBidding,
    },
  });
});

exports.getAllBids = catchAsync(async (req, res) => {
  const feature = new APIFeatures(Bidding.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const bids = await feature.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all bids",
    total: bids.length,
    data: bids,
  });
});

// ------------------------ GET BID -----------------------//
exports.getBidding = catchAsync(async (req, res, next) => {
  const bidding = await Bidding.findById(req.params.id);
  if (!bidding) {
    return next(new AppError("No bid found with that id", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Bidding successfully retrieved",
    data: {
      bidding,
    },
  });
});

exports.updateBidding = catchAsync(async (req, res, next) => {
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
  const existingBid = await Bidding.findById(id);

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
  console.log(freight._id.toString());

  if (!freight || !freight.isAvailable) {
    return next(
      new AppError("Bidding is already closed for this freight", 400),
    );
  }

  // (Optional) prevent update after bid accepted
  if (existingBid.status === "ACCEPTED") {
    return next(new AppError("Accepted bid cannot be updated", 400));
  }

  // 7️⃣ Perform update
  const updatedBidding = await Bidding.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    message: "Bidding updated successfully",
    data: updatedBidding,
  });
});

exports.deleteBidding = catchAsync(async (req, res, next) => {
  const bidding = await Bidding.findByIdAndDelete(req.params.id);
  if (!bidding) {
    return next(new AppError("No bid found with that id", 404));
  }
  res.status(204).json({
    statusCode: 204,
    message: "Successfully deleted bidding",
    data: null,
  });
});
