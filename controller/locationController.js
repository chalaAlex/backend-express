const Region = require("./../model/regionModel");
const City = require("./../model/cityModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");

// Returns all active regions with their city names embedded —
// matches the { region: String, city: Array } shape the Flutter app expects.
exports.getAllLocation = catchAsync(async (req, res) => {
  const regions = await Region.find({ isActive: true }).sort("name").lean();

  const regionIds = regions.map((r) => r._id);
  const cities = await City.find({
    region: { $in: regionIds },
    isActive: true,
  })
    .select("name region")
    .lean();

  // Group city names by region id
  const cityMap = {};
  for (const city of cities) {
    const key = city.region.toString();
    if (!cityMap[key]) cityMap[key] = [];
    cityMap[key].push(city.name);
  }

  const data = regions.map((r) => ({
    _id: r._id,
    region: r.name,
    city: cityMap[r._id.toString()] ?? [],
  }));

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all locations",
    total: data.length,
    data,
  });
});

exports.createLocation = catchAsync(async (req, res) => {
  // Legacy — kept for backward compatibility
  const Location = require("./../model/locationModel");
  const newLocation = await Location.create(req.body);
  res.status(201).json({
    statusCode: 201,
    message: "Successfully created location",
    data: { location: newLocation },
  });
});
