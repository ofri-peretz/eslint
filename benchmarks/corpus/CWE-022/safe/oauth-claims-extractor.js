// CWE-022: safe — a claims extractor pulls JWT claims, it does not unpack files
// @author        ofri-peretz
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-26
// @source        vitemcp/server@d438700eaa1f4341f6c5655d2665d6807315cf5b src/auth/OAuthProxy.ts:879
// @sealed        node-security/no-zip-slip
// This MUST NOT be flagged
//
// Kept deliberately narrow: the point is that `.extract()` on a claims
// extractor is not archive extraction. The original site also merged the
// result with Object.assign, which is a separate rule's business and would
// conflate two guarantees in one fixture.
async function accessTokenClaims(claimsExtractor, accessToken) {
  return claimsExtractor.extract(accessToken, 'access');
}

module.exports = { accessTokenClaims };
