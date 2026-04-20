const Notification = require("../model/notificationModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

// --------------------------- GET MY NOTIFICATIONS -----------------------//
exports.getMyNotifications = catchAsync(async (req, res) => {
  const notifications = await Notification.find({ recipientId: req.user.id })
    .sort({ createdAt: -1 });

  res.status(200).json({
    statusCode: 200,
    message: "Notifications retrieved successfully",
    total: notifications.length,
    data: { notifications },
  });
});

// --------------------------- MARK AS READ -----------------------//
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new AppError("No notification found with that id", 404));
  }

  if (notification.recipientId.toString() !== req.user.id.toString()) {
    return next(new AppError("You are not allowed to update this notification", 403));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    statusCode: 200,
    message: "Notification marked as read",
    data: { notification },
  });
});

// --------------------------- CREATE NOTIFICATION (internal helper) -----------------------//
exports.createNotification = async (recipientId, type, referenceId, title, body, io) => {
  try {
    const notification = await Notification.create({
      recipientId,
      type,
      referenceId,
      title,
      body,
    });

    if (io) {
      io.to(`user:${recipientId}`).emit("new_notification", notification.toObject());
    }
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
};
