const User = require("./../model/userModel");
const catchAsync = require("../utils/catchAsync");

exports.getAllUsers = catchAsync(async (req, res) => {
  const tours = await User.find();

  res.status(200).json({
    status: "200",
    total: tours.length,
    mesage: "Successfully retrived",
    data: tours,
  });
});

exports.createUser = catchAsync(async (req, res) => {
  res.status(500).json({
    status: "200",
    message: "The route is not implemented yet!",
  });
});

exports.getUser = (req, res) => {
  res.status(500).json({
    status: "200",
    message: "The route is not implemented yet!",
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: "200",
    message: "The route is not implemented yet!",
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: "200",
    message: "The route is not implemented yet!",
  });
};
