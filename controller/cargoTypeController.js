const CargoType = require("./../model/cargoType");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.getAllCargoType = catchAsync(async (req, res) => {
  const feature = new APIFeatures(CargoType.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate(); // Method Chaining

  const cargoType = await feature.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrived all CargoType",
    total: cargoType.length,
    data: cargoType,
  });
});

exports.createCargoType = catchAsync(async (req, res) => {
  const newCargoType = await CargoType.create(req.body);
  res.status(201).json({
    statusCode: 201,
    message: "Successfully created freight",
    data: {
      cargoType: newCargoType,
    },
  });
});

exports.getCargoType = catchAsync(async (req, res) => {
  const cargoType = await CargoType.findById(req.params.id);
  res.status(200).json({
    statusCode: 200,
    message: "CargoType successfully retrieved",
    data: {
      cargoType,
    },
  });
});

exports.deleteCargoType = catchAsync(async (req, res) => {
  const cargoType = await CargoType.findByIdAndDelete(req.params.id);

  res.status(204).json({
    statusCode: 204,
    message: "CargoType successfully deleted",
    data: {
      cargoType,
    },
  });
});
