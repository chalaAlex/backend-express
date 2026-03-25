const Review = require("../model/reviewModel");
const ShipmentRequest = require("../model/shipmentRequestModel");
const Carrier = require("../model/carrierModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// -------------------- GET REVIEWS FOR TARGET --------------------//
exports.getReviewsForTarget = catchAsync(async (req, res, next) => {
  const { targetId, targetType } = req.query;

  if (!targetId || !targetType) {
    return next(new AppError("targetId and targetType query params are required", 400));
  }

  if (!["carrier_owner", "company"].includes(targetType)) {
    return next(new AppError("targetType must be 'carrier_owner' or 'company'", 400));
  }

  const reviews = await Review.find({ targetId, targetType })
    .populate("reviewerId", "firstName lastName")
    .sort({ createdAt: -1 });

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved reviews",
    total: reviews.length,
    data: reviews,
  });
});

// -------------------- CREATE REVIEW ----------------------------//
exports.createReview = catchAsync(async (req, res, next) => {
  const { shipmentRequestId, rating, comment } = req.body;
  const reviewerId = req.user.id;

  // 1. Role check
  if (req.user.role !== "freight_owner") {
    return next(new AppError("Only freight owners can submit reviews", 403));
  }

  // 2. Fetch the shipment request
  const shipmentRequest = await ShipmentRequest.findById(shipmentRequestId);
  if (!shipmentRequest) {
    return next(new AppError("ShipmentRequest not found", 404));
  }

  // 3. Must be COMPLETED
  if (shipmentRequest.status !== "COMPLETED") {
    return next(new AppError("Shipment must be COMPLETED before reviewing", 400));
  }

  // 4. Must be the freight owner of this shipment
  if (shipmentRequest.freightOwnerId.toString() !== reviewerId) {
    return next(new AppError("You are not authorized to review this shipment", 403));
  }

  // 5. Must not already be reviewed
  if (shipmentRequest.isReviewed) {
    return next(new AppError("This shipment has already been reviewed", 409));
  }

  // 6. Resolve polymorphic target from the carrier
  const carrier = await Carrier.findById(shipmentRequest.carrierId);
  if (!carrier) {
    return next(new AppError("Carrier not found", 404));
  }

  let targetId, targetType;
  if (carrier.isItCompaniesCarrier) {
    targetType = "company";
    targetId = carrier.company;
  } else {
    targetType = "carrier_owner";
    targetId = carrier.truckOwner;
  }

  // 7. Create the review
  const review = await Review.create({
    reviewerId,
    shipmentRequestId,
    targetId,
    targetType,
    rating,
    comment,
  });

  // 8. Mark shipment as reviewed
  shipmentRequest.isReviewed = true;
  await shipmentRequest.save();

  res.status(201).json({
    statusCode: 201,
    message: "Review created successfully",
    data: review,
  });
});

// -------------------- GET SINGLE REVIEW ------------------------//
exports.getReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id)
    .populate("reviewerId", "firstName lastName");

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved review",
    data: review,
  });
});

// -------------------- DELETE REVIEW (admin only) ---------------//
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findByIdAndDelete(req.params.id);

  if (!review) {
    return next(new AppError("Review not found", 404));
  }

  res.status(204).json({
    statusCode: 204,
    message: "Review deleted successfully",
    data: null,
  });
});
