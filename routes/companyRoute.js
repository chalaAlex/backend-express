const express = require("express");
const authController = require("../controller/authController");
const router = express.Router({ mergeParams: true });
const companyController = require("../controller/companyController");

router
  .route("/getRecommendedCompanies")
  .get(authController.protect, companyController.getRecommendedCompanies);

module.exports = router;
