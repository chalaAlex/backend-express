const Carrier = require("./../model/carrierModel");
const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const filterObj = require("../utils/filterObj");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

// -------------------- GET ALL TRUCKS --------------------//
exports.getAllTrucks = catchAsync(async (req, res) => {
  const feature = new APIFeatures(Carrier.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const carrier = await feature.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrived all trucks",
    total: carrier.length,
    data: {
      trucks: carrier,
    },
  });
});

// ------------------- CREATE carrier ---------------------//
exports.createCarrier = catchAsync(async (req, res, next) => {
  if (!req.body.truckOwner)
    req.body.truckOwner = req.user.id || req.params.userId;
  console.log(req.params.userId);
  const newTruck = await Carrier.create({
    ...req.body,
    truckOwner: req.body.truckOwner,
  });

  res.status(201).json({
    statusCode: 201,
    message: "Successfully created carrier",
    data: {
      carrier: newTruck,
    },
  });
});

// -------------------- GET carrier ----------------------//
exports.getTruck = catchAsync(async (req, res) => {
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
    status: "success",
    results: featuredCarrier.length,
    data: {
      featuredCarrier,
    },
  });
});

// --------------- GET carrier by USER_ID ----------------//
exports.getMyTrucks = catchAsync(async (req, res) => {
  console.log("get my carrier called");
  console.log(req.user.id);
  const trucks = await Carrier.find({ truckOwner: req.user.id });

  res.status(200).json({
    status: "success",
    results: trucks.length,
    data: {
      trucks,
    },
  });
});
// --------------------- UPDATE carrier ------------------//
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
  const carrier = await Carrier.findById(req.params.id);

  // check existence
  if (!carrier) {
    return next(new AppError("No carrier is found with that id", 404));
  }

  // Ownership check
  if (carrier.truckOwner.toString() !== req.user.id) {
    return next(
      new AppError("You are not allowed to delete this carrier", 403),
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
exports.deleteTruck = catchAsync(async (req, res, next) => {
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

// --------------- verify carrier -------------//
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

// --------------- unverify carrier -------------//
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
