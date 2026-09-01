/**
 * Tests for no-log-injection
 * Security: CWE-117 (Improper Output Neutralization for Logs)
 *
 * Every fixture in benchmarks/corpus/CWE-117 is pinned here — the two
 * vulnerable files as `invalid`, the two safe files as `valid` — so the corpus
 * verdict cannot drift from the rule without a test going red.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noLogInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-log-injection', () => {
  ruleTester.run('no-log-injection', noLogInjection, {
    valid: [
      // ---------------------------------------------------------------
      // Corpus fixtures that must stay silent
      // ---------------------------------------------------------------
      {
        // benchmarks/corpus/CWE-117/safe/stripped-newlines.js
        // The value is wrapped in a call, so it is not *directly* embedded.
        // No name matching is involved: any call breaks attribution.
        name: 'corpus safe: CR/LF stripped before the value reaches the line',
        code: `
          function sanitizeForLog(value) {
            return String(value)
              .replace(/[\\r\\n\\t]+/g, ' ')
              .slice(0, 256);
          }

          function onLoginAttempt(req) {
            logger.info('login attempt: ' + sanitizeForLog(req.body.username));
          }
        `,
      },
      {
        // benchmarks/corpus/CWE-117/safe/structured-logging.js
        // The object argument is a field carrier, not a line fragment.
        name: 'corpus safe: structured logging keeps untrusted input in a field',
        code: `
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
        `,
      },

      // ---------------------------------------------------------------
      // Real-library shapes: a log line with no request provenance.
      // These are the FP class the rule is measured against (okta, auth0,
      // stripe, twilio, ioredis, paypal, shopify all log like this).
      // ---------------------------------------------------------------
      {
        name: 'local variable with no request provenance',
        code: 'const total = items.length; console.log(`processed ${total} items`);',
      },
      {
        name: 'concatenated locals and constants',
        code: "console.log('listening on port ' + port);",
      },
      {
        name: 'a bare string message',
        code: "logger.warn('deprecated: use createClient() instead');",
      },
      {
        name: 'a non-message argument is not scanned',
        code: 'logger.debug(req.body.username);',
      },
      {
        name: 'a comparison argument is not message-shaped',
        code: 'logger.debug(req.body.username === expected);',
      },

      // ---------------------------------------------------------------
      // Sinks that are not loggers
      // ---------------------------------------------------------------
      {
        name: 'plain call, not a member expression',
        code: "log('user: ' + req.body.username);",
      },
      {
        name: 'a level method chosen at runtime is not read as a level',
        code: "console[level]('user: ' + req.body.username);",
      },
      {
        name: 'a non-level method on a logger is not a sink',
        code: "logger.child('user: ' + req.body.username);",
      },
      {
        name: 'an unrelated receiver with a level-shaped method',
        code: "assert.error('user: ' + req.body.username);",
      },
      {
        name: 'a property receiver that is not a logger',
        code: "this.mailer.warn('user: ' + req.body.username);",
      },
      {
        name: 'a receiver property chosen at runtime is not resolved',
        code: "container[which].warn('user: ' + req.body.username);",
      },
      {
        name: 'a call-expression receiver is not resolved',
        code: "getLogger().warn('user: ' + req.body.username);",
      },

      // ---------------------------------------------------------------
      // Attribution that must abstain
      // ---------------------------------------------------------------
      {
        name: 'a request root with no request property',
        code: "logger.info('request ' + req.id);",
      },
      {
        name: 'a member expression on an unrelated root',
        code: "logger.info('user ' + user.name);",
      },
      {
        name: 'a member expression whose root is a call',
        code: "logger.info('user ' + getReq().body.username);",
      },
      {
        name: 'a private field is not a request field',
        code: 'class S { #req; f() { logger.info("id=" + this.#req.body.id); } }',
      },
      {
        name: 'a numeric computed key contributes no property name',
        code: 'logger.info("first=" + req[0]);',
      },
      {
        name: 'the request object itself, not a request field',
        code: 'function handler(req) { logger.info("got " + req); }',
      },
      {
        name: 'an undeclared identifier resolves to nothing',
        code: 'logger.info(`value=${totallyUndeclared}`);',
      },
      {
        name: 'an identifier declared outside the enclosing function',
        // The lookup stops at the function boundary: a module-level binding is
        // not this request's data, and following it would make the rule a
        // whole-program search it cannot justify.
        code: `
          const forwardedFor = req.headers['x-forwarded-for'];
          function auditRequest(req) {
            logger.info(\`ip=\${forwardedFor}\`);
          }
        `,
      },
      {
        name: 'an identifier that is not resolvable inside the function',
        code: 'function h(req) { logger.info(`v=${notDeclaredAnywhere}`); }',
      },
      {
        name: 'a binding with no initializer',
        code: 'function h(req) { let v; logger.info("v=" + v); }',
      },
      {
        name: 'a binding with no definition node (implicit `arguments`)',
        code: 'function h(req) { logger.info("args=" + arguments); }',
      },
      {
        name: 'a one-hop binding that is not a request field',
        code: 'function h(req) { const v = user.name; logger.info(`v=${v}`); }',
      },
      {
        name: 'a one-hop binding through a sanitizing call',
        code: `
          function auditRequest(req) {
            const safe = sanitizeForLog(req.headers['x-forwarded-for']);
            logger.info(\`ip=\${safe}\`);
          }
        `,
      },
      {
        name: 'an i18n-style template with no request data',
        code: 'logger.info(`retrying in ${delay}ms (attempt ${attempt})`);',
      },
      {
        name: 'a request root that is not configured',
        code: "logger.info('id=' + payload.body.id);",
        options: [{ loggerNames: ['audit'] }],
      },

      // ---------------------------------------------------------------
      // Vocabulary defaults, pinned
      //
      // Each of these is the QUIET half of a pair whose positive control
      // sits in `invalid` below. They exist so that adding, removing or
      // reordering an entry in DEFAULT_LOGGER_RECEIVERS /
      // DEFAULT_REQUEST_ROOTS / DEFAULT_REQUEST_PROPERTIES cannot happen
      // silently.
      // ---------------------------------------------------------------
      {
        name: 'DEFAULT: `audit` is not a built-in logger receiver',
        code: 'audit.info("user=" + req.body.username);',
      },
      {
        name: 'DEFAULT: `payload` is not a built-in request root',
        code: 'logger.info("id=" + payload.body.id);',
      },
      {
        name: "DEFAULT: `payload` is not a built-in request property (hapi's request.payload)",
        code: 'logger.info("u=" + request.payload.name);',
      },

      // ---------------------------------------------------------------
      // Vocabulary overridden — the REPLACE direction, which is the one a
      // consumer has no other remedy for. Each drops an entry the default
      // carries, and the matching `invalid` case proves the same code
      // reports without the option.
      // ---------------------------------------------------------------
      {
        name: 'loggerReceivers REPLACES the built-ins: `logger` is no longer a sink',
        code: 'logger.info("user=" + req.body.username);',
        options: [{ loggerReceivers: ['audit'] }],
      },
      {
        name: 'requestRootNames REPLACES the built-ins: `req` is no longer a request',
        code: 'logger.info("user=" + req.body.username);',
        options: [{ requestRootNames: ['payload'] }],
      },
      {
        name: 'requestProperties REPLACES the built-ins: `body` no longer carries caller data',
        code: 'logger.info("user=" + req.body.username);',
        options: [{ requestProperties: ['payload'] }],
      },
    ],

    invalid: [
      // Was pinned as valid under "computed level method is not read as a
      // level". `console['log']` writes the same unescaped username to the
      // same stream at the same level.
      {
        name: 'a log level spelled with a subscript is still that level',
        code: "console['log']('user: ' + req.body.username);",
        errors: 1,
      },
      // Was pinned as valid — "a computed receiver property is not resolved".
      // `container['logger']` holds the same logger `container.logger` holds,
      // and the same unescaped username reaches the same log line.
      {
        name: 'a logger held under a quoted key',
        code: "container['logger'].warn('user: ' + req.body.username);",
        errors: 1,
      },
      // ---------------------------------------------------------------
      // Corpus fixtures that must report
      // ---------------------------------------------------------------
      {
        // benchmarks/corpus/CWE-117/vulnerable/newline-in-log-message.js
        name: 'corpus vulnerable: request field concatenated into a log line',
        code: `
          function onLoginAttempt(req) {
            logger.info('login attempt: ' + req.body.username);
          }

          function onLoginFailure(req, reason) {
            logger.warn('login failed for ' + req.body.username + ' reason=' + reason);
          }
        `,
        errors: [
          { messageId: 'logInjection', data: { source: 'req.body.username' } },
          { messageId: 'logInjection', data: { source: 'req.body.username' } },
        ],
      },
      {
        // benchmarks/corpus/CWE-117/vulnerable/template-literal-log.js
        name: 'corpus vulnerable: untrusted header interpolated into a template',
        code: `
          function auditRequest(req) {
            const forwardedFor = req.headers['x-forwarded-for'];
            logger.info(\`request user=\${req.query.user} ip=\${forwardedFor} path=\${req.path}\`);
          }

          function auditExport(req, rows) {
            console.log(\`export by \${req.query.user}: \${rows.length} rows\`);
          }
        `,
        // One report per logging call — the first template embeds three
        // attributable values and is still a single finding with a single fix.
        errors: [
          { messageId: 'logInjection', data: { source: 'req.query.user' } },
          { messageId: 'logInjection', data: { source: 'req.query.user' } },
        ],
      },

      // ---------------------------------------------------------------
      // The one-hop binding on its own
      // ---------------------------------------------------------------
      {
        name: 'a local bound to a request header, one hop',
        code: `
          function auditRequest(req) {
            const forwardedFor = req.headers['x-forwarded-for'];
            logger.info(\`ip=\${forwardedFor}\`);
          }
        `,
        errors: [
          {
            messageId: 'logInjection',
            data: { source: 'req.headers.x-forwarded-for' },
          },
        ],
      },
      {
        name: 'a one-hop binding resolved from a nested block scope',
        code: `
          function auditRequest(req) {
            const user = req.query.user;
            if (enabled) {
              logger.info(\`user=\${user}\`);
            }
          }
        `,
        errors: [
          { messageId: 'logInjection', data: { source: 'req.query.user' } },
        ],
      },

      // ---------------------------------------------------------------
      // Sink and shape variations
      // ---------------------------------------------------------------
      {
        name: 'console.error with a template',
        code: 'console.error(`bad path ${req.path}`);',
        errors: [{ messageId: 'logInjection', data: { source: 'req.path' } }],
      },
      {
        name: 'a logger held on `this`',
        code: 'class S { handle(req) { this.logger.warn("q=" + req.query.q); } }',
        errors: [{ messageId: 'logInjection', data: { source: 'req.query.q' } }],
      },
      {
        name: 'a framework logger reached through a property',
        code: 'fastify.log.info(`url=${request.url}`);',
        errors: [
          { messageId: 'logInjection', data: { source: 'request.url' } },
        ],
      },
      {
        name: 'a computed request property with a non-literal key still counts',
        code: 'logger.info("h=" + req.headers[name]);',
        errors: [{ messageId: 'logInjection', data: { source: 'req.headers' } }],
      },
      {
        name: 'a template nested inside a concatenation',
        code: 'logger.warn("ctx " + `user=${ctx.params.id}`);',
        errors: [
          { messageId: 'logInjection', data: { source: 'ctx.params.id' } },
        ],
      },
      {
        name: 'a lambda event body',
        code: 'logger.info(`payload=${event.body}`);',
        errors: [{ messageId: 'logInjection', data: { source: 'event.body' } }],
      },

      // ---------------------------------------------------------------
      // Options
      // ---------------------------------------------------------------
      {
        name: 'loggerNames adds a receiver',
        code: 'audit.info("user=" + req.body.username);',
        options: [{ loggerNames: ['audit'] }],
        errors: [
          { messageId: 'logInjection', data: { source: 'req.body.username' } },
        ],
      },
      {
        name: 'requestRoots adds a request root',
        code: 'logger.info("id=" + payload.body.id);',
        options: [{ requestRoots: ['payload'] }],
        errors: [
          { messageId: 'logInjection', data: { source: 'payload.body.id' } },
        ],
      },

      // ---------------------------------------------------------------
      // The POSITIVE CONTROLS for the three "REPLACES the built-ins"
      // valid cases above. Identical code, no options: the rule reports.
      // Silence there therefore means the option was honoured, not that
      // the snippet was unreachable to begin with.
      // ---------------------------------------------------------------
      {
        name: 'DEFAULT: logger + req.body reports with no options at all',
        code: 'logger.info("user=" + req.body.username);',
        errors: [
          { messageId: 'logInjection', data: { source: 'req.body.username' } },
        ],
      },
      {
        name: 'loggerReceivers REPLACES the built-ins: the replacement is a sink',
        code: 'audit.info("user=" + req.body.username);',
        options: [{ loggerReceivers: ['audit'] }],
        errors: [
          { messageId: 'logInjection', data: { source: 'req.body.username' } },
        ],
      },
      {
        name: 'requestRootNames REPLACES the built-ins: the replacement is a request',
        code: 'logger.info("id=" + payload.body.id);',
        options: [{ requestRootNames: ['payload'] }],
        errors: [
          { messageId: 'logInjection', data: { source: 'payload.body.id' } },
        ],
      },
      {
        name: "additionalRequestProperties adds hapi's request.payload",
        code: 'logger.info("u=" + request.payload.name);',
        options: [{ additionalRequestProperties: ['payload'] }],
        errors: [
          { messageId: 'logInjection', data: { source: 'request.payload.name' } },
        ],
      },
    ],
  });
});
