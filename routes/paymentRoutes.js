const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const paymentController = require('../controller/paymentController');

// Public confirm endpoint — called from the mock checkout screen (no external webhook needed)
router.post('/confirm', paymentController.confirmPayment);

// Authenticated routes
router.use(authController.protect);

router.post('/initiate', authController.restrictTo('freight_owner'), paymentController.initiatePayment);
router.get('/my-payments', authController.restrictTo('freight_owner', 'carrier_owner'), paymentController.getMyPayments);
router.get('/by-freight/:freightId', authController.restrictTo('freight_owner'), paymentController.getPaymentByFreight);
router.post('/:id/release', authController.restrictTo('freight_owner'), paymentController.releasePayment);
router.post('/:id/dispute', authController.restrictTo('freight_owner'), paymentController.disputePayment);
router.get('/:requestId', authController.restrictTo('freight_owner', 'carrier_owner'), paymentController.getPaymentStatus);

module.exports = router;
