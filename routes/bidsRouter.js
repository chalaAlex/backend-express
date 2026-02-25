const express = require("express");
const biddingController = require("../controller/bidsController");
const authController = require("../controller/authController");
const router = express.Router( { mergeParams: true } );

router
  .route("/")
  .get(authController.protect, biddingController.getAllBid)
  .post(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    biddingController.createBid,
  );

router
  .route("/:id")
  .get(authController.protect, biddingController.getBid)
  .patch(authController.protect, biddingController.updateBid)
  .delete(authController.protect, biddingController.deleteBid);

module.exports = router;