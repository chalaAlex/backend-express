const express = require("express");
const brandController = require("../controller/brandController");
const authController = require("../controller/authController");

const router = express.Router();

router
  .route("/")
  .get(authController.protect, brandController.getAllBrands)
  .post(
    authController.protect,
    authController.restrictTo("admin"),
    brandController.createBrand
  );

router
  .route("/:id")
  .get(authController.protect, brandController.getBrand)
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    brandController.updateBrand
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin"),
    brandController.deleteBrand
  );

module.exports = router;
