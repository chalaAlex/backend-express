const User = require("./../model/userModel");
const catchAsync = require("../utils/catchAsync");

exports.getAllUsers = catchAsync(async (req, res) => {
  const tours = await User.find();

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all users",
    total: tours.length,
    data: tours,
  });
});

exports.createUser = catchAsync(async (req, res) => {
  res.status(500).json({
    statusCode: 500,
    message: "The route is not implemented yet!",
  });
});

exports.getUser = (req, res) => {
  res.status(500).json({
    statusCode: 500,
    message: "The route is not implemented yet!",
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    statusCode: 500,
    message: "The route is not implemented yet!",
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    statusCode: 500,
    message: "The route is not implemented yet!",
  });
};
