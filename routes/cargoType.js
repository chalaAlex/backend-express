const express = require("express");
const authController = require("../controller/authController");
const cargoTypeController = require("../controller/cargoTypeController");

const route = express.Router();

route
  .route("/")
  .get(authController.protect, cargoTypeController.getAllCargoType)
  .post(authController.protect, cargoTypeController.createCargoType);

route
  .route("/:id")
  .get(authController.protect, cargoTypeController.getCargoType)
  .delete(authController.protect, cargoTypeController.deleteCargoType);

module.exports = route;
