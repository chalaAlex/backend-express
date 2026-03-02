const express = require("express");
const truckController = require("../controller/truckController");
const authController = require("../controller/authController");
const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(authController.protect, truckController.getAllTrucks)
  .post(
    authController.protect,
    authController.restrictTo("carrier_owner"),
    truckController.createTruck,
  );

router.get("/my-trucks", authController.protect, truckController.getMyTrucks);

router
  .route("/:id")
  .get(authController.protect, truckController.getTruck)
  .patch(authController.protect, truckController.updateTruck)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    truckController.deleteTruck,
  );

module.exports = router;
