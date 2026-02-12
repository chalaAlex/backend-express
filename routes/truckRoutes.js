const express = require("express");
const router = express.Router();
const truckController = require("../controller/truckController");
const authController = require("../controller/authController");


// Get upload URL
// router.post(
//   "/upload-url",
//   authController.protect,
//   truckController.getTruckImageUploadUrl
// );

// Create truck
// router.post("/", authController.protect, truckController.createTruck);

// List trucks
router.get("/", truckController.getAllTrucks);
// authController.protect, 
module.exports = router;
