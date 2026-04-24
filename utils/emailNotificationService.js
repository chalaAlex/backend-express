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
};

/**
 * Resolves the carrier owner from the payload.
 * If truckOwner is already populated (object with email), returns it directly.
 * Otherwise queries the User model by ObjectId.
 *
 * @param {object} payload - event payload containing a carrier document
 * @returns {Promise<object|null>} - the owner user object, or null if not found
 */
async function resolveRecipient(payload) {
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
