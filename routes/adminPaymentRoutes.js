const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const adminPaymentController = require('../controller/adminPaymentController');

router.use(authController.protect, authController.restrictTo('admin'));

router.get('/disputes', adminPaymentController.listDisputes);
router.patch('/disputes/:id/resolve', adminPaymentController.resolveDispute);
router.get('/withdrawals', adminPaymentController.listWithdrawals);
router.patch('/withdrawals/:id', adminPaymentController.processWithdrawal);

module.exports = router;
