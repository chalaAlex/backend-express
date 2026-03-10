const express = require("express");
const authController = require("../controller/authController");
const router = express.Router({ mergeParams: true });
const companyController = require("../controller/companyController");
const carrierController = require("../controller/carrierController");

router
  .route("/getRecommendedCompanies")
  .get(authController.protect, companyController.getRecommendedCompanies);

router
  .route("/getFeaturedCompany")
  .get(authController.protect, companyController.getFeaturedCompany);

router
  .route("/getTopRatedCompanies")
  .get(authController.protect, companyController.getTopRatedCompanies);

router
  .route("/:companyId/assign-carrier/:carrierId")
  .patch(
    authController.protect,
    authController.restrictTo("admin"),
    carrierController.assignCarrierToCompany,
  );

router.route("/")
  .get(authController.protect, companyController.getAllCompany)
  .post(authController.protect, companyController.registerCompany);

router.route("/:id")
  .get(authController.protect, companyController.getCompany)
  .patch(authController.protect, companyController.updateCompany)
  .delete(authController.protect, companyController.deleteCompany);

router.route("/:id/carriers")
  .get(authController.protect, companyController.getCompanyCarriers);

module.exports = router;