const Feature = require("../model/featureModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

// -------------------- GET ALL Features -----------------//
exports.getAllFeatures = catchAsync(async (req, res) => {
  const features = new APIFeatures(Feature.find({ isActive: true }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const featuresList = await features.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all features",
    total: featuresList.length,
    data: {
      features: featuresList,
    },
  });
});

// -------------------- CREATE Feature -------------------//
exports.createFeature = catchAsync(async (req, res, next) => {
  const { name, icon, description } = req.body;

  if (!name) {
    return next(new AppError("Feature name is required", 400));
  }

  try {
    const newFeature = await Feature.create({
      name,
      icon,
      description,
    });

    res.status(201).json({
      statusCode: 201,
      message: "Feature created successfully",
      data: {
        feature: newFeature,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Feature already exists", 400));
    }
    return next(error);
  }
});

// -------------------- GET Single Feature ---------------//
exports.getFeature = catchAsync(async (req, res, next) => {
  const feature = await Feature.findById(req.params.id);

  if (!feature) {
    return next(new AppError("Feature not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Feature retrieved successfully",
    data: {
      feature,
    },
  });
});

// -------------------- UPDATE Feature -------------------//
exports.updateFeature = catchAsync(async (req, res, next) => {
  const { name, icon, description, isActive } = req.body;

  const updatedFeature = await Feature.findByIdAndUpdate(
    req.params.id,
    { name, icon, description, isActive },
    { new: true, runValidators: true }
  );

  if (!updatedFeature) {
    return next(new AppError("Feature not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Feature updated successfully",
    data: {
      feature: updatedFeature,
    },
  });
});

// -------------------- DELETE Feature -------------------//
exports.deleteFeature = catchAsync(async (req, res, next) => {
  const feature = await Feature.findByIdAndDelete(req.params.id);

  if (!feature) {
    return next(new AppError("Feature not found", 404));
  }

  res.status(204).json({
    statusCode: 204,
    message: "Feature deleted successfully",
    data: null,
  });
});
