const User = require("./../model/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const mongoose = require("mongoose");

// -------------------- GET ALL USERS --------------------//
exports.getAllUsers = catchAsync(async (req, res) => {
  const filter = {};
  
  // Support role filtering via query parameter
  if (req.query.role) {
    filter.role = req.query.role;
  }

  const features = new APIFeatures(User.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const users = await features.query.select('-password -passwordResetToken -passwordResetExpires');

  res.status(200).json({
    statusCode: 200,
    message: "Successfully retrieved all users",
    results: users.length,
    total: users.length,
    data: users,
  });
});

// -------------------- CREATE USER ----------------------//
exports.createUser = catchAsync(async (req, res) => {
  res.status(500).json({
    statusCode: 500,
    message: "This route is not defined. Please use /signup instead",
  });
});

// -------------------- GET USER -------------------------//
exports.getUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid user id", 400));
  }

  const user = await User.findById(id).select('-password -passwordResetToken -passwordResetExpires');

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    statusCode: 200,
    message: "User successfully retrieved",
    data: user,
  });
});

// -------------------- UPDATE USER ----------------------//
exports.updateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid user id", 400));
  }

  // Don't allow password updates through this route
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("This route is not for password updates. Please use /updatePassword", 400));
  }

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  }).select('-password -passwordResetToken -passwordResetExpires');

  res.status(200).json({
    statusCode: 200,
    message: "User successfully updated",
    data: updatedUser,
  });
});

// -------------------- DELETE USER ----------------------//
exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError("Invalid user id", 400));
  }

  const user = await User.findById(id);

  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Prevent deleting admin users (optional safety check)
  if (user.role === 'admin' && req.user.id !== id) {
    return next(new AppError("You cannot delete other admin users", 403));
  }

  await User.findByIdAndDelete(id);

  res.status(204).json({
    statusCode: 204,
    message: "User successfully deleted",
    data: null,
  });
});
