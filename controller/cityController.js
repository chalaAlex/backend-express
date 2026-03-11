const City = require("../model/cityModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const mongoose = require("mongoose");

// -------------------- GET ALL Cities -------------------//
exports.getAllCities = catchAsync(async (req, res) => {
  const features = new APIFeatures(City.find({ isActive: true }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const cities = await features.query.populate("region", "name");

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all cities",
    total: cities.length,
    data: {
      cities,
    },
  });
});

// -------------- GET Cities by Region -------------------//
exports.getCitiesByRegion = catchAsync(async (req, res, next) => {
  const { regionId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(regionId)) {
    return next(new AppError("Invalid region ID", 400));
  }

  const cities = await City.find({ region: regionId, isActive: true })
    .populate("region", "name")
    .sort("name");

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved cities for region",
    total: cities.length,
    data: {
      cities,
    },
  });
});

// -------------------- CREATE City ----------------------//
exports.createCity = catchAsync(async (req, res, next) => {
  const { name, region } = req.body;

  if (!name) {
    return next(new AppError("City name is required", 400));
  }

  if (!region || !mongoose.Types.ObjectId.isValid(region)) {
    return next(new AppError("Valid region ID is required", 400));
  }

  try {
    const newCity = await City.create({ name, region });

    const populatedCity = await City.findById(newCity._id).populate(
      "region",
      "name"
    );

    res.status(201).json({
      statusCode: 201,
      message: "City created successfully",
      data: {
        city: populatedCity,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("City already exists", 400));
    }
    return next(error);
  }
});

// -------------------- GET Single City ------------------//
exports.getCity = catchAsync(async (req, res, next) => {
  const city = await City.findById(req.params.id).populate("region", "name");

  if (!city) {
    return next(new AppError("City not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "City retrieved successfully",
    data: {
      city,
    },
  });
});

// -------------------- UPDATE City ----------------------//
exports.updateCity = catchAsync(async (req, res, next) => {
  const { name, region, isActive } = req.body;

  if (region && !mongoose.Types.ObjectId.isValid(region)) {
    return next(new AppError("Invalid region ID", 400));
  }

  const updatedCity = await City.findByIdAndUpdate(
    req.params.id,
    { name, region, isActive },
    { new: true, runValidators: true }
  ).populate("region", "name");

  if (!updatedCity) {
    return next(new AppError("City not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "City updated successfully",
    data: {
      city: updatedCity,
    },
  });
});

// -------------------- DELETE City ----------------------//
exports.deleteCity = catchAsync(async (req, res, next) => {
  const city = await City.findByIdAndDelete(req.params.id);

  if (!city) {
    return next(new AppError("City not found", 404));
  }

  res.status(204).json({
    statusCode: 204,
    message: "City deleted successfully",
    data: null,
  });
});
