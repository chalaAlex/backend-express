const CarrierType = require("../model/carrierTypeModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

// -------------------- GET ALL Carrier Types ------------//
exports.getAllCarrierTypes = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    CarrierType.find({ isActive: true }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const carrierTypes = await features.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all carrier types",
    total: carrierTypes.length,
    data: {
      carrierTypes,
    },
  });
});

// -------------------- CREATE Carrier Type --------------//
exports.createCarrierType = catchAsync(async (req, res, next) => {
  const { name, icon, description } = req.body;

  if (!name) {
    return next(new AppError("Carrier type name is required", 400));
  }

  try {
    const newCarrierType = await CarrierType.create({
      name,
      icon,
      description,
    });

    res.status(201).json({
      statusCode: 201,
      message: "Carrier type created successfully",
      data: {
        carrierType: newCarrierType,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Carrier type already exists", 400));
    }
    return next(error);
  }
});

// -------------------- GET Single Carrier Type ----------//
exports.getCarrierType = catchAsync(async (req, res, next) => {
  const carrierType = await CarrierType.findById(req.params.id);

  if (!carrierType) {
    return next(new AppError("Carrier type not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Carrier type retrieved successfully",
    data: {
      carrierType,
    },
  });
});

// -------------------- UPDATE Carrier Type --------------//
exports.updateCarrierType = catchAsync(async (req, res, next) => {
  const { name, icon, description, isActive } = req.body;

  const updatedCarrierType = await CarrierType.findByIdAndUpdate(
    req.params.id,
    { name, icon, description, isActive },
    { new: true, runValidators: true }
  );

  if (!updatedCarrierType) {
    return next(new AppError("Carrier type not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Carrier type updated successfully",
    data: {
      carrierType: updatedCarrierType,
    },
  });
});

// -------------------- DELETE Carrier Type --------------//
exports.deleteCarrierType = catchAsync(async (req, res, next) => {
  const carrierType = await CarrierType.findByIdAndDelete(req.params.id);

  if (!carrierType) {
    return next(new AppError("Carrier type not found", 404));
  }

  res.status(204).json({
    statusCode: 204,
    message: "Carrier type deleted successfully",
    data: null,
  });
});
