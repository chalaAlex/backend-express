const express = require("express");
const freightController = require("../controller/freightController");
const route = express.Router();
const authController = require("../controller/authController");

route
  .route("/")
  .get(authController.protect, freightController.getAllFreights)
  .post(freightController.createFreight);
// route
//   .route("/:id")
//   .get(freightController.getTour)
//   .patch(freightController.updateTour)
//   .delete(freightController.deleteTour);

module.exports = route;
