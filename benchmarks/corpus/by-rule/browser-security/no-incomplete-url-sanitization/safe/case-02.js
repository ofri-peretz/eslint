// browser-security/no-incomplete-url-sanitization — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by browser-security/no-incomplete-url-sanitization
function isTrustedApi(url) {
            try {
              return new URL(url).hostname === 'trusted.com';
            } catch (err) {
              return false;
            }
          }
