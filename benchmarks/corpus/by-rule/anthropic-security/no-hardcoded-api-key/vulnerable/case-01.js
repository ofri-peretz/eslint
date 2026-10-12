// anthropic-security/no-hardcoded-api-key — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by anthropic-security/no-hardcoded-api-key
// 2026-10-12 FP/FN audit: the case this was derived from used a stand-in key
// or an unbound callee, which the corrected rule no longer reports; re-derived
// from the rule's key-shaped RuleTester case.
const Anthropic = require('@anthropic-ai/sdk');
new Anthropic({ apiKey: 'sk-ant-api03-Zx9Qw2Lm8Rt4Yv6Np0Kc3Hd5Wb7' });
