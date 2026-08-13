/**
 * Comprehensive tests for no-fail-open-auth
 * Security: CWE-636 (Not Failing Securely / failing open)
 *
 * Every fixture under `benchmarks/corpus/CWE-636/` is pinned here — the two
 * vulnerable files as `invalid`, the two safe files as `valid` — so a
 * regression in either direction fails this suite before it reaches the
 * benchmark run.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noFailOpenAuth } from './index';

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

describe('no-fail-open-auth', () => {
  ruleTester.run('no-fail-open-auth', noFailOpenAuth, {
    valid: [
      // ----------------------------------------------------------------
      // Corpus fixtures that must stay silent
      // ----------------------------------------------------------------
      {
        name: 'benchmarks/corpus/CWE-636/safe/catch-denies.js',
        code: `
function isAuthorized(token) {
  try {
    return verifyToken(token).valid === true;
  } catch (err) {
    logger.warn({ event: 'token_verify_failed', reason: err.name });
    return false;
  }
}

function handleRequest(req, res) {
  if (!isAuthorized(req.headers.authorization)) {
    res.status(401).end();
    return;
  }
  res.json(loadAccountData(req.params.id));
}
`,
      },
      {
        name: 'benchmarks/corpus/CWE-636/safe/catch-rethrows.js',
        code: `
async function handleAdminAction(req, res) {
  let actor;
  try {
    actor = await assertAdmin(req.headers.authorization);
  } catch (err) {
    logger.error({ event: 'admin_assert_failed', reason: err.name });
    throw err;
  }

  await purgeTable(req.body.table);
  res.json({ ok: true, actor: actor.id });
}
`,
      },

      // ----------------------------------------------------------------
      // No security decision in the try block — the precision gate.
      // ----------------------------------------------------------------
      // Parsing, storage and telemetry are what most catch blocks in an auth
      // SDK are actually wrapped around.
      `function f(raw) { try { JSON.parse(raw); } catch (e) { /* ignore */ } save(raw); }`,
      `function f() { try { localStorage.removeItem('k'); } catch (e) {} render(); }`,
      // Bare verbs are deliberately not decisions: `jwt.verify` is a real
      // miss, and it is the price of not matching sinon/mock/schema `.verify`.
      `function f(t) { try { jwt.verify(t, key); } catch (e) {} proceed(); }`,
      `function f(x) { try { validate(x); } catch (e) {} proceed(); }`,
      // Measured on okta-auth-js: verb + `Auth\\w*` would match all three of
      // these, and none of them decides anything about a caller's access.
      `function f(e) { try { assertAuthSdkError(e); } catch (err) {} proceed(); }`,
      `function f(e) { try { assertAuthStatusText(e); } catch (err) {} proceed(); }`,
      `function f() { try { verifyAuthJSVersion(); } catch (e) {} proceed(); }`,
      // A decision outside any try block.
      `function f(t) { verifyToken(t); try { g(); } catch (e) {} proceed(); }`,
      // A decision in the *catch*, not the try: the try decided nothing.
      `function f(t) { try { g(); } catch (e) { verifyToken(t); } proceed(); }`,
      // A decision inside a callback declared in the try does not run in it.
      `function f(t) { try { app.use(() => verifyToken(t)); } catch (e) {} proceed(); }`,
      // Module top level, inside neither a function nor a try: the upward
      // walk runs out of ancestors rather than hitting a boundary.
      `verifyToken(token);\nnext(err);`,
      // Callee names that are not statically knowable.
      `function f(k) { try { handlers[k](); } catch (e) {} proceed(); }`,
      `function f() { try { (getGuard())(); } catch (e) {} proceed(); }`,

      // ----------------------------------------------------------------
      // The catch denies
      // ----------------------------------------------------------------
      `function f(t) { try { return verifyToken(t).valid; } catch (e) { return false; } }`,
      `function f(t) { try { return validateSession(t); } catch (e) { return null; } }`,
      `function f(t) { try { return checkPermissions(t); } catch (e) { return 0; } }`,
      `function f(t) { try { return hasRole(t, 'admin'); } catch (e) { return ''; } }`,
      // `return undefined` is an Identifier, not a literal — not a grant, and
      // the bare `return` still stops the fall-through.
      `function f(t) { try { return isAuthorized(t); } catch (e) { return undefined; } }`,
      `function f(t, res) { try { assertAdmin(t); } catch (e) { return; } purge(); }`,
      `function f(t) { try { authenticate(t); } catch (e) { throw new Error('denied'); } purge(); }`,
      // Express / promise denial idioms that do not `return`.
      `function f(req, res) { try { assertAdmin(req); } catch (e) { res.status(403).end(); } purge(); }`,
      `function f(req, res, next) { try { requireAuth(req); } catch (e) { next(e); } purge(); }`,
      `function f(req, res) { try { authorize(req); } catch (e) { res.sendStatus(401); } purge(); }`,
      `function f(req) { try { checkPermission(req); } catch (e) { process.exit(1); } purge(); }`,
      `function f(req) { return new Promise((resolve, reject) => { try { verifyIdToken(req); } catch (e) { reject(e); } resolve(1); }); }`,
      // A loop body: `break`/`continue` skip the guarded work just as a
      // `return` would.
      `function f(xs) { for (const x of xs) { try { checkPermission(x); } catch (e) { break; } grant(x); } }`,
      `function f(xs) { for (const x of xs) { try { checkPermission(x); } catch (e) { continue; } grant(x); } }`,
      // `finally` that rethrows undoes the swallow.
      `function f(t) { try { assertAdmin(t); } catch (e) { log(e); } finally { throw e; } purge(); }`,
      // `finally` that returns, likewise — and the grant lives in the
      // finalizer, which is not a catch clause.
      `function f(t) { try { assertAdmin(t); } catch (e) { log(e); } finally { return true; } }`,
      // try/finally with no handler at all — there is no fail-open path.
      `function f(t) { try { assertAdmin(t); } finally { cleanup(); } purge(); }`,

      // ----------------------------------------------------------------
      // Nothing is gated on the swallow
      // ----------------------------------------------------------------
      // The try/catch is the tail of the function — the shape of a
      // fire-and-forget refresh or audit call, which auth SDKs swallow on
      // purpose.
      `async function f(s) { try { await validateSession(s); } catch (e) { log(e); } }`,
      // The try/catch is not in a block whose remaining statements we can see.
      `function f(t) { if (t) try { assertAdmin(t); } catch (e) { log(e); } }`,
    ],

    invalid: [
      // ----------------------------------------------------------------
      // Corpus fixtures that must report
      // ----------------------------------------------------------------
      {
        name: 'benchmarks/corpus/CWE-636/vulnerable/catch-returns-true.js',
        code: `
