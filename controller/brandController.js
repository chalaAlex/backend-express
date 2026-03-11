const Brand = require("../model/brandModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

// -------------------- GET ALL Brands -------------------//
exports.getAllBrands = catchAsync(async (req, res) => {
  const features = new APIFeatures(Brand.find({ isActive: true }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const brands = await features.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all brands",
    total: brands.length,
    data: {
      brands,
    },
  });
});

// -------------------- CREATE Brand ---------------------//
exports.createBrand = catchAsync(async (req, res, next) => {
  const { name, logo, description } = req.body;

  if (!name) {
    return next(new AppError("Brand name is required", 400));
  }

  try {
    const newBrand = await Brand.create({
      name,
      logo,
      description,
    });

    res.status(201).json({
      statusCode: 201,
      message: "Brand created successfully",
      data: {
        brand: newBrand,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError("Brand already exists", 400));
    }
    return next(error);
  }
});

// -------------------- GET Single Brand -----------------//
exports.getBrand = catchAsync(async (req, res, next) => {
  const brand = await Brand.findById(req.params.id);

  if (!brand) {
    return next(new AppError("Brand not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Brand retrieved successfully",
    data: {
      brand,
    },
  });
});

// -------------------- UPDATE Brand ---------------------//
exports.updateBrand = catchAsync(async (req, res, next) => {
  const { name, logo, description, isActive } = req.body;

  const updatedBrand = await Brand.findByIdAndUpdate(
    req.params.id,
    { name, logo, description, isActive },
    { new: true, runValidators: true }
  );

  if (!updatedBrand) {
    return next(new AppError("Brand not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Brand updated successfully",
    data: {
      brand: updatedBrand,
    },
  });
});

// -------------------- DELETE Brand ---------------------//
exports.deleteBrand = catchAsync(async (req, res, next) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);

  if (!brand) {
    return next(new AppError("Brand not found", 404));
  }

  res.status(204).json({
    statusCode: 204,
    message: "Brand deleted successfully",
    data: null,
  });
});
