const fs = require("fs");
const Freight = require("./../model/freightModel");
const { match } = require("assert");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const Truck = require("./../model/truckModel");

// --------------- GET ALL TRUCKS ---------------//
exports.getAllTrucks = catchAsync(async (req, res) => {
  const feature = new APIFeatures(Truck.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate(); // Method Chaining

  const truck = await feature.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrived all trucks",
    total: truck.length,
    data: {
      trucks: truck,
    },
  });
});