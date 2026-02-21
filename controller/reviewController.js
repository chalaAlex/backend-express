const Review = require("../model/reviewModel");
const catchAsync = require("../utils/catchAsync");
const APIFeatures = require("./../utils/apiFeatures");

exports.getAllReiview = catchAsync(async (req, res) => {
  const feature = new APIFeatures(Review.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate(); // Method Chaining

  const review = await feature.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrived all reiview",
    total: review.length,
    data: review,
  });
});

exports.createReview = catchAsync(async (req, res) => {
  const review = await Review.create(req.body);

  return res.status(201).json({
    message: "Review created successfully",
    data: review,
  });
});

exports.getReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      statusCode: 404,
      message: "Review not found",
    });
  }

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved review",
    data: review,
  });
});

exports.updateReview = catchAsync(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({
      statusCode: 404,
      message: "Review not found",
    });
  }

  // Check if the logged-in user is the one who created the review
  if (review.reviewerId.toString() !== req.user.id) {
    return res.status(403).json({
      statusCode: 403,
      message: "You are not authorized to update this review",
    });
  }

  const updatedReview = await Review.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    statusCode: 200,
    message: "Review updated successfully",
    data: updatedReview,
  });
});

exports.deleteReview = catchAsync(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);

  if (!review) {
    return res.status(404).json({
      statusCode: 404,
      message: "Review not found",
    });
  }

  res.status(204).json({
    statusCode: 204,
    message: "Review deleted successfully",
    data: null,
  });
});
