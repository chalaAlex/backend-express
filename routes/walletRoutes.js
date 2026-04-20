const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const walletController = require('../controller/walletController');

router.use(authController.protect, authController.restrictTo('carrier_owner'));

router.get('/', walletController.getWallet);
router.get('/transactions', walletController.getTransactions);
router.post('/withdraw', walletController.requestWithdrawal);

module.exports = router;
