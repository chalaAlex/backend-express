const express = require("express");
const cityController = require("../controller/cityController");
const authController = require("../controller/authController");

const router = express.Router();

router
  .route("/")
  .get(authController.protect, cityController.getAllCities)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    cityController.createCity
  );

router
  .route("/region/:regionId")
  .get(authController.protect, cityController.getCitiesByRegion);

router
  .route("/:id")
  .get(authController.protect, cityController.getCity)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    cityController.updateCity
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    cityController.deleteCity
  );

module.exports = router;
