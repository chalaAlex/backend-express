const fs = require("fs");
const Freight = require("./../model/freightModel");
const { match } = require("assert");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.getAllFreights = catchAsync(async (req, res) => {
  try {
    const feature = new APIFeatures(Freight.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate(); // Method Chaining

    const freight = await feature.query;

    res.status(200).json({
      status: "200",
      total: freight.length,
      mesage: "Successfully retrived",
      data: freight,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json({
      status: "400",
      message: "Invalid",
    });
  }
});

exports.createFreight = catchAsync(async (req, res) => {
  try {
    const newFreight = await Freight.create(req.body);
    res.status(201).json({
      status: "201",
      data: {
        tour: newFreight,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "Fail",
      message: "Invalid sent data",
    });
  }
});
