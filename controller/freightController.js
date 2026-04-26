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

// --------------- GET MY FREIGHTS ---------------//
exports.getMyFreights = catchAsync(async (req, res) => {
  const feature = new APIFeatures(
    Freight.find({ freightOwnerId: req.user.id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const freights = await feature.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved your freights",
    total: freights.length,
    data: {
      freights,
    },
  });
});

// ---------------- UPDATE FREIGHT ---------------//
exports.updateFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    statusCode: 200,
    message: "Freight successfully updated",
    data: {
      freight,
    },
  });
});

// --------------- FEATURE / UNFEATURE FREIGHT ---------------//
exports.featureFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findByIdAndUpdate(
    req.params.id,
    { isFeatured: true },
    { new: true }
  );
  res.status(200).json({
    statusCode: 200,
    message: "Freight marked as featured",
    data: { freight },
  });
});

exports.unfeatureFreight = catchAsync(async (req, res) => {
  const freight = await Freight.findByIdAndUpdate(
    req.params.id,
    { isFeatured: false },
    { new: true }
  );
  res.status(200).json({
    statusCode: 200,
    message: "Freight removed from featured",
    data: { freight },
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
