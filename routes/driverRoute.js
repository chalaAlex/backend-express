const express = require("express");
const driverController = require("../controller/driverController");
const authController = require("../controller/authController");

const router = express.Router({ mergeParams: true });

// Routes that don't require ID parameter
router
  .route("/")
  .get(authController.protect, driverController.getAllDriver)
  .post(
    authController.protect,
    authController.restrictTo("admin", "carrier_owner"),
    driverController.createDriver
  );

// Route for carrier_owner to list their own drivers
router
  .route("/my-drivers")
  .get(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    driverController.getMyDrivers
  );

// Route for driver to get their assigned truck
router
  .route("/my-truck")
  .get(
    authController.protect,
    authController.restrictTo("driver"),
    driverController.getMyAssignedTruck
  );

// Routes that require ID parameter
router
  .route("/:id")
  .get(
    authController.protect,
    authController.restrictTo("admin", "carrier_owner"),
    driverController.getDriver
  )
  .patch(
    authController.protect,
    authController.restrictTo("admin", "carrier_owner"),
    driverController.updateDriver
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "carrier_owner"),
    driverController.deleteDriver
  );

module.exports = router;
