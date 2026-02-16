const express = require("express");
const route = express.Router();
const authController = require("../controller/authController");
const reviewController = require("../controller/reviewController");

route
  .route("/")
  .get(authController.protect, reviewController.getAllReiview)
  .post(authController.protect, reviewController.createReview);

// route
//   .route("/:id")
//   .get(authController.protect, freightController.getFreight)
//   .patch(authController.protect, freightController.updateFreight)
//   .delete(authController.protect, authController.restrictTo("admin"), freightController.deleteFreight);

module.exports = route;