function isAuthorized(token) {
  try {
    return verifyToken(token).valid;
  } catch (err) {
    return true;
  }
}

function handleRequest(req, res) {
  if (!isAuthorized(req.headers.authorization)) {
    res.status(401).end();
    return;
  }
  res.json(loadAccountData(req.params.id));
}
`,
        errors: [{ messageId: 'failOpenReturn' as const }],
      },
      {
        name: 'benchmarks/corpus/CWE-636/vulnerable/empty-catch-continues.js',
        code: `
async function handleAdminAction(req, res) {
  let actor = null;
  try {
    actor = await assertAdmin(req.headers.authorization);
  } catch (err) {
    // ignore
  }

  await purgeTable(req.body.table);
  res.json({ ok: true, actor: actor && actor.id });
}
`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },

      // ----------------------------------------------------------------
      // Grants
      // ----------------------------------------------------------------
      {
        code: `function f(t) { try { return validateToken(t); } catch (e) { return 1; } }`,
        errors: [{ messageId: 'failOpenReturn' as const }],
      },
      {
        code: `function f(t) { try { return okta.verifyAccessToken(t); } catch (e) { return 'granted'; } }`,
        errors: [{ messageId: 'failOpenReturn' as const }],
      },
      // A grant wins over other control flow in the same handler.
      {
        code: `function f(t) { try { return isAuthenticated(t); } catch (e) { if (fatal(e)) throw e; return true; } }`,
        errors: [{ messageId: 'failOpenReturn' as const }],
      },

      // ----------------------------------------------------------------
      // Swallows
      // ----------------------------------------------------------------
      {
        code: `function f(t) { try { ensureAuthenticated(t); } catch (e) {} purge(); }`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
      // No catch parameter at all.
      {
        code: `function f(t) { try { hasPermission(t); } catch {} purge(); }`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
      // A `throw` inside a callback declared in the handler belongs to the
      // callback — the handler still swallows.
      {
        code: `function f(t, xs) { try { assertRole(t); } catch (e) { xs.forEach(function (x) { throw e; }); } purge(); }`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
      // Same for a `return`: it returns from the callback, not the handler.
      {
        code: `function f(t, xs) { try { assertRole(t); } catch (e) { xs.forEach(function (x) { return true; }); } purge(); }`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
      // A 2xx status is not a denial.
      {
        code: `function f(req, res) { try { assertAdmin(req); } catch (e) { res.status(200); } purge(); }`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
      // A non-literal status code decides nothing statically.
      {
        code: `function f(req, res, code) { try { assertAdmin(req); } catch (e) { res.status(code); } purge(); }`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
      // Top-level (Program body) rather than inside a function.
      {
        code: `try { requireAuth(token); } catch (e) { log(e); }\npurge();`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
      // Nested try inside a catch: the inner handler is judged on its own.
      {
        code: `function f(t) { try { g(); } catch (e) { try { assertPermission(t); } catch (e2) {} purge(); } }`,
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },

      // ----------------------------------------------------------------
      // Options
      // ----------------------------------------------------------------
      {
        code: `function f(t) { try { gateKeeper(t); } catch (e) {} purge(); }`,
        options: [{ securityDecisions: ['gateKeeper'] }],
        errors: [{ messageId: 'failOpenSwallow' as const }],
      },
    ],
  });
});
