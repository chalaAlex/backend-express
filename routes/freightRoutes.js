const express = require("express");
const freightController = require("../controller/freightController");
const route = express.Router();

route
  .route("/")
  .get(freightController.getAllFreights)
  .post(freightController.createFreight);
// route
//   .route("/:id")
//   .get(freightController.getTour)
//   .patch(freightController.updateTour)
//   .delete(freightController.deleteTour);

module.exports = route;
