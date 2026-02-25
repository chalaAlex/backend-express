const express = require("express");
const locationController = require("../controller/locationController");
const route = express.Router();

route
  .route("/")
  .get(locationController.getAllLocation)
  .post(locationController.createLocation);

module.exports = route;