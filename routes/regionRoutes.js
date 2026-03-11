const express = require("express");
const regionController = require("../controller/regionController");
const authController = require("../controller/authController");

const router = express.Router();

router
  .route("/")
  .get(authController.protect, regionController.getAllRegions)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    regionController.createRegion
  );

router
  .route("/:id")
  .get(authController.protect, regionController.getRegion)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    regionController.updateRegion
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    regionController.deleteRegion
  );

module.exports = router;
