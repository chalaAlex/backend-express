const express = require("express");
const route = express.Router();
const authController = require("../controller/authController");
const reviewController = require("../controller/reviewController");

// GET reviews for a target (query: targetId, targetType) | POST create review
route
  .route("/")
  .get(authController.protect, reviewController.getReviewsForTarget)
  .post(
    authController.protect,
    authController.restrictTo("freight_owner"),
    reviewController.createReview,
  );

// GET single review | DELETE review (admin)
route
  .route("/:id")
  .get(authController.protect, reviewController.getReview)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    reviewController.deleteReview,
  );

module.exports = route;
