// secure-coding/no-log-injection — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by secure-coding/no-log-injection
function onLoginAttempt(req) {
            logger.info('login attempt: ' + req.body.username);
          }

          function onLoginFailure(req, reason) {
            logger.warn('login failed for ' + req.body.username + ' reason=' + reason);
          }
