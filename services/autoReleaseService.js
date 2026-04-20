const cron = require('node-cron');
const Payment = require('../model/paymentModel');
const { releasePayment } = require('./releasePaymentService');

/**
 * Start the hourly auto-release cron job.
 * Queries all HELD payments whose releaseAt <= now and releases each one.
 * DISPUTED payments are excluded because their status is not HELD.
 */
function startAutoRelease() {
  // Run at the top of every hour: '0 * * * *'
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    console.log(`[autoRelease] Running at ${now.toISOString()}`);

    try {
      const eligiblePayments = await Payment.find({
        status: 'HELD',
        releaseAt: { $lte: now },
      });

      for (const payment of eligiblePayments) {
        try {
          await releasePayment(payment._id);
          console.log(`[autoRelease] Released payment ${payment._id}`);
        } catch (err) {
          console.error(`[autoRelease] Failed to release payment ${payment._id}: ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`[autoRelease] Query error: ${err.message}`);
    }
  });

  console.log('[autoRelease] Cron job scheduled (0 * * * *)');
}

module.exports = { startAutoRelease };