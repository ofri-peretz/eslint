// CWE-526: safe — configuration ABOUT a credential is not a credential
// @author        ofri-peretz
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-08-26
// @source        auth0/express-openid-connect api.js:2, and 110 instances across
//                the 158-repo scan — the largest single false-positive shape
//                require-secure-credential-storage produced
// @sealed        node-security/require-secure-credential-storage
// This MUST NOT be flagged
//
// Every name below contains a credential word and none of them holds a secret.
// The value is an algorithm, a lifetime, a header name, or the name of a secret
// stored elsewhere.
process.env.TOKEN_SIGNING_ALG = 'RS256';
process.env.TOKEN_EXPIRY = '3600';
process.env.AUTH_TOKEN_HEADER = 'x-auth';
process.env.SECRET_NAME = 'db-creds';
