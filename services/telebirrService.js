// /**
//  * Telebirr In-App Payment Service
//  *
//  * Implements the official Ethio Telecom developer portal flow:
//  *   1. applyFabricToken  — get short-lived gateway token
//  *   2. preOrder          — create order, receive prepay_id
//  *   3. buildRawRequest   — sign the rawRequest string for the Flutter SDK
//  *
//  * Signature algorithm: SHA256withRSAandMGF1 (RSA-PSS) using the merchant private key.
//  * The bundled jsrsasign library (back/utils/sign-util-lib.js) handles this.
//  *
//  * In MOCK mode (TELEBIRR_MOCK=true) the real API is skipped and a local
//  * mock-confirm URL is returned so development works without credentials.
//  */

// const axios = require('axios');
// const crypto = require('crypto');
// const https = require('https');
// const applyFabricToken = require('./applyFabricTokenService');
// const pmlib = require('../back/utils/sign-util-lib');

// // ─── Config ──────────────────────────────────────────────────────────────────

// const BASE_URL = process.env.TELEBIRR_BASE_URL ||
//   'https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway';
// const FABRIC_APP_ID = process.env.TELEBIRR_FABRIC_APP_ID || 'c4182ef8-9249-458a-985e-06d191f4d505';
// const MERCHANT_APP_ID = process.env.TELEBIRR_MERCHANT_APP_ID || '1613635079756804';
// const MERCHANT_CODE = process.env.TELEBIRR_MERCHANT_CODE || '194736';
// const PRIVATE_KEY = process.env.TELEBIRR_PRIVATE_KEY || `
// -----BEGIN PRIVATE KEY-----
// MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/ZcoOng1sJZ4C
// egopQVCw3HYqqVRLEudgT+dDpS8fRVy7zBgqZunju2VRCQuHeWs7yWgc9QGd4/8k
// RSLYjlvKNeZ60yWcqEY+eKyQMmcjOz2Sn41fcVNgF+HV3DGiV4b23B6BCMjnpEFI
// b9d99/TsjsFSc7gCPgfl2yWDxE/Y1B2tVE6op2qd63YsMVFQGdre/CQYvFJENpQa
// BLMq4hHyBDgluUXlF0uA1X7UM0ZjbFC6ZIB/Hn1+pl5Ua8dKYrkVaecolmJT/s7c
// /+/1JeN+ja8luBoONsoODt2mTeVJHLF9Y3oh5rI+IY8HukIZJ1U6O7/JcjH3aRJT
// ZagXUS9AgMBAAECggEBALBIBx8JcWFfEDZFwuAWeUQ7+VX3mVx/770kOuNx24HYt
// 718D/HV0avfKETHqOfA7AQnz42EF1Yd7Rux1ZO0e3unSVRJhMO4linT1XjJ9ScMI
// SAColWQHk3wY4va/FLPqG7N4L1w3BBtdjIc0A2zRGLNcFDBlxl/CVDHfcqD3CXdL
// ukm/friX6TvnrbTyfAFicYgu0+UtDvfxTL3pRL3u3WTkDvnFK5YXhoazLctNOFrN
// iiIpCW6dJ7WRYRXuXhz7C0rENHyBtJ0zura1WD5oDbRZ8ON4v1KV4QofWiTFXJpb
// DgZdEeJJmFmt5HIi+Ny3P5n31WwZpRMHGeHrV23//0CgYEA+2/gYjYWOW3JgMDLX
// 7r8fGPTo1ljkOUHuH98H/a/lE3wnnKKx+2ngRNZX4RfvNG4LLeWTz9plxR2RAqqO
// TbX8fj/NA/sS4mru9zvzMY1925FcX3WsWKBgKlLryl0vPScq4ejMLSCmypGz4VgL
// MYZqT4NYIkU2Lo1G1MiDoLy0CcCgYEAwt77exynUhM7AlyjhAA2wSINXLKsdFFF1u
// 976x9kVhOfmbAutfMJPEQWb2WXaOJQMvMpgg2rU5aVsyEcuHsRH/2zatrxrGqLqg
// xaiqPz4ELINIh1iYK/hdRpr1vATHoebOv1wt8/9qxITNKtQTgQbqYci3KV1lPsOr
// BAB5S57nsCgYAvw+cagS/jpQmcngOEoh8I+mXgKEET64517DIGWHe4kr3dO+FFbc5
// eZPCbhqgxVJ3qUM4LK/7BJq/46RXBXLvVSfohR80Z5INtYuFjQ1xJLveeQcuhUxd
// K+95W3kdBBi8lHtVPkVsmYvekwK+ukcuaLSGZbzE4otcn47kajKHYDQKBgDbQyIb
// J+ZsRw8CXVHu2H7DWJlIUBIS3s+CQ/xeVfgDkhjmSIKGX2to0AOeW+S9MseiTE/L
// 8a1wY+MUppE2UeK26DLUbH24zjlPoI7PqCJjl0DFOzVlACSXZKV1lfsNEeriC61/
// EstZtgezyOkAlSCIH4fGr6tAeTU349Bnt0RtvAoGBAObgxjeH6JGpdLz1BbMj8xUH
// uYQkbxNeIPhH29CySn0vfhwg9VxAtIoOhvZeCfnsCRTj9OZjepCeUqDiDSoFzngl
// rKhfeKUndHjvg+9kiae92iI6qJudPCHMNwP8wMSphkxUqnXFR3lr9A765GA980818
// UWZdrhrjLKtIIZdh+X1
// -----END PRIVATE KEY-----`;

