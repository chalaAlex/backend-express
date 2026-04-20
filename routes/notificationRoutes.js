const express = require("express");
const authController = require("../controller/authController");
const notificationController = require("../controller/notificationController");

const router = express.Router();

router.get("/", authController.protect, notificationController.getMyNotifications);
router.patch("/:id/read", authController.protect, notificationController.markAsRead);

module.exports = router;
