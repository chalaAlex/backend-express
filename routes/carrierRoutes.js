const express = require("express");
const carrierController = require("../controller/carrierController");
const authController = require("../controller/authController");
const router = express.Router({ mergeParams: true });

// ── Static routes FIRST (must be before /:id) ─────────
router.get("/my-carriers",      authController.protect, carrierController.getMyCarriers);
router.get("/getFeaturedCarier", authController.protect, carrierController.getFeatured);

router
  .route("/")
  .get(authController.protect, carrierController.getAllCarriers)
  .post(
    authController.protect,
    authController.restrictTo("carrier_owner", "admin"),
    carrierController.createCarrier,
  );

// ── Param routes ───────────────────────────────────────
router
  .route("/:id/makeFavourite")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    carrierController.makeFavourite,
  );

router
  .route("/:id/disableFavourite")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    carrierController.disableFavourite,
  );

router
  .route("/:id/verifyCarrier")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    carrierController.verifyCarrier,
  );

router
  .route("/:id/unverifyCarrier")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    carrierController.unverifyCarrier,
  );

router
  .route("/:companyId/assign-carrier/:carrierId")
  .patch(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    carrierController.assignCarrierToCompany,
  );

router
  .route("/:carrierId/assign-driver/:driverId")
  .patch(
    authController.protect,
    authController.restrictTo("admin", "carrier_owner"),
    carrierController.assignDriverToCarrier,
  );

router
  .route("/:carrierId/remove-driver/:driverId")
  .patch(
    authController.protect,
    authController.restrictTo("admin", "carrier_owner"),
    carrierController.removeDriverFromCarrier,
  );

router
  .route("/:id")
  .get(authController.protect, carrierController.getCarrier)
  .patch(authController.protect, carrierController.updateCarrier)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    carrierController.deleteCarrier,
  );

module.exports = router;