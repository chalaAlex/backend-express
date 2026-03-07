const Driver = require("../model/driverModel");
const Carrier = require("../model/carrierModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

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

exports.getAllDriver = catchAsync(async (req, res) => {
  const drivers = await Driver.find();

  console.log(drivers);

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all drivers",
    total: drivers.length,
    data: {
      drivers,
    },
  });
});
