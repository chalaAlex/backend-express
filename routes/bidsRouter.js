const express = require("express");
const authController = require("../controller/authController");
const router = express.Router( { mergeParams: true } );
const biddingController = require("../controller/bidsController");

router.get(
  '/my-bids',
  authController.protect,
  authController.restrictTo('carrier_owner'),
  biddingController.getMyBids,
);

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

router.patch(
  "/:id/accept",
  authController.protect,
  authController.restrictTo("freight_owner"),
  biddingController.acceptBid,
);

router.patch(
  "/:id/reject",
  authController.protect,
  authController.restrictTo("freight_owner"),
  biddingController.rejectBid,
);

module.exports = router;