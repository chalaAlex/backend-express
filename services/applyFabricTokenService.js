const axios = require('axios');
const https = require('https');

/**
 * Fetches a short-lived fabric token from the Telebirr gateway.
 * Required as Authorization header for all subsequent API calls.
 */
async function applyFabricToken() {
  const response = await axios.post(
    `${process.env.TELEBIRR_BASE_URL}/payment/v1/token`,
    { appSecret: process.env.TELEBIRR_APP_SECRET },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-APP-Key': process.env.TELEBIRR_FABRIC_APP_ID,
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 15000,
    },
  );
  return response.data; // { token: "..." }
}

module.exports = applyFabricToken;
