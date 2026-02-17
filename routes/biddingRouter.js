const express = require("express");
const biddingController = require("../controller/biddingController");
const route = express.Router();
const authController = require("../controller/authController");

route
  .route("/")
  .get(authController.protect, biddingController.getAllBids)
  .post(authController.protect, biddingController.createBidding);

route
  .route("/:id")
  .get(authController.protect, biddingController.getBidding)
  .patch(authController.protect, biddingController.updateBidding)
  .delete(authController.protect, biddingController.deleteBidding);

module.exports = route;
