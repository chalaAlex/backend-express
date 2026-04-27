const express = require('express');
const { protect } = require('../controller/authController');
const { improveFreightDescription, improveCarrierDescription } = require('../controller/aiController');

const router = express.Router();

router.use(protect);

router.post('/improve-freight-description', improveFreightDescription);
router.post('/improve-carrier-description', improveCarrierDescription);

module.exports = router;
