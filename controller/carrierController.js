const Carrier = require("./../model/carrierModel");
const Company = require("./../model/companyModel");
const Region = require("./../model/regionModel");
const City = require("./../model/cityModel");
const Brand = require("./../model/brandModel");
const Feature = require("./../model/featureModel");
const CarrierType = require("./../model/carrierTypeModel");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const User = require("./../model/userModel");

// -------------------- GET ALL carriers -----------------//
exports.getAllCarriers = catchAsync(async (req, res) => {
  const {
    company,
    carrierType,
    region,
    city,
    startLocation,
    destinationLocation,
    minLoadCapacity,
    maxLoadCapacity,
    brand,
    features,
    isAvailable,
    isVerified,
    search,
    page = 1,
    limit = 10,
    sort = "-createdAt",
  } = req.query;

  // Build filter object
  const filter = {};

  // Company filter
  if (company && mongoose.Types.ObjectId.isValid(company)) {
    filter.company = company;
  }

  // Carrier type filter
  if (carrierType) {
    filter.carrierType = carrierType;
  }

  // Brand filter
  if (brand) {
    filter.brand = { $regex: brand, $options: "i" };
  }

  // Load capacity range filter
  if (minLoadCapacity || maxLoadCapacity) {
    filter.loadCapacity = {};
    if (minLoadCapacity) filter.loadCapacity.$gte = Number(minLoadCapacity);
    if (maxLoadCapacity) filter.loadCapacity.$lte = Number(maxLoadCapacity);
  }

  // Features filter (carrier must have all specified features)
  if (features) {
    const featureArray = Array.isArray(features) ? features : features.split(",");
    filter.features = { $all: featureArray };
  }

  // Operating corridor filters
  if (startLocation) {
    filter["operatingCorrider.startLocation"] = { $regex: startLocation, $options: "i" };
  }
  if (destinationLocation) {
    filter["operatingCorrider.destinationLocation"] = { $regex: destinationLocation, $options: "i" };
  }

  // Region/City filter (searches in both start and destination)
  if (region || city) {
    const locationSearch = region || city;
    filter.$or = [
      { "operatingCorrider.startLocation": { $regex: locationSearch, $options: "i" } },
      { "operatingCorrider.destinationLocation": { $regex: locationSearch, $options: "i" } },
    ];
  }

  // Availability filter
  if (isAvailable !== undefined) {
    filter.isAvailable = isAvailable === "true";
  }

  // Verification filter
  if (isVerified !== undefined) {
    filter.isVerified = isVerified === "true";
  }

  // Search filter (searches in model, brand, and aboutTruck)
  if (search) {
    filter.$or = [
      { model: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
      { aboutTruck: { $regex: search, $options: "i" } },
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Execute query with population
  const carriers = await Carrier.find(filter)
    .populate("company", "legalEntityName email phone")
    .populate("truckOwner", "firstName lastName phone ratingAverage ratingQuantity")
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Get total count for pagination
  const total = await Carrier.countDocuments(filter);

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all carriers",
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: {
      carriers,
    },
  });
});

// ------------------- CREATE carrier --------------------//
exports.createCarrier = catchAsync(async (req, res, next) => {
  if (!req.body.truckOwner)
    req.body.truckOwner = req.user.id || req.params.userId;
  console.log(req.params.userId);
  const newCarrier = await Carrier.create({
    ...req.body,
    truckOwner: req.body.truckOwner,
  });

  res.status(201).json({
    statusCode: 201,
    message: "Successfully created carrier",
    data: {
      carrier: newCarrier,
    },
  });
});

// -------------------- GET carrier ----------------------//
exports.getCarrier = catchAsync(async (req, res) => {
  const carrier = await Carrier.findById(req.params.id).populate(
    "truckOwner",
    "firstName lastName phone ratingQuantity ratingAverage",
  );
  res.status(200).json({
    statusCode: 200,
    message: "Carrier successfully retrieved",
    data: {
      carrier,
    },
  });
});

// --------------- GET Featured carrier ------------------//
exports.getFeatured = catchAsync(async (req, res) => {
  const featuredCarrier = await Carrier.find({ isFeatured: true });

  res.status(200).json({
    statusCode: 200,
    message: "Featured carriers successfully retrieved",
    results: featuredCarrier.length,
    data: {
      featuredCarrier,
    },
  });
});

// --------------- GET carrier by USER_ID ----------------//
exports.getMyCarriers = catchAsync(async (req, res) => {
  console.log("get my carrier called");
  console.log(req.user.id);
  const carriers = await Carrier.find({ truckOwner: req.user.id });

  res.status(200).json({
    statusCode: 200,
    message: "Carriers succesfully fetched",
    results: carriers.length,
    data: {
      carriers,
    },
  });
});
// --------------------- UPDATE carrier ------------------//
exports.updateCarrier = catchAsync(async (req, res, next) => {
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
  const carrier = await Carrier.findById(req.params.id);

  // check existence
  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  // Ownership check
  if (carrier.truckOwner.toString() !== req.user.id) {
    return next(
      new AppError("You are not allowed to update this carrier", 403),
    );
  }

  Object.assign(carrier, filteredBody);
  await carrier.save();

  res.status(200).json({
    statusCode: 200,
    message: "Carrier successfully updated",
    data: {
      carrier,
    },
  });
});

// --------------------- DELETE carrier ------------------//
exports.deleteCarrier = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Validate Mongo ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid carrier id", 400));
  }

  // 2️⃣ Find carrier
  const carrier = await Carrier.findById(id);

  if (!carrier) {
    return next(new AppError("Carrier not found", 404));
  }

  // 4️⃣ Business rule → prevent deletion if assigned
  if (!carrier.isAvailable) {
    return next(
      new AppError("Carrier is currently assigned to a booking", 400),
    );
  }

  await Carrier.findByIdAndDelete(id);

  // 6️⃣ Proper response
  res.status(204).json({
    statusCode: 200,
    message: "Carrier successfully deleted",
  });
});

