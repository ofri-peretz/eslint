// Artifact-smoke fixture for eslint-plugin-secure-coding.
//
// Each finding below exercises a different code path through the flagship
// preset. The baseline.json next to this file pins the expected findings;
// any drift means the published artifact, the rule logic, or the preset
// composition has changed — refresh the baseline deliberately with
// `npm run verify:artifact -- --package eslint-plugin-secure-coding --update-baseline`.
//
// IMPORTANT: do not put real-world credential SHAPES here (Stripe `sk_live_*`,
// AWS `AKIA*`, GitHub `ghp_*`, etc.). GitHub Secret Scanning blocks the push
// when it finds them, even when they're synthetic test values. Stick to
// credential SHAPES that aren't on Secret Scanning's allow-list — mongodb
// connection strings, common-password keywords, JWT-shaped tokens.

// no-hardcoded-credentials — structural tier (database connection string).
const dbUrl = 'mongodb://admin:test-only-not-real@localhost:27017/example';

// no-hardcoded-credentials — ambiguous tier surfaced by credential-named context.
const password = 'SuperSecret123!';

// no-redos-vulnerable-regex — nested-quantifier self-loop, scslre flags exponential.
const vulnerable = /(a+)+b/;

module.exports = { dbUrl, password, vulnerable };
