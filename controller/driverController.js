const User = require("../model/userModel");
const Carrier = require("../model/carrierModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const filterObj = require("../utils/filterObj");
const mongoose = require("mongoose");
const Driver = require("../model/driverModel");

// -------------------- CREATE Driver --------------------//
exports.createDriver = catchAsync(async (req, res, next) => {
  const { licenseNumber, licenseExpiry, licenseImage, assignedTruck, firstName, lastName, phone } = req.body;

  if (!firstName) return next(new AppError("First name is required", 400));
  if (!lastName) return next(new AppError("Last name is required", 400));
  if (!phone) return next(new AppError("Phone number is required", 400));
  if (!licenseNumber) return next(new AppError("License number is required", 400));
  if (!licenseImage) return next(new AppError("License image is required", 400));

  if (assignedTruck && !mongoose.Types.ObjectId.isValid(assignedTruck)) {
    return next(new AppError("Invalid assigned truck id", 400));
  }

  try {
    // Auto-generate a unique placeholder email so the User discriminator is satisfied
    const placeholderEmail = `driver.${phone.replace(/\D/g, "")}@internal.fleet`;

    const driverData = {
      firstName,
      lastName,
      phone,
      email: placeholderEmail,
      role: "driver",
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
      licenseImage,
      assignedTruck,
      carrierOwner: req.user.id,
    };

    const newDriver = new Driver(driverData);
    await newDriver.save();

    res.status(201).json({
      statusCode: 201,
      message: "Driver created successfully",
      data: { driver: newDriver },
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || "field";
      return next(new AppError(`${duplicateField} already exists`, 400));
    }
    return next(error);
  }
});

// -------------------- GET My Drivers (carrier_owner) ---//
exports.getMyDrivers = catchAsync(async (req, res) => {
  const drivers = await Driver.find({ carrierOwner: req.user.id }).populate(
    "assignedTruck",
    "model plateNumber brand loadCapacity"
  );

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved your drivers",
    total: drivers.length,
    data: {
      drivers,
    },
  });
});

// -------------------- GET ALL Drivers ------------------//
exports.getAllDriver = catchAsync(async (req, res) => {
  const features = new APIFeatures(Driver.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const drivers = await features.query
    .populate("assignedTruck", "model plateNumber brand")
    .populate("carrierOwner", "firstName lastName phone");

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all drivers",
    total: drivers.length,
    data: {
      drivers,
    },
  });
});

// -------------------- GET Single Driver ----------------//
exports.getDriver = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid driver id", 400));
  }

  const driver = await Driver.findById(id)
    .populate("assignedTruck", "model plateNumber brand loadCapacity")
    .populate("carrierOwner", "firstName lastName phone email");

  if (!driver) {
    return next(new AppError("Driver not found", 404));
  }

  // Allow admin to view any driver, carrier_owner can only view their own
  if (req.user.role !== 'admin' && driver.carrierOwner.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to access this driver', 403));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Driver retrieved successfully",
    data: {
      driver,
    },
  });
});

// -------------------- UPDATE Driver --------------------//
exports.updateDriver = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid driver id", 400));
  }

  // Fetch first to check ownership
  const driver = await Driver.findById(id);
  if (!driver) {
    return next(new AppError("Driver not found", 404));
  }

  // Allow admin to update any driver, carrier_owner can only update their own
  if (req.user.role !== 'admin' && driver.carrierOwner.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to access this driver', 403));
  }

  // Define allowed fields for update (carrierOwner is intentionally excluded)
  const allowedFields = [
    "firstName",
    "lastName",
    "phone",
    "email",
    "profileImage",
    "licenseNumber",
    "licenseExpiry",
    "licenseImage",
    "assignedTruck",
  ];

  const filteredBody = filterObj(req.body, allowedFields);

  // Validate assignedTruck if provided
  if (filteredBody.assignedTruck && !mongoose.Types.ObjectId.isValid(filteredBody.assignedTruck)) {
    return next(new AppError("Invalid assigned truck id", 400));
  }

  // Convert licenseExpiry to Date if provided
  if (filteredBody.licenseExpiry) {
    filteredBody.licenseExpiry = new Date(filteredBody.licenseExpiry);
  }

  try {
    const updatedDriver = await Driver.findByIdAndUpdate(id, filteredBody, {
      new: true,
      runValidators: true,
    })
      .populate("assignedTruck", "model plateNumber brand loadCapacity")
      .populate("carrierOwner", "firstName lastName phone email");

    res.status(200).json({
      statusCode: 200,
      message: "Driver updated successfully",
      data: {
        driver: updatedDriver,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue || {})[0] || "field";
      return next(new AppError(`${duplicateField} already exists`, 400));
    }
    return next(error);
  }
});

