const express = require("express");
const driverController = require("../controller/driverController");
const authController = require("../controller/authController");

const router = express.Router({ mergeParams: true });

router.route("/").get(authController.protect, driverController.getAllDriver);

module.exports = router;
