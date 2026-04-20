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
  const { carrier } = payload;
  const truckOwner = carrier.truckOwner;

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
