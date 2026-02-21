const Freight = require("./../model/freightModel");
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
    statusCode: 200,
    message: "Successfully retrived all freights",
    total: freight.length,
    data: freight,
  });
});

// --------------- CREATE FREIGHT ---------------//
exports.createFreight = catchAsync(async (req, res) => {
  const newFreight = await Freight.create({
    ...req.body,
    freightOwnerId: req.user.id,
  });
  res.status(201).json({
    statusCode: 201,
    message: "Successfully created freight",
    data: {
      freight: newFreight,
    },
  });
});

// ---------------- GET FREIGHT ------------------//
exports.getFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findById(req.params.id).populate("bids");
  res.status(200).json({
    statusCode: 200,
    message: "Freight successfully retrieved",
    data: {
      freight,
    },
  });
});

// ---------------- UPDATE FREIGHT ---------------//
exports.updateFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.status(200).json({
    statusCode: 200,
    message: "Freight successfully updated",
    data: {
      freight,
    },
  });
});

// --------------- DELETE FREIGHT ---------------//
exports.deleteFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findByIdAndDelete(req.params.id);

  res.status(204).json({
    statusCode: 204,
    message: "Freight successfully deleted",
    data: {
      freight,
    },
  });
});

// exports.getFreight = catchAsync(async (req, res) => {
//   const freight = await Freight.findById(req.params.id);
//   res.status(200).json({
//     statusCode: 200,
//     message: "Freight successfully retrieved",
//     data: {
//       freight,
//     },
//   });
//   res.status(400).json({
//     statusCode: 400,
//     message: "Error: " + err,
//   });
// });