// --------------- make favourite carrier ----------------//
exports.makeFavourite = catchAsync(async (req, res, next) => {
  if (!req.body.id) req.body.id = req.params.id;

  const carrierFavourite = await Carrier.findByIdAndUpdate(
    req.body.id,
    { isFavourite: true },
    { new: true, runValidators: true },
  );

  if (!carrierFavourite) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Carrier marked as favourite",
    data: {
      carrier: carrierFavourite,
    },
  });
});

// --------------- disable Favourite carrier -------------//
exports.disableFavourite = catchAsync(async (req, res, next) => {
  if (!req.body.id) req.body.id = req.params.id;

  const carrierFavourite = await Carrier.findByIdAndUpdate(
    req.body.id,
    { isFavourite: false },
    { new: true, runValidators: true },
  );

  if (!carrierFavourite) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Carrier removed from favourite",
    data: {
      carrier: carrierFavourite,
    },
  });
});

// ---------------------- verify carrier -----------------//
exports.verifyCarrier = catchAsync(async (req, res, next) => {
  if (!req.body.id) req.body.id = req.params.id;

  console.log(req.body.id);

  const carrier = await Carrier.findByIdAndUpdate(
    req.body.id,
    { isVerified: true },
    { new: true, runValidators: true },
  );

  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Carrier successfully verified",
    data: {
      carrier,
    },
  });
});

// -------------------- unverify carrier -----------------//
exports.unverifyCarrier = catchAsync(async (req, res, next) => {
  if (!req.body.id) req.body.id = req.params.id;

  const carrier = await Carrier.findByIdAndUpdate(
    req.body.id,
    { isVerified: false },
    { new: true, runValidators: true },
  );

  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "Carrier successfully unverified",
    data: {
      carrier,
    },
  });
});

