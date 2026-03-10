const express = require("express");
const carrierController = require("../controller/carrierController");
const authController = require("../controller/authController");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(authController.protect, carrierController.getAllCarriers)
  .post(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    carrierController.createCarrier,
  );

router
  .route("/getFeaturedCarier")
  .get(authController.protect, carrierController.getFeatured);

router.get("/my-trucks", authController.protect, carrierController.getMyCarriers);

router
  .route("/:companyId/assign-carrier/:carrierId")
  .patch(
    authController.protect,
    authController.restrictTo("admin, carrier_owner"),
    carrierController.assignCarrierToCompany,
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

module.exports = router;
