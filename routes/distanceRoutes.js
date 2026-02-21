const express = require("express");
const { calculateDistance } = require("../controller/distanceController");
const router = express.Router();

router.get("/distance", calculateDistance);

module.exports = router;
