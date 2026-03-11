const Region = require("../model/regionModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

// -------------------- GET ALL Regions ------------------//
exports.getAllRegions = catchAsync(async (req, res) => {
  const features = new APIFeatures(Region.find({ isActive: true }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const regions = await features.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all regions",
    total: regions.length,
    data: {
      regions,
    },
  });
});

// -------------------- CREATE Region --------------------//
exports.createRegion = catchAsync(async (req, res, next) => {
  const { name, country } = req.body;

  if (!name) {
    return next(new AppError("Region name is required", 400));
  }

  try {
    const newRegion = await Region.create({
      name,
      country: country || "Ethiopia",
    });

    res.status(201).json({
      statusCode: 201,
      message: "Region created successfully",
      data: {
        region: newRegion,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Region already exists", 400));
    }
    return next(error);
  }
});

// -------------------- GET Single Region ----------------//
exports.getRegion = catchAsync(async (req, res, next) => {
  const region = await Region.findById(req.params.id);

  if (!region) {
    return next(new AppError("Region not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Region retrieved successfully",
    data: {
      region,
    },
  });
});

// -------------------- UPDATE Region --------------------//
exports.updateRegion = catchAsync(async (req, res, next) => {
  const { name, country, isActive } = req.body;

  const updatedRegion = await Region.findByIdAndUpdate(
    req.params.id,
    { name, country, isActive },
    { new: true, runValidators: true }
  );

  if (!updatedRegion) {
    return next(new AppError("Region not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Region updated successfully",
    data: {
      region: updatedRegion,
    },
  });
});

// -------------------- DELETE Region --------------------//
exports.deleteRegion = catchAsync(async (req, res, next) => {
  const region = await Region.findByIdAndDelete(req.params.id);

  if (!region) {
    return next(new AppError("Region not found", 404));
  }

  res.status(204).json({
    statusCode: 204,
    message: "Region deleted successfully",
    data: null,
  });
});
