const crypto = require('crypto');
function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureB64))) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    throw new Error('Token expired');
  }
  return payload;
}
module.exports = { verifyToken };