exports.assignCarrierToCompany = catchAsync(async (req, res, next) => {
  const carrierId = req.params.carrierId || req.params.id || req.body.carrierId;
  const companyId = req.params.companyId || req.body.companyId;

  if (!carrierId) {
    return next(new AppError("Carrier id is required", 400));
  }

  if (!companyId) {
    return next(new AppError("Company id is required", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(carrierId)) {
    return next(new AppError("Invalid carrier id", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return next(new AppError("Invalid company id", 400));
  }

  const [carrier, companyExists] = await Promise.all([
    Carrier.findById(carrierId).select("_id company").lean(),
    Company.exists({ _id: companyId }),
  ]);

  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  if (!companyExists) {
    return next(new AppError("No company is found with that id", 404));
  }

  const updates = [
    Company.updateOne(
      { _id: companyId, carrier: { $ne: carrierId } },
      {
        $addToSet: { carrier: carrierId },
        $inc: { fleetSize: 1 },
      },
    ),
    Carrier.findByIdAndUpdate(
      carrierId,
      { company: companyId },
      { new: true, runValidators: true },
    ),
  ];

  if (carrier.company && carrier.company.toString() !== companyId) {
    updates.push(
      Company.updateOne(
        { _id: carrier.company, carrier: carrierId },
        { $pull: { carrier: carrierId }, $inc: { fleetSize: -1 } },
      ),
    );
  }

  const [, updatedCarrier] = await Promise.all(updates);
  const updatedCompany = await Company.findById(companyId);

  res.status(200).json({
    statusCode: 200,
    message: "Carrier assigned to company successfully",
    data: {
      company: updatedCompany,
      carrier: updatedCarrier,
    },
  });
});

exports.assignDriverToCarrier = catchAsync(async (req, res, next) => {
  const carrierId = req.params.carrierId || req.params.id || req.body.carrierId;
  const driverId = req.params.driverId || req.body.driverId;

  if (!carrierId) {
    return next(new AppError("Carrier id is required", 400));
  }

  if (!driverId) {
    return next(new AppError("Driver id is required", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(carrierId)) {
    return next(new AppError("Invalid carrier id", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(driverId)) {
    return next(new AppError("Invalid driver id", 400));
  }

  // Check if carrier exists
  const carrier = await Carrier.findById(carrierId);
  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  // Check if driver exists and is actually a driver
  const driver = await User.findOne({
    _id: driverId,
    role: "driver"
  });

  if (!driver) {
    return next(new AppError("No driver is found with that id", 404));
  }

  // Check if driver is already assigned to this carrier
  if (carrier.driver.includes(driverId)) {
    return next(new AppError("Driver is already assigned to this carrier", 400));
  }

  // Add driver to carrier's driver array
  carrier.driver.push(driverId);
  await carrier.save();

  // Populate the updated carrier with driver details
  const updatedCarrier = await Carrier.findById(carrierId)
    .populate("driver", "firstName lastName phone email licenseNumber licenseExpiry")
    .populate("truckOwner", "firstName lastName phone");

  res.status(200).json({
    statusCode: 200,
    message: "Driver assigned to carrier successfully",
    data: {
      carrier: updatedCarrier,
    },
  });
});

exports.removeDriverFromCarrier = catchAsync(async (req, res, next) => {
  const carrierId = req.params.carrierId || req.params.id || req.body.carrierId;
  const driverId = req.params.driverId || req.body.driverId;

  if (!carrierId) {
    return next(new AppError("Carrier id is required", 400));
  }

  if (!driverId) {
    return next(new AppError("Driver id is required", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(carrierId)) {
    return next(new AppError("Invalid carrier id", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(driverId)) {
    return next(new AppError("Invalid driver id", 400));
  }

  // Check if carrier exists
  const carrier = await Carrier.findById(carrierId);
  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  // Check if driver is assigned to this carrier
  if (!carrier.driver.includes(driverId)) {
    return next(new AppError("Driver is not assigned to this carrier", 400));
  }

  // Remove driver from carrier's driver array
  carrier.driver = carrier.driver.filter(id => id.toString() !== driverId);
  await carrier.save();

  // Populate the updated carrier with driver details
  const updatedCarrier = await Carrier.findById(carrierId)
    .populate("driver", "firstName lastName phone email licenseNumber licenseExpiry")
    .populate("truckOwner", "firstName lastName phone");

  res.status(200).json({
    statusCode: 200,
    message: "Driver removed from carrier successfully",
    data: {
      carrier: updatedCarrier,
    },
  });
});
