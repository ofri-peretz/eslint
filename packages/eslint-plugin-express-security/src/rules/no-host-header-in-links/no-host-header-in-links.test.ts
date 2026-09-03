import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHostHeaderInLinks } from './index';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving the `express`
// binding. Several fixtures already declare `const express = require('express')`
// at module level, and a default import would redeclare it.
const asExpress = (code: string): string => `import 'express';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const xp = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string' ? { output: asExpress(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asExpress(s.output) }
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

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-host-header-in-links', () => {
  ruleTester.run('no-host-header-in-links', noHostHeaderInLinks, {
    valid: xp([
      // Benchmark corpus: CWE-640/safe/reset-link-config-origin.js (FP-lock)
      {
        name: 'the origin comes from server-side config',
        code: `
// CWE-640: safe — reset link origin comes from server-side config
// This must NOT be flagged
// The public origin is a deployment constant. No request header participates
// in building the link, so a poisoned Host cannot redirect the token.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const nodemailer = require('nodemailer');

const PUBLIC_ORIGIN = process.env.PUBLIC_ORIGIN || 'https://app.example.com';

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 20 }));
app.use(express.json({ limit: '10kb' }));
const csrfProtection = csrf();

const mailer = nodemailer.createTransport({ sendmail: true });

app.post('/forgot-password', csrfProtection, async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  const token = await createResetToken(user.id);
  const resetUrl = PUBLIC_ORIGIN + '/reset?token=' + encodeURIComponent(token);

  await mailer.sendMail({
    to: user.email,
    subject: 'Reset your password',
    text: 'Reset here: ' + resetUrl,
  });

  res.sendStatus(202);
});

module.exports = app;
        `,
      },
      // URL built from config, not headers
      { code: `const url = 'https://' + config.host + '/reset';` },
      // Host used only for logging — no URL marker, not a mail callee
      { code: `console.log('incoming host: ' + req.headers.host);` },
      {
        code: 'const line = `host: ${req.headers.host}`;',
      },
      // Untracked identifier in a URL concat
      { code: `const u = 'https://' + someHost + '/x';` },
      // Header read that is not a host header
      { code: `const u = 'https://' + req.headers.cookie;` },
      { code: `const u = 'https://' + req.get('accept');` },
      // Root object is not a request identifier
      { code: `const u = 'https://' + server.headers.host;` },
      // Guard against a trusted host via allowedHosts
      {
        code: `
          const host = req.headers.host;
          if (host === 'app.example.com') {
            const u = 'https://' + host + '/reset';
          }
        `,
        options: [{ allowedHosts: ['app.example.com'] }],
      },
      // Non-mail identifier callee, no URL marker
      { code: `notify('host ' + req.headers.host);` },
    ]),
    invalid: xp([
      // Was pinned as valid because the callee property was computed.
      // `obj['send']` is the same mail-ish sink as `obj.send`.
      { name: 'was pinned as valid because the callee property was computed', code: `obj['send']('host: ' + req.headers.host);`, errors: [{ messageId: 'hostHeaderInLink' }] },
      // Benchmark corpus: CWE-640/vulnerable/reset-link-host-header.js
      {
        name: 'a password-reset link built from req.headers.host',
        code: `
// CWE-640: host-header poisoning — password-reset link built from req.headers.host
// This MUST be detected
// An attacker sends a reset request with Host: evil.example and receives a
// mail whose reset link points at their own server, leaking the token.
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const transport = nodemailer.createTransport({ sendmail: true });

app.post('/forgot-password', async (req, res) => {
  const user = await findUserByEmail(req.body.email);
  const token = await createResetToken(user.id);

  const resetUrl = 'https://' + req.headers.host + '/reset?token=' + token;

  await transport.sendMail({
    to: user.email,
    subject: 'Reset your password',
    html: '<a href="' + resetUrl + '">Reset your password</a>',
  });

  res.sendStatus(202);
});

module.exports = app;
        `,
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Benchmark corpus: CWE-640/vulnerable/reset-link-forwarded-host.js
      {
        code: `
// CWE-640: host-header poisoning — reset origin from X-Forwarded-Host
// This MUST be detected
// X-Forwarded-Host is set by the client on any request that reaches the app
// directly, so the mailed reset origin is fully attacker-controlled.
const express = require('express');
const nodemailer = require('nodemailer');

const app = express();
const mailer = nodemailer.createTransport({ sendmail: true });

app.post('/account/recover', async (req, res) => {
  const origin = req.headers['x-forwarded-host'] || req.headers.host;
  const token = await createResetToken(req.body.userId);

  await mailer.sendMail({
    to: req.body.email,
    subject: 'Account recovery',
    text: 'Recover here: https://' + origin + '/recover/' + token,
  });

  res.json({ sent: true });
});

