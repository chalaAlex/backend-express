const express = require("express");
const truckController = require("../controller/truckController");
const route = express.Router();
const authController = require("../controller/authController");

route
  .route("/")
  .get(authController.protect, truckController.getAllTrucks)
  .post(authController.protect, truckController.createTruck);

route.get("/my-trucks", authController.protect, truckController.getMyTrucks);

route
  .route("/:id")
  .get(authController.protect, truckController.getTruck)
  .patch(authController.protect, truckController.updateTruck)
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    truckController.deleteTruck,
  );

module.exports = route;
