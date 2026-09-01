// secure-coding/no-log-injection — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/no-log-injection
function sanitizeForLog(value) {
            return String(value)
              .replace(/[\r\n\t]+/g, ' ')
              .slice(0, 256);
          }

          function onLoginAttempt(req) {
            logger.info('login attempt: ' + sanitizeForLog(req.body.username));
          }