// -------------------- DELETE Driver --------------------//
exports.deleteDriver = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid driver id", 400));
  }

  // Check if driver exists
  const driver = await Driver.findById(id);
  if (!driver) {
    return next(new AppError("Driver not found", 404));
  }

  // Allow admin to delete any driver, carrier_owner can only delete their own
  if (req.user.role !== 'admin' && driver.carrierOwner.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to access this driver', 403));
  }

  // Remove driver from any carriers they're assigned to
  await Carrier.updateMany(
    { driver: id },
    { $pull: { driver: id } }
  );

  // Delete the driver
  await Driver.findByIdAndDelete(id);

  res.status(204).json({
    statusCode: 204,
    message: "Driver deleted successfully",
    data: null,
  });
});

// -------------------- GET My Assigned Truck ------------//
exports.getMyAssignedTruck = catchAsync(async (req, res, next) => {
  const driverId = req.user.id;

  // Find the driver
  const driver = await Driver.findById(driverId);

  if (!driver) {
    return next(new AppError("Driver not found", 404));
  }

  // Find the carrier that has this driver assigned
  const carrier = await Carrier.findOne({ driver: driverId })
    .populate("truckOwner", "firstName lastName phone email ratingAverage ratingQuantity")
    .populate("company", "legalEntityName email phone");

  if (!carrier) {
    return res.status(200).json({
      statusCode: 200,
      message: "No carrier assigned to this driver",
      data: {
        driver: {
          _id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          licenseNumber: driver.licenseNumber,
          licenseExpiry: driver.licenseExpiry,
        },
        assignedCarrier: null,
      },
    });
  }

  res.status(200).json({
    statusCode: 200,
    message: "Assigned carrier retrieved successfully",
    data: {
      driver: {
        _id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        licenseNumber: driver.licenseNumber,
        licenseExpiry: driver.licenseExpiry,
        assignedCarrier: {
          _id: carrier._id,
        },
      },
    },
  });
});

// -------------------- Legacy Methods -------------------//
exports.assignDriversToCarrier = catchAsync(async (req, res, next) => {
  const carrierId = req.params.carrierId || req.params.id || req.body.carrierId;
  const driverIds = req.body.driverIds || req.body.drivers;

  if (!carrierId) {
    return next(new AppError("Carrier id is required", 400));
  }

  if (!Array.isArray(driverIds) || driverIds.length === 0) {
    return next(new AppError("driverIds must be a non-empty array", 400));
  }

  const carrier = await Carrier.findByIdAndUpdate(
    carrierId,
    {
      $addToSet: {
        driver: {
          $each: driverIds,
        },
      },
    },
    { new: true, runValidators: true },
  );

  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  await Driver.updateMany(
    {
      _id: {
        $in: driverIds,
      },
    },
    {
      assignedTruck: carrier._id,
      carrierOwner: carrier.truckOwner,
    },
  );

  res.status(200).json({
    statusCode: 200,
    message: "Drivers assigned to carrier successfully",
    data: {
      carrier,
    },
  });
});
