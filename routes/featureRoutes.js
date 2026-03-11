const express = require("express");
const featureController = require("../controller/featureController");
const authController = require("../controller/authController");

const router = express.Router();

router
  .route("/")
  .get(authController.protect, featureController.getAllFeatures)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    featureController.createFeature
  );

router
  .route("/:id")
  .get(authController.protect, featureController.getFeature)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    featureController.updateFeature
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    featureController.deleteFeature
  );

module.exports = router;
