const fs = require("fs");
const Freight = require("./../model/freightModel");
const { match } = require("assert");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

// --------------- GET ALL FREIGHT ---------------//
exports.getAllFreights = catchAsync(async (req, res) => {
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
});

// --------------- CREATE FREIGHT ---------------//
exports.createFreight = catchAsync(async (req, res) => {
  const newFreight = await Freight.create(req.body);
  res.status(201).json({
    status: "201",
    data: {
      freight: newFreight,
    },
  });
});

// --------------- GET FREIGHT ---------------//
exports.getFreight = catchAsync(async (req, res) => {
  console.log("ID:", req.params.id);
  const freight = await Freight.findById(req.params.id);
  res.status(200).json({
    status: "200",
    mesage: "Orders successfully retrived",
    data: {
      freight,
    },
  });
});

// --------------- UPDATE FREIGHT ---------------//
exports.updateFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.status(200).json({
    status: "200",
    data: {
      tour: freight,
    },
  });
});

// --------------- DELETE FREIGHT ---------------//
exports.deleteFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "200",
    data: {
      freight,
    },
  });
});

exports.getFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findById(req.params.id);
  res.status(200).json({
    status: "200",
    mesage: "Orders successfully retrived",
    data: {
      freight,
    },
  });
  res.status(400).json({
    staus: "Fail",
    message: "Error: " + err,
  });
});
