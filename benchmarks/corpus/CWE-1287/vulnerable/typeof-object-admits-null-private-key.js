// CWE-1287: vulnerable — typeof null === 'object', so a null keyData reaches importJWK as a JWK
// @author        (not ours — see @source)
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-31
// @source        auth0/express-openid-connect@9cdf98448485a4e36c11429a8be8d97549ac7727 lib/client.js:26
// @sealed        secure-coding/no-improper-type-validation
// @expected      vulnerable
// This MUST be flagged
async function importPrivateKey(keyData, alg) {
  // CryptoKey: algorithm already embedded, pass through
  if (
    typeof keyData?.algorithm?.name === 'string' &&
    Array.isArray(keyData?.usages)
  ) {
    return keyData;
  }

  // Node.js KeyObject: export to PKCS8 PEM then import as CryptoKey
  if (keyData?.asymmetricKeyType) {
    const pem = await exportPKCS8(keyData);
    return importPKCS8(pem, alg);
  }

  // Plain object that is not a Buffer: treat as JWK
  if (typeof keyData === 'object' && !Buffer.isBuffer(keyData)) {
    return importJWK(keyData, alg);
  }

  // PEM string or Buffer
  return importPKCS8(keyData.toString(), alg);
}
