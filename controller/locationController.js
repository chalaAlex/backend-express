const Location = require("./../model/locationModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

exports.getAllLocation = catchAsync(async (req, res) => {
  const feature = new APIFeatures(Location.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate(); // Method Chaining

  const location = await feature.query;

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrived all location",
    total: location.length,
    data: location,
  });
});

exports.createLocation = catchAsync(async (req, res) => {
  console.log(req.body);
  const newLocation = await Location.create(req.body);
  console.log(newLocation);
  res.status(201).json({
    statusCode: 201,
    message: "Successfully created location",
    data: {
      location: newLocation,
    },
  });
});
