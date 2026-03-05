const express = require("express");
const requestController = require("../controller/requestController");
const authController = require("../controller/authController");
const router = express.Router();

// Create requests (freight owners only)
router.post(
  "/",
  authController.protect,
  authController.restrictTo("freight owner"),
  requestController.createRequests,
);

// Get sent requests (freight owners)
router.get(
  "/sent",
  authController.protect,
  authController.restrictTo("freight owner"),
  requestController.getSentRequests,
);

// Get received requests (carrier owners)
router.get(
  "/received",
  authController.protect,
  authController.restrictTo("carrier_owner"),
  requestController.getReceivedRequests,
);

// Cancel request (freight owner who created it)
router.delete(
  "/:id",
  authController.protect,
  authController.restrictTo("freight owner"),
  requestController.cancelRequest,
);

// Accept request (carrier owner who received it)
router.post(
  "/:id/accept",
  authController.protect,
  authController.restrictTo("carrier_owner"),
  requestController.acceptRequest,
);

// Reject request (carrier owner who received it)
router.post(
  "/:id/reject",
  authController.protect,
  authController.restrictTo("carrier_owner"),
  requestController.rejectRequest,
);

module.exports = router;
