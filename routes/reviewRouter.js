const express = require("express");
const route = express.Router();
const authController = require("../controller/authController");
const reviewController = require("../controller/reviewController");

route
  .route("/")
  .get(authController.protect, reviewController.getAllReiview)
  .post(authController.protect, reviewController.createReview);

route
  .route("/:id")
  .get(authController.protect, reviewController.getReview)
  .patch(authController.protect, reviewController.updateReview)
  .delete(authController.protect, reviewController.deleteReview);

module.exports = route;
