const express = require("express");
const freightController = require("../controller/freightController");
const route = express.Router();
const authController = require("../controller/authController");

route
  .route("/")
  .get(authController.protect, freightController.getAllFreights)
  .post(authController.protect, freightController.createFreight);

route
  .route("/:id")
  .get(authController.protect, freightController.getFreight)
  .patch(authController.protect, freightController.updateFreight)
  .delete(authController.protect, authController.restrictTo("admin"), freightController.deleteFreight);

module.exports = route;