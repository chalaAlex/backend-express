const { sendEmail } = require("./email");
const User = require("../model/userModel");

/**
 * Registry of email templates keyed by event name.
 * Each entry is a function that receives the payload and returns { subject, message }.
 */
const TEMPLATES = {
  "carrier.created": ({ carrier }) => ({
    subject: "Carrier Registration Confirmation",
    message: `Your carrier with plate number ${carrier.plateNumber} (${carrier.model}) has been successfully registered. It is now pending admin verification.`,
  }),
  "carrier.verified": ({ carrier }) => ({
    subject: "Carrier Verified",
    message: `Your carrier with plate number ${carrier.plateNumber} (${carrier.model}) has been verified and approved. It is now available for use.`,
  }),
  "payment.confirmed": ({ payment, carrier, freight }) => ({
    subject: "Payment Received — Start Shipping",
    message:
      `Dear ${carrier?.firstName ?? 'Carrier'},\n\n` +
      `A payment of ETB ${payment.totalAmount?.toFixed(2)} has been confirmed for your shipment.\n\n` +
      `Route: ${freight?.route?.pickup?.city ?? '—'} → ${freight?.route?.dropoff?.city ?? '—'}\n` +
      `Pickup Date: ${freight?.schedule?.pickupDate ? new Date(freight.schedule.pickupDate).toDateString() : '—'}\n\n` +
      `Your earnings of ETB ${payment.carrierAmount?.toFixed(2)} are now held in escrow and will be ` +
      `released to your wallet after delivery is confirmed.\n\n` +
      `You are cleared to begin shipping. Please proceed to the pickup location.\n\n` +
      `Smart Truck Platform`,
  }),
  "bid.accepted": ({ bid, user }) => ({
    subject: "Bid Accepted — Prepare for Shipment",
    message:
      `Dear ${user?.firstName ?? 'Carrier'},\n\n` +
      `Congratulations! Your bid of ETB ${bid.bidAmount?.toFixed(2)} has been accepted.\n\n` +
      `Route: ${bid.freightId?.route?.pickup?.city ?? '—'} → ${bid.freightId?.route?.dropoff?.city ?? '—'}\n` +
      `Pickup Date: ${bid.freightId?.schedule?.pickupDate ? new Date(bid.freightId.schedule.pickupDate).toDateString() : '—'}\n\n` +
      `Next Steps:\n` +
      `- Wait for the freight owner to confirm payment\n` +
      `- Once payment is confirmed, you will be notified to begin shipping\n` +
      `- Proceed to the pickup location on the scheduled date\n\n` +
      `Smart Truck Platform`,
  }),
  "bid.rejected": ({ bid, user }) => ({
    subject: "Bid Not Accepted",
    message:
      `Dear ${user?.firstName ?? 'Carrier'},\n\n` +
      `Unfortunately, your bid of ETB ${bid.bidAmount?.toFixed(2)} was not accepted.\n\n` +
      `Freight Reference: ${bid.freightId?._id ?? '—'}\n` +
      `Route: ${bid.freightId?.route?.pickup?.city ?? '—'} → ${bid.freightId?.route?.dropoff?.city ?? '—'}\n\n` +
      `Thank you for your interest. We encourage you to bid on other available freight.\n\n` +
      `Smart Truck Platform`,
  }),
  "shipment_request.accepted": ({ request, user }) => ({
    subject: "Shipment Request Accepted",
    message:
      `Dear ${user?.firstName ?? 'Freight Owner'},\n\n` +
      `Great news! Your shipment request has been accepted.\n\n` +
      `Request Reference: ${request._id ?? '—'}\n` +
      `Carrier: ${request.carrierOwnerId?.firstName ?? '—'} ${request.carrierOwnerId?.lastName ?? ''}\n` +
      `Route: ${request.freightId?.route?.pickup?.city ?? '—'} → ${request.freightId?.route?.dropoff?.city ?? '—'}\n\n` +
      `Next Steps:\n` +
      `- Proceed to confirm payment to begin the shipment\n` +
      `- The carrier will be notified once payment is confirmed\n\n` +
      `Smart Truck Platform`,
  }),
  "shipment_request.rejected": ({ request, user }) => ({
    subject: "Shipment Request Declined",
    message:
      `Dear ${user?.firstName ?? 'Freight Owner'},\n\n` +
      `Unfortunately, your shipment request was not accepted by the carrier.\n\n` +
      `Request Reference: ${request._id ?? '—'}\n\n` +
      `We encourage you to send requests to other available carriers or post your freight for bidding.\n\n` +
      `Smart Truck Platform`,
  }),
  "payment.released": ({ payment, carrier, freight }) => ({
    subject: "Payment Released to Your Wallet",
    message:
      `Dear ${carrier?.firstName ?? 'Carrier'},\n\n` +
      `Great news! Your payment has been released from escrow.\n\n` +
      `Released Amount: ETB ${payment.carrierAmount?.toFixed(2)}\n` +
      `Route: ${freight?.route?.pickup?.city ?? '—'} → ${freight?.route?.dropoff?.city ?? '—'}\n` +
      `Pickup Date: ${freight?.schedule?.pickupDate ? new Date(freight.schedule.pickupDate).toDateString() : '—'}\n\n` +
      `The funds are now available in your wallet.\n\n` +
      `Smart Truck Platform`,
  }),
};

/**
 * Resolves the recipient user from the payload.
 * Handles multiple payload structures:
 * - payment.confirmed: passes User doc as `carrier`
 * - carrier events: passes carrier doc with truckOwner
 * - bid events: passes User doc as `user`
 *
 * @param {object} payload - event payload
 * @returns {Promise<object|null>} - the recipient user object, or null if not found
 */
async function resolveRecipient(payload) {
  // bid events pass a User doc directly as `user`
  if (payload.user && payload.user.email) {
    return payload.user;
  }

  // payment.confirmed passes a User doc directly as `carrier`
  if (payload.carrier && payload.carrier.email) {
    return payload.carrier;
  }

  const { carrier } = payload;
  const truckOwner = carrier?.truckOwner;

  if (truckOwner && typeof truckOwner === "object" && truckOwner.email) {
    return truckOwner;
  }

  const ownerId = truckOwner?._id ?? truckOwner;
  if (!ownerId) return null;

  return await User.findById(ownerId);
}

/**
 * Trigger an email notification for a named event.
 * Never rejects — all errors are caught and logged internally.
 *
 * @param {string} eventName - e.g. 'carrier.created', 'carrier.verified'
 * @param {object} payload   - event-specific data (carrier doc, populated or not)
 * @returns {Promise<void>}
 */
async function notify(eventName, payload) {
  try {
    const templateFn = Object.hasOwn(TEMPLATES, eventName) ? TEMPLATES[eventName] : undefined;

    if (!templateFn) {
      console.warn(`[emailNotificationService] Unrecognized event name: "${eventName}"`);
      return;
    }

    const owner = await resolveRecipient(payload);

    if (!owner || !owner.email) {
      console.warn(`[emailNotificationService] Could not resolve owner email for event "${eventName}"`);
      return;
    }

    const { subject, message } = templateFn(payload);

    await sendEmail({ email: owner.email, subject, message });
  } catch (err) {
    console.error(`[emailNotificationService] Failed to send notification for event "${eventName}":`, err);
  }
}

module.exports = { notify, resolveRecipient, TEMPLATES };
