const Truck = require("./../model/truckModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

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
exports.createTruck = catchAsync(async (req, res, next) => {
  if (req.user.role !== "carrier_owner") {
    return next(new AppError("Only carrier owners can create trucks", 403));
  }

   const newTruck = await Truck.create({
    ...req.body,
    truckOwner: req.user.id,
  });

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
  const truck = await Truck.findById(req.params.id).populate(
    "truckOwner",
    "firstName lastName phone",
  );
  res.status(200).json({
    statusCode: 200,
    message: "Truck successfully retrieved",
    data: {
      truck,
    },
  });
});

// --------------- GET TRUCK by USER_ID ---------------//
exports.getMyTrucks = catchAsync(async (req, res) => {
  console.log("get my truck called");
  console.log(req.user.id);
  const trucks = await Truck.find({ truckOwner: req.user.id });

  res.status(200).json({
    status: "success",
    results: trucks.length,
    data: {
      trucks,
    },
  });
});

// --------------- UPDATE TRUCK ---------------//
exports.updateTruck = catchAsync(async (req, res, next) => {
  const allowedFields = [
    "model",
    "plateNumber",
    "brand",
    "pricePerKm",
    "loadCapacity",
    "features",
    "location",
    "radiusKm",
    "image",
    "isAvailable",
  ];

  const filteredBody = filterObj(req.body, allowedFields);
  const truck = await Truck.findById(req.params.id);

  // check existence
  if (!truck) {
    return next(new AppError("No truck is found with that id", 404));
  }

  // Ownership check
  if (truck.truckOwner.toString() !== req.user.id) {
    return next(new AppError("You are not allowed to delete this truck", 403));
  }

  Object.assign(truck, filteredBody);
  await truck.save();

  res.status(200).json({
    statusCode: 200,
    message: "Truck successfully updated",
    data: {
      truck,
    },
  });
});

// --------------- DELETE TRUCK ---------------//
exports.deleteTruck = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Validate Mongo ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid truck id", 400));
  }

  // 2️⃣ Find truck
  const truck = await Truck.findById(id);

  if (!truck) {
    return next(new AppError("Truck not found", 404));
  }

  // 3️⃣ Authorization → only owner or admin
  if (
    truck.truckOwnerId.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(new AppError("You are not allowed to delete this truck", 403));
  }

  // 4️⃣ Business rule → prevent deletion if assigned
  if (!truck.isAvailable) {
    return next(new AppError("Truck is currently assigned to a booking", 400));
  }

  // 5️⃣ Soft delete
  truck.isActive = false;
  await truck.save();

  // 6️⃣ Proper response
  res.status(200).json({
    statusCode: 200,
    message: "Truck successfully deleted",
  });
});
