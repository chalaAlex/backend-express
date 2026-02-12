const Truck = require("./../model/truckModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

// --------------- GET ALL TRUCKS ---------------//
exports.getAllTrucks = catchAsync(async (req, res) => {
  const feature = new APIFeatures(Truck.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

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

// --------------- CREATE TRUCK ---------------//
exports.createTruck = catchAsync(async (req, res) => {
  const newTruck = await Truck.create(req.body);
  res.status(201).json({
    statusCode: 201,
    message: "Successfully created truck",
    data: {
      truck: newTruck,
    },
  });
});

// --------------- GET TRUCK ---------------//
exports.getTruck = catchAsync(async (req, res) => {
  console.log("ID:", req.params.id);
  const truck = await Truck.findById(req.params.id);
  res.status(200).json({
    statusCode: 200,
    message: "Truck successfully retrieved",
    data: {
      truck,
    },
  });
});

// --------------- UPDATE TRUCK ---------------//
exports.updateTruck = catchAsync(async (req, res) => {
  const truck = await Truck.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.status(200).json({
    statusCode: 200,
    message: "Truck successfully updated",
    data: {
      truck,
    },
  });
});

// --------------- DELETE TRUCK ---------------//
exports.deleteTruck = catchAsync(async (req, res) => {
  const truck = await Truck.findByIdAndDelete(req.params.id);

  res.status(204).json({
    statusCode: 204,
    message: "Truck successfully deleted",
    data: {
      truck,
    },
  });
});
