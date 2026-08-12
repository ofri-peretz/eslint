import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noErrorSwallowing } from './index';

/**
 * Every fixture carries the Lambda handler shape, because the rules now abstain
 * in files that are not Lambda code. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the shape
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
const asLambda = (code: string): string =>
  `import type { Handler } from 'aws-lambda';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const lambda = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asLambda(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asLambda(test.code),
      // Autofix and suggestion fixtures assert the WHOLE file back, so every
      // `output` needs the same prefix or each fixable rule fails on the header
      // alone — including the ones nested under errors[].suggestions[].
      ...(typeof test.output === 'string' ? { output: asLambda(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asLambda(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-error-swallowing', noErrorSwallowing, {
  valid: lambda([
    // ── The four ILB-CWE-Corpus fixtures this rule used to report ────────
    // Each is the *correct, secure* form of its pattern. Together they were
    // 4 of the suite's 16 false positives — a quarter, from one rule.
    //
    // A safe fallback value. The old check demanded the returned expression
    // match /500|error|fail/, so `return '#'` from a scheme allowlist and
    // `return false` from a hostname validator both read as swallowing.
    {
      name: 'CWE-020/scheme-allowlist — catch returns a safe fallback',
      code: `
        function sanitizeHref(raw) {
          try {
            const parsed = new URL(raw, window.location.origin);
            return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? parsed.href : '#';
          } catch (err) {
            return '#';
          }
        }
      `,
    },
    {
      name: 'CWE-020/url-parse-hostname — catch returns false',
      code: `
        function isTrustedApi(url) {
          try {
            return new URL(url).hostname === 'trusted.com';
          } catch (err) {
            return false;
          }
        }
      `,
    },
    // Forwarding to an error handler is `throw` spelled asynchronously —
    // Express's error middleware is reached no other way.
    {
      name: 'CWE-209/generic-error-response — catch forwards via next(err)',
      code: `
        app.get('/reports/:id', async (req, res, next) => {
          try {
            res.json(await loadReport(req.params.id));
          } catch (err) {
            next(err);
          }
        });
      `,
    },
    // Answering the request is handling it. No return statement here — the
    // response happens inside an if — so the old return check never applied.
    {
      name: 'CWE-248/pipeline-promises — catch answers the request',
      code: `
        async function download(req, res) {
          try {
            await pipeline(fs.createReadStream('./uploads/report.json'), res);
          } catch {
            if (!res.headersSent) res.status(404).end();
          }
        }
      `,
    },
    // Related shapes the AST rewrite must also accept.
    {
      name: 'promise rejection is propagation',
      code: `
        new Promise((resolve, reject) => {
          try { risky(); } catch (error) { reject(error); }
        });
      `,
    },
    {
      name: 'node-style callback is propagation',
      code: `try { risky(); } catch (error) { callback(error); }`,
    },
    {
      name: 'the error travelling inside a larger expression still forwards',
      code: `try { risky(); } catch (error) { next(new Error(error.message)); }`,
    },
    {
      name: 'logger reached through a member chain',
      code: `try { risky(); } catch (error) { this.logger.error('failed', error); }`,
    },
    {
      name: 'sentry capture counts as recording',
      code: `try { risky(); } catch (error) { Sentry.captureException(error); }`,
    },
    {
      name: 'logging from inside a nested callback still records',
      code: `
        try { risky(); } catch (error) {
          process.nextTick(() => { console.error('failed', error); });
        }
      `,
    },
    // Object returns that carry no success claim are fail-closed fallbacks:
    // no status-like key at all, and a status whose value is computed rather
    // than a literal (nothing to read, so nothing to treat as 2xx).
    {
      name: 'object fallback with no status key is fail-closed',
      code: `try { risky(); } catch (error) { return { data: [] }; }`,
    },
    {
      name: 'object fallback with a computed status is fail-closed',
      code: `try { risky(); } catch (error) { return { statusCode: fallbackCode }; }`,
    },
    // ── end corpus regressions ──────────────────────────────────────────
    // Rethrows the error — not swallowed
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          throw error;
        }
      `,
    },
    // console.error logging
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          console.error('Failed:', error);
        }
      `,
    },
    // console.log logging
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          console.log('Error', error);
        }
      `,
    },
    // console.warn logging
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          console.warn('Warning:', error);
        }
      `,
    },
    // Logger: logger.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          logger.error('Operation failed', { error });
        }
      `,
    },
    // Logger: winston.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          winston.error(error);
        }
      `,
    },
    // Logger: pino.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          pino.error(error);
        }
      `,
    },
    // Logger: bunyan.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          bunyan.error('Failed', error);
        }
      `,
    },
    // Logger: log.error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          log.error('Failed', error);
        }
      `,
    },
    // Direct function call matching log/error/warn patterns
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          logError(error);
        }
      `,
    },
    // Return with 500 status (error response) — acceptable error handling
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          return { statusCode: 500, body: 'Internal error' };
        }
      `,
    },
    // Test file (allowed by default)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {}
      `,
      filename: 'handler.test.ts',
    },
    // Empty catch with intentional comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // intentional - we don't care about this error
        }
      `,
    },
    // Empty catch with "ignore" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // Ignore this error
        }
      `,
    },
    // Empty catch with "suppress" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          /* suppress error */
        }
      `,
    },
    // Empty catch with "handled" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // Error is handled elsewhere
        }
      `,
    },
    // Empty catch with "expected" comment
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // expected behavior
        }
      `,
    },
  ]),

  invalid: lambda([
    // ── FN boundary for the AST rewrite above ───────────────────────────
    // Widening a rule to kill false positives is exactly how a false
    // negative gets introduced (see #441, where excluding TemplateLiteral
    // by name silenced `res.send(req.query.name || '<p>x</p>')`). These pin
    // the edge of each new exemption.
    //
    // `return <value>` is a deliberate fallback; a bare `return;` records
    // nothing and produces nothing. It must still report.
    {
      name: 'bare return is still swallowing',
      code: `
        function attempt() {
          try {
            riskyOperation();
          } catch (error) {
            return;
          }
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // The mirror of the two valid fallback cases above, and the reason the
    // exemption is written in terms of fail-closed rather than "returns a
    // value". `return false` from a hostname validator denies; `return true`
    // from an auth check grants access on a malformed token. One token apart,
    // opposite sides of the line. A draft of this fix exempted both and turned
    // this exact corpus fixture into a false negative.
    {
      name: 'CWE-636/catch-returns-true — fail-open auth must still report',
      code: `
        function isAuthorized(token) {
          try {
            return verifyToken(token).valid;
          } catch (err) {
            return true;
          }
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    {
      name: 'fail-open object literal must still report',
      code: `try { risky(); } catch (error) { return { authorized: true }; }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Forwarding must actually forward. Classifying on the callee name alone
    // let a zero-argument `next()` count as handled while discarding the error
    // — the exact false negative this exemption exists to avoid creating.
    {
      name: 'next() with no argument discards the error',
      code: `try { risky(); } catch (err) { next(); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    {
      name: 'reject() with no argument discards the error',
      code: `try { risky(); } catch (err) { reject(); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    {
      name: 'forwarding something other than the caught error',
      code: `try { risky(); } catch (err) { next(previousFailure); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // An omitted catch binding has nothing to forward.
    {
      name: 'no catch binding leaves nothing to forward',
      code: `try { risky(); } catch { next(); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // A non-forwarding call must not be mistaken for propagation just
    // because a call is present.
    {
      name: 'an unrelated call is not propagation',
      code: `try { risky(); } catch (error) { cleanup(); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // The caught error going nowhere, with a response object present but no
    // response method called on it.
    {
      name: 'touching res without answering is still swallowing',
      code: `
        function handler(req, res) {
          try { risky(); } catch (error) { res.locals.failed = true; }
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    {
      name: 'return undefined is still swallowing',
      code: `
        function attempt() {
          try { riskyOperation(); } catch (error) { return undefined; }
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Member chains the AST walk has to survive without mistaking them for a
    // logger. A string-literal property is not an Identifier, so the chain
    // yields no usable method name — the rule must fall through to reporting
    // rather than treat the empty name as a match.
    {
      name: 'string-keyed member call is not logging',
      code: `try { risky(); } catch (error) { registry['run'](); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    {
      name: 'string-keyed nested member call is not logging',
      code: `try { risky(); } catch (error) { services['audit'].dispatch(error); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // A callee that is itself a call — neither Identifier nor MemberExpression.
    {
      name: 'immediately-invoked handler lookup is not logging',
      code: `try { risky(); } catch (error) { (getHandler())(error); }`,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // ── end FN boundary ─────────────────────────────────────────────────
    // Empty catch block — classic error swallowing (has suggestion with fix)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {}
      `,
      errors: [{
        messageId: 'emptyCatchBlock',
        suggestions: [{
          messageId: 'addErrorLogging',
          output: `
        try {
          riskyOperation();
        } catch (error) { console.error('Error:', error); }
      `,
        }],
      }],
    },
    // Catch block with code but no logging (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          const x = 1;
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Catch block with return but no error context (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          return { statusCode: 200, body: 'ok' };
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Catch block with return null — no error context (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          return null;
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // Empty catch without param name (has suggestion, defaults to 'error')
    {
      code: `
        try {
          riskyOperation();
        } catch {
        }
      `,
      errors: [{
        messageId: 'emptyCatchBlock',
        suggestions: [{
          messageId: 'addErrorLogging',
          output: `
        try {
          riskyOperation();
        } catch { console.error('Error:', error); }
      `,
        }],
      }],
    },
    // Catch with only a non-logging function call (no suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          doSomething();
        }
      `,
      errors: [{ messageId: 'emptyCatchBlock' }],
    },
    // allowWithComment: false should flag commented empty catch (has suggestion)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          // intentional
        }
      `,
      options: [{ allowWithComment: false }],
      errors: [{
        messageId: 'emptyCatchBlock',
        suggestions: [{
          messageId: 'addErrorLogging',
          output: `
        try {
          riskyOperation();
        } catch (error) { console.error('Error:', error); }
      `,
        }],
      }],
    },
  ]),
});
