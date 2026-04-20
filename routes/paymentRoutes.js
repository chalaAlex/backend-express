const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const paymentController = require('../controller/paymentController');

// Webhook — no auth (called by Telebirr)
router.post('/webhook', paymentController.handleWebhook);

// Dev-only mock webhook trigger — simulates Telebirr callback
if (process.env.TELEBIRR_MOCK === 'true') {
  const crypto = require('crypto');
  const Payment = require('../model/paymentModel');
  const telebirrService = require('../services/telebirrService');

  router.post('/mock-confirm/:outTradeNo', async (req, res) => {
    const payment = await Payment.findOne({ outTradeNo: req.params.outTradeNo });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    const body = {
      outTradeNo: payment.outTradeNo,
      transactionId: `MOCK-TX-${Date.now()}`,
      status: 'SUCCESS',
    };
    const signature = crypto
      .createHmac('sha256', process.env.TELEBIRR_APP_KEY || 'dev-secret-key')
      .update(Object.keys(body).sort().map(k => `${k}=${body[k]}`).join('&'))
      .digest('hex');

    // Self-call the webhook handler
    req.body = body;
    req.headers['x-telebirr-signature'] = signature;
    return paymentController.handleWebhook(req, res);
  });
}

// Authenticated routes
router.use(authController.protect);

router.post('/initiate', authController.restrictTo('freight_owner'), paymentController.initiatePayment);
router.post('/:id/release', authController.restrictTo('freight_owner'), paymentController.releasePayment);
router.post('/:id/dispute', authController.restrictTo('freight_owner'), paymentController.disputePayment);
router.get('/:requestId', authController.restrictTo('freight_owner', 'carrier_owner'), paymentController.getPaymentStatus);

module.exports = router;
