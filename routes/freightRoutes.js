const express = require("express");
const freightController = require("../controller/freightController");
const authController = require("../controller/authController");
const bidController = require("../controller/bidsController");
const bidRouter = require("./bidsRouter");

const router = express.Router();

router.use("/:freightId/bids", bidRouter);

router
  .route("/")
  .get(authController.protect, freightController.getAllFreights)
  .post(authController.protect, authController.restrictTo("user"), freightController.createFreight);

router
  .route("/:id")
  .get(authController.protect, freightController.getFreight)
  .patch(authController.protect, freightController.updateFreight)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    freightController.deleteFreight,
  );

router
  .route("/:freightId/bids")
  .get(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    bidController.getAllBid,
  )
  .post(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    bidController.createBid,
  );

module.exports = router;