module.exports = app;
        `,
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Template literal URL building
      {
        code: 'const u = `https://${req.headers.host}/reset?token=${token}`;',
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // req.get('host')
      {
        code: `const u = 'https://' + req.get('host') + '/verify';`,
        errors: [
          {
            messageId: 'hostHeaderInLink',
            data: { source: "req.get('host')" },
          },
        ],
      },
      // req.header('X-Forwarded-Host') — case-insensitive header name
      {
        code: `const u = 'https://' + req.header('X-Forwarded-Host');`,
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Protocol-relative URL
      {
        code: `const u = '//' + req.headers.host + '/cb';`,
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Mail-send sink without an explicit protocol marker
      {
        code: `transporter.sendMail({ text: 'Verify: ' + req.headers.host + '/v/' + token });`,
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Custom mail callee (plain identifier call)
      {
        code: `deliver('Visit ' + req.headers.host + '/welcome');`,
        options: [{ checkMailCallees: ['deliver'] }],
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Tracked variable flowing into a template literal
      {
        code: [
          `const origin = req.get('host');`,
          'const link = `https://${origin}/reset`;',
        ].join('\n'),
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // allowedHosts configured but no matching guard present
      {
        code: `
          if (ready) {
            const u = 'https://' + req.headers.host + '/reset';
          }
        `,
        options: [{ allowedHosts: ['trusted.example'] }],
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // request / ctx aliases, computed 'host' access
      {
        code: `const u = 'https://' + request.headers.host;`,
        errors: [
          {
            messageId: 'hostHeaderInLink',
            data: { source: "req.headers['host']" },
          },
        ],
      },
      {
        code: "const u = `https://${ctx.headers['host']}/x`;",
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Nullish-coalescing taint (left side)
      {
        code: [
          `const h = req.headers.host ?? 'fallback.example';`,
          `const u = 'https://' + h + '/x';`,
        ].join('\n'),
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
      // Logical-or taint (right side)
      {
        code: [
          `const h = cfg.host || req.headers.host;`,
          `const u = 'https://' + h;`,
        ].join('\n'),
        errors: [{ messageId: 'hostHeaderInLink' }],
      },
    ]),
  });
});

// ---------------------------------------------------------------------------
// Coverage wave: exhaustive branch coverage for helper predicates
// ---------------------------------------------------------------------------
ruleTester.run('no-host-header-in-links (coverage wave)', noHostHeaderInLinks, {
  valid: xp([
    // Non-'+' binary operator
    { code: `const n = 1 - 2;` },
    // '+' with numeric literals only (non-string Literal operand)
    { code: `const n = 1 + 2;` },
    // '+' chain nested under a non-'+' parent binary expression
    { code: `const z = ('a' + b) - c;` },
    // VariableDeclarator: destructured id (not an Identifier)
    { code: `const { host } = req.headers;` },
    // VariableDeclarator: no init
    { code: `let pending;` },
    // VariableDeclarator: init is not a host read
    { code: `const y = 5;` },
    // Call: no arguments
    { code: `const u = 'https://' + req.get();` },
    // Call: non-literal header-name argument
    { code: `const u = 'https://' + req.get(headerName);` },
    // Call: object is not a request identifier
    { code: `const u = 'https://' + mail.get('host');` },
    // Call: method is not a header getter
    { code: `const u = 'https://' + req.fetch('host');` },
    // Call: callee is not a member expression
    { code: `const u = 'https://' + lookup('host');` },
    // Call: callee object is itself a member expression
    { code: `const u = 'https://' + req.api.get('host');` },
    // Call: non-string literal header-name argument
    { code: `const u = 'https://' + req.get(0);` },
    // Member: computed numeric-literal property on headers
    { code: `const u = 'https://' + req.headers[0];` },
    // Member: computed non-literal property on headers
    { code: `const u = 'https://' + req.headers[name];` },
    // Member: object chain root is not an identifier
    { code: `const u = 'https://' + a.b.headers.host;` },
    // Member: 'headers' is not the property
    { code: `const u = 'https://' + req.rawHeaders.host;` },
    // Template literal with no host expression
    { code: 'const u = `https://${domain}/x`;' },
    // Template with host expression, no URL marker, inside a non-mail call
    { code: 'log(`host ${req.headers.host}`);' },
    // allowedHosts guard on a template-literal use
    {
      code: [
        `const host = req.get('host');`,
        `if (host === 'app.example.com') { send(\`https://\${host}/x\`); }`,
      ].join('\n'),
      options: [{ allowedHosts: ['app.example.com'] }],
    },
  ]),
  invalid: xp([
    // Was pinned as valid because the callee property was computed.
    // `req['get']('host')` reads the same header as `req.get('host')`.
    { name: 'was pinned as valid because the callee property was computed', code: `const u = 'https://' + req['get']('host');`, errors: [{ messageId: 'hostHeaderInLink' }] },
    // Was pinned as valid — a bracket on the request bag read as
    // unresolvable, in places labelled a "documented false negative".
    // `req['headers']` is the same bag as `req.headers`; the runtime-keyed
    // form left above is the genuine refusal.
    { name: 'was pinned as valid — a bracket on the request bag read as unresolvable,', code: `const u = 'https://' + req['headers'].host;`, errors: [{ messageId: 'hostHeaderInLink' }] },
    // Direct host read as a mail-call argument via member callee
    {
      code: 'mailer.send(`link: ${req.headers.host}/go`);',
      errors: [{ messageId: 'hostHeaderInLink' }],
    },
    // allowedHosts guard exists but tests a different literal
    {
      code: [
        `const host = req.headers.host;`,
        `if (host === 'evil.example') {`,
        `  const u = 'https://' + host + '/reset';`,
        `}`,
      ].join('\n'),
      options: [{ allowedHosts: ['app.example.com'] }],
      errors: [{ messageId: 'hostHeaderInLink' }],
    },
    // Whole-source description for a tracked x-forwarded-host variable
    {
      code: [
        `const fwd = req.headers['x-forwarded-host'];`,
        `const u = '//' + fwd;`,
      ].join('\n'),
      errors: [
        {
          messageId: 'hostHeaderInLink',
          data: { source: "req.headers['x-forwarded-host']" },
        },
      ],
    },
  ]),
});
