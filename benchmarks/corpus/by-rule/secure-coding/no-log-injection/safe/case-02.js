// secure-coding/no-log-injection — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/no-log-injection
function onLoginAttempt(req) {
            logger.info({ event: 'login_attempt', username: req.body.username }, 'login attempt');
          }

          function auditRequest(req) {
            logger.info(
              {
                event: 'request',
                username: req.query.user,
                ip: req.headers['x-forwarded-for'],
                path: req.path,
              },
              'request handled',
            );
          }
