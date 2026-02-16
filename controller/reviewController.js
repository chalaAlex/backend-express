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

