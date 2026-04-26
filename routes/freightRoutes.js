const express = require("express");
const freightController = require("../controller/freightController");
const authController = require("../controller/authController");
const bidController = require("../controller/bidsController");
const bidRouter = require("./bidsRouter");

const router = express.Router();

// ── Static routes first (before any param routes) ──────
router
  .route("/my-freights")
  .get(authController.protect, freightController.getMyFreights);

router
  .route("/")
  .get(authController.protect, freightController.getAllFreights)
  .post(
    authController.protect,
    authController.restrictTo("freight_owner", "admin"),
    freightController.createFreight
  );

// ── Feature / unfeature (before /:id to avoid conflict) ─
router
  .route("/:id/feature")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    freightController.featureFreight,
  );

router
  .route("/:id/unfeature")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    freightController.unfeatureFreight,
  );

// ── Generic param route ────────────────────────────────
router
  .route("/:id")
  .get(authController.protect, freightController.getFreight)
  .patch(authController.protect, freightController.updateFreight)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    freightController.deleteFreight,
  );

// ── Bids sub-router (after param routes) ──────────────
router.use("/:freightId/bids", bidRouter);

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
