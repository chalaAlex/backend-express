const express = require("express");
const carrierController = require("../controller/carrierController");
const authController = require("../controller/authController");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  // .get(authController.protect, carrierController.getAllTrucks)
  .post(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    carrierController.createCarrier,
  );

router
  .route("/getFeaturedCarier")
  .get(authController.protect, carrierController.getFeatured);
router.get("/my-trucks", authController.protect, carrierController.getMyTrucks);

router
  .route("/:id")
  .get(authController.protect, carrierController.getTruck)
  .patch(authController.protect, carrierController.updateTruck)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    carrierController.deleteTruck,
  );

module.exports = router;
