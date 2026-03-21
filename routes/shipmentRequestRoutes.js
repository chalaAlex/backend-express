const express = require("express");
const requestController = require("../controller/shipmentRequestController");
const authController = require("../controller/authController");
const router = express.Router();

// Create shipment request (freight owners only)
router.post(
  "/",
  authController.protect,
  authController.restrictTo("user"),
  requestController.createRequests,
);

// Get sent shipment requests (freight owners)
router.get(
  "/sent",
  authController.protect,
  authController.restrictTo("freight owner"),
  requestController.getSentRequests,
);

// Get received shipment requests (carrier owners)
router.get(
  "/received",
  authController.protect,
  authController.restrictTo("carrier_owner"),
  requestController.getReceivedRequests,
);

// Cancel shipment request (freight owner who created it)
router.delete(
  "/:id",
  authController.protect,
  authController.restrictTo("freight owner"),
  requestController.cancelRequest,
);

// Accept shipment request (carrier owner who received it)
router.post(
  "/:id/accept",
  authController.protect,
  authController.restrictTo("carrier_owner"),
  requestController.acceptRequest,
);

// Reject shipment request (carrier owner who received it)
router.post(
  "/:id/reject",
  authController.protect,
  authController.restrictTo("carrier_owner"),
  requestController.rejectRequest,
);

module.exports = router;