// // ─── Helpers ─────────────────────────────────────────────────────────────────

// const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// /** Fields excluded from signature computation */
// const EXCLUDE_FIELDS = ['sign', 'sign_type', 'header', 'refund_info', 'openType', 'raw_request', 'biz_content'];

// /**
//  * Sign a request object using SHA256withRSAandMGF1 (RSA-PSS).
//  * Flattens biz_content fields into the top-level, sorts by ASCII, signs.
//  */
// function signRequestObject(requestObject) {
//   const fieldMap = {};
//   for (const key of Object.keys(requestObject)) {
//     if (!EXCLUDE_FIELDS.includes(key)) fieldMap[key] = requestObject[key];
//   }
//   if (requestObject.biz_content) {
//     for (const key of Object.keys(requestObject.biz_content)) {
//       if (!EXCLUDE_FIELDS.includes(key)) fieldMap[key] = requestObject.biz_content[key];
//     }
//   }
//   const signStr = Object.keys(fieldMap).sort().map((k) => `${k}=${fieldMap[k]}`).join('&');
//   const signer = new pmlib.rs.KJUR.crypto.Signature({ alg: 'SHA256withRSAandMGF1' });
//   signer.init(PRIVATE_KEY.trim());
//   signer.updateString(signStr);
//   return pmlib.rs.hextob64(signer.sign());
// }

// function createTimestamp() {
//   return Math.round(Date.now() / 1000).toString();
// }

// function createNonceStr() {
//   return crypto.randomBytes(16).toString('hex').toUpperCase();
// }

// // ─── Public API ───────────────────────────────────────────────────────────────

// /**
//  * Initiate a Telebirr In-App payment.
//  *
//  * MOCK mode  → returns a local mock-confirm URL as `toPayUrl`.
//  * REAL mode  → calls Telebirr preOrder API, returns signed rawRequest string as `toPayUrl`.
//  *              The Flutter app passes this string to the flutter_telebirr SDK.
//  *
//  * @returns {Promise<{ toPayUrl: string }>}
//  */
// async function initiatePayment({ outTradeNo, totalAmount, notifyUrl, subject }) {
//   if (process.env.TELEBIRR_MOCK === 'true') {
//     const mockUrl = `${process.env.APP_BASE_URL || 'http://10.0.2.2:8000'}/api/v1/payments/mock-confirm/${outTradeNo}`;
//     console.log(`[Telebirr MOCK] outTradeNo=${outTradeNo} amount=${totalAmount}`);
//     return { toPayUrl: mockUrl };
//   }

//   // Step 1: get fabric token
//   const { token: fabricToken } = await applyFabricToken();

//   // Step 2: create pre-order
//   const preOrderReq = {
//     timestamp: createTimestamp(),
//     nonce_str: createNonceStr(),
//     method: 'payment.preorder',
//     version: '1.0',
//   };
//   preOrderReq.biz_content = {
//     notify_url: notifyUrl,
//     trade_type: 'InApp',
//     appid: MERCHANT_APP_ID,
//     merch_code: MERCHANT_CODE,
//     merch_order_id: outTradeNo,
//     title: subject,
//     total_amount: totalAmount.toFixed(2),
//     trans_currency: 'ETB',
//     timeout_express: '120m',
//     payee_identifier: MERCHANT_CODE,
//     payee_identifier_type: '04',
//     payee_type: '5000',
//   };
//   preOrderReq.sign = signRequestObject(preOrderReq);
//   preOrderReq.sign_type = 'SHA256WithRSA';

//   const preOrderRes = await axios.post(
//     `${BASE_URL}/payment/v1/merchant/preOrder`,
//     preOrderReq,
//     {
//       headers: { 'Content-Type': 'application/json', 'X-APP-Key': FABRIC_APP_ID, Authorization: fabricToken },
//       httpsAgent,
//       timeout: 15000,
//     },
//   );

//   const prepayId = preOrderRes.data?.biz_content?.prepay_id;
//   if (!prepayId) throw new Error(`Telebirr preOrder failed: ${JSON.stringify(preOrderRes.data)}`);

//   // Step 3: build rawRequest string for Flutter SDK
//   const rawMap = {
//     appid: MERCHANT_APP_ID,
//     merch_code: MERCHANT_CODE,
//     nonce_str: createNonceStr(),
//     prepay_id: prepayId,
//     timestamp: createTimestamp(),
//   };
//   const rawSign = signRequestObject(rawMap);
//   const rawRequest = [
//     `appid=${rawMap.appid}`,
//     `merch_code=${rawMap.merch_code}`,
//     `nonce_str=${rawMap.nonce_str}`,
//     `prepay_id=${rawMap.prepay_id}`,
//     `timestamp=${rawMap.timestamp}`,
//     `sign=${rawSign}`,
//     'sign_type=SHA256WithRSA',
//   ].join('&');

//   return { toPayUrl: rawRequest };
// }

// /**
//  * Verify the Telebirr payment notification.
//  * In MOCK mode always returns true.
//  * In real mode the notify payload is trusted if it arrives at our notify_url
//  * (Telebirr does not send a signature header in the In-App flow).
//  */
// function verifyWebhookSignature(payload, signature) {
//   if (process.env.TELEBIRR_MOCK === 'true') return true;
//   // The In-App notify_url callback does not use a signature header.
//   // Validate by checking required fields are present.
//   return !!(payload && payload.outTradeNo && payload.status);
// }

// module.exports = { initiatePayment, verifyWebhookSignature };
