const express = require("express");
const carrierTypeController = require("../controller/carrierTypeController");
const authController = require("../controller/authController");

const router = express.Router();

router
  .route("/")
  .get(authController.protect, carrierTypeController.getAllCarrierTypes)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    carrierTypeController.createCarrierType
  );

router
  .route("/:id")
  .get(authController.protect, carrierTypeController.getCarrierType)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    carrierTypeController.updateCarrierType
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    carrierTypeController.deleteCarrierType
  );

module.exports = router;
