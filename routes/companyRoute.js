const express = require("express");
const authController = require("../controller/authController");
const router = express.Router({ mergeParams: true });
const companyController = require("../controller/companyController");

router
  .route("/getRecommendedCompanies")
  .get(authController.protect, companyController.getRecommendedCompanies);

router
  .route("/getFeaturedCompany")
  .get(authController.protect, companyController.getFeaturedCompany);

router.route("/")
  .get(authController.protect, companyController.getAllCompany)
  .post(authController.protect, companyController.registerCompany);

router.route("/:id")
  .get(authController.protect, companyController.getCompany)
  .patch(authController.protect, companyController.updateCompany)
  .delete(authController.protect, companyController.deleteCompany);

module.exports = router;