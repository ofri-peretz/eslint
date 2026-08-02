import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataInQuery } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-sensitive-data-in-query', () => {
  ruleTester.run('no-sensitive-data-in-query', noSensitiveDataInQuery, {
    valid: [
      // Benchmark corpus: CWE-598/safe/login-via-body-post.js (FP-lock)
      {
        code: `
// CWE-598: safe — the same secrets travel in a POST body
// This must NOT be flagged
// A request body is not logged by default, is not stored in browser history
// and never leaks through Referer.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 10 }));
app.use(express.json({ limit: '10kb' }));
const csrfProtection = csrf();

app.post('/login', csrfProtection, async (req, res) => {
  const { username, password } = req.body;

  const user = await authenticate(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.userId = user.id;
  res.json({ ok: true });
});

module.exports = app;
        `,
      },
      // Same names from req.body / req.params are fine
      { code: `const password = req.body.password;` },
      { code: `const token = req.params.token;` },
      { code: `const { password } = req.body;` },
      // Non-sensitive query fields
      { code: `const page = req.query.page;` },
      { code: `const { page, sort } = req.query;` },
      // Token-matching FP locks: substrings must not match
      { code: `const author = req.query.author;` },
      { code: `const authorId = req.query.authorId;` },
      { code: `const cardinality = req.query.cardinality;` },
      // Dedicated verification route with an allowlisted param
      {
        code: `
          app.get('/verify-email', async (req, res) => {
            const token = req.query.token;
            await verifyEmailToken(token);
            res.redirect('/verified');
          });
        `,
        options: [{ allowedParams: ['token'] }],
      },
      // extraPatterns configured but not matching
      {
        code: `const v = req.query.page;`,
        options: [{ extraPatterns: ['^internal_'] }],
      },
      // Names past MAX_PARAM_NAME_LENGTH skip extraPatterns entirely, so a
      // backtracking pattern from an inherited config has nothing to chew on.
      {
        code: `const v = req.query.${'a'.repeat(200)};`,
        options: [{ extraPatterns: ['^(a+)+$'] }],
      },
      // Not a query object
      { code: `const x = foo.query.password;` },
      { code: `const y = req.search.password;` },
      // Computed query access is not resolvable (documented false negative)
      { code: `const z = req.query[key];` },
      { code: `const w = req['query'].password;` },
    ],
    invalid: [
      // Benchmark corpus: CWE-598/vulnerable/login-via-query.js
      {
        code: `
// CWE-598: credentials in the query string of a GET request
// This MUST be detected
// Query strings land in access logs, proxy logs, browser history and the
// Referer header of every outbound link on the response page.
const express = require('express');

const app = express();

app.get('/login', async (req, res) => {
  const { username, password } = req.query;

  const user = await authenticate(username, password);
  if (!user) return res.status(401).send('Invalid credentials');

  req.session.userId = user.id;
  res.redirect('/dashboard');
});

module.exports = app;
        `,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'password' } },
        ],
      },
      // Benchmark corpus: CWE-598/vulnerable/token-in-query.js
      {
        code: `
// CWE-598: API token and one-time code carried in the query string
// This MUST be detected
const express = require('express');

const app = express();

app.get('/api/export', async (req, res) => {
  const apiToken = req.query.api_token;
  const otp = req.query.otp;

  if (!(await verifyToken(apiToken, otp))) {
    return res.sendStatus(403);
  }

  res.json(await exportAccountData(apiToken));
});

module.exports = app;
        `,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'api_token' } },
        ],
      },
      // Direct member reads
      {
        code: `const p = req.query.password;`,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'password' } },
        ],
      },
      {
        code: `const k = req.query.apiKey;`,
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      {
        code: `const k = req.query.api_key;`,
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      {
        code: `const t = req.query.access_token;`,
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      // Trivial plural of a default term
      {
        code: `const c = req.query.credentials;`,
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      // Computed string-literal access
      {
        code: `const s = req.query['secret'];`,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'secret' } },
        ],
      },
      // request / ctx aliases
      {
        code: `const s = request.query.ssn;`,
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      {
        code: `const a = ctx.query.auth;`,
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      // Destructuring: renamed and string-literal keys
      {
        code: `const { password: pw } = req.query;`,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'password' } },
        ],
      },
      {
        code: `const { 'api_key': k } = req.query;`,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'api_key' } },
        ],
      },
      // Multiple sensitive keys in one pattern
      {
        code: `const { username, password, token } = req.query;`,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'password' } },
          { messageId: 'sensitiveQueryParam', data: { name: 'token' } },
        ],
      },
      // sensitiveParams extension — single and multi-token terms
      {
        code: `const pin = req.query.pin;`,
        options: [{ sensitiveParams: ['pin'] }],
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      {
        code: `const sid = req.query.sessionId;`,
        options: [{ sensitiveParams: ['session_id'] }],
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      // extraPatterns regex match
      {
        code: `const x = req.query['x-private'];`,
        options: [{ extraPatterns: ['^x-'] }],
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      // allowedParams present but a different param is read
      {
        code: `const p = req.query.password;`,
        options: [{ allowedParams: ['token'] }],
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
      // Leading separator in the parameter name
      {
        code: `const t = req.query._token;`,
        errors: [{ messageId: 'sensitiveQueryParam' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Coverage wave: destructuring edges and matcher fall-through branches
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-sensitive-data-in-query (coverage wave)',
  noSensitiveDataInQuery,
  {
    valid: [
      // VariableDeclarator: id is a plain identifier (not a pattern)
      { code: `const q = req.query;` },
      // VariableDeclarator: array pattern
      { code: `const [first] = items;` },
      // ObjectPattern with no init (for-of declaration)
      { code: `for (const { password } of accounts) { use(password); }` },
      // Init is not a member expression
      { code: `const { password } = getBody();` },
      // Rest element inside the pattern
      { code: `const { ...rest } = req.query;` },
      // Computed destructuring key
      { code: `const { [key]: v } = req.query;` },
      // Numeric-literal destructuring key
      { code: `const { 0: z } = req.query;` },
      // Numeric-literal computed member access
      { code: `const n = req.query[0];` },
      // Multi-token term partially matching then failing
      { code: `const v = req.query.api_version;` },
      // Name shorter than a multi-token term
      { code: `const a = req.query.api;` },
      // Computed member with an Identifier property on <req>.query object
      { code: `req.query[dynamicKey] = 1;` },
      // Deep member chain — query object root is not a bare identifier
      { code: `const v = app.locals.query.password;` },
      // Private-identifier property is never a query read
      {
        code: `class C { #query = {}; check(req) { return req.#query.password; } }`,
      },
    ],
    invalid: [
      // Sensitive read used as a call argument (expression position)
      {
        code: `lookup(req.query.card);`,
        errors: [{ messageId: 'sensitiveQueryParam', data: { name: 'card' } }],
      },
      // camelCase multi-token default: apiKey embedded in a longer name
      {
        code: `const k = req.query.serviceApiKey;`,
        errors: [
          { messageId: 'sensitiveQueryParam', data: { name: 'serviceApiKey' } },
        ],
      },
    ],
  },
);
