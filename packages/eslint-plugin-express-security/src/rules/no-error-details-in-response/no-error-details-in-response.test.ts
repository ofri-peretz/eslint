import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noErrorDetailsInResponse } from './index';

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

describe('no-error-details-in-response', () => {
  ruleTester.run('no-error-details-in-response', noErrorDetailsInResponse, {
    valid: xp([
      // Benchmark corpus: CWE-209/safe/generic-error-response.js (FP-lock)
      {
        name: 'a correlation id to the client, the error to the log',
        code: `
// CWE-209: safe — generic client message, real error logged server-side
// This must NOT be flagged
// The client gets a correlation id and nothing else; the detail stays in the
// server log where only operators can read it.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.use((err, req, res, next) => {
  const incidentId = crypto.randomUUID();
  logger.error({ incidentId, err, path: req.path }, 'unhandled request error');
  res.status(500).json({ error: 'Internal Server Error', incidentId });
});

app.get('/reports/:id', async (req, res, next) => {
  try {
    res.json(await loadReport(req.params.id));
  } catch (err) {
    next(err);
  }
});

module.exports = app;
        `,
      },
      // Sanitized literal + server-side logging
      {
        code: `
          try { work(); } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Internal error' });
          }
        `,
      },
      // err.message with the default allowMessage: true
      {
        code: `
          try { work(); } catch (err) {
            res.status(400).json({ error: err.message });
          }
        `,
      },
      // No active error binding — nothing tracked
      { code: `res.send(err);` },
      { code: `app.get('/x', (req, res) => { res.send(req.query.q); });` },
      // Optional catch binding
      { code: `try { work(); } catch { res.status(500).send('failed'); }` },
      // Destructured catch param is not tracked
      { code: `try { work(); } catch ({ message }) { res.send('nope'); }` },
      // Non-error identifier sent from inside a catch
      { code: `try { work(); } catch (err) { res.send(safeBody); }` },
      // Non-stack/message member on the error
      {
        code: `try { work(); } catch (err) { res.status(500).json({ code: err.code }); }`,
      },
      // Member whose object is not the error
      {
        code: `try { work(); } catch (err) { res.json({ stack: data.stack }); }`,
      },
      // Spread of a non-error object
      { code: `try { work(); } catch (err) { res.json({ ...meta }); }` },
      // Sink is not a response object
      { code: `try { work(); } catch (err) { socket.end(err); }` },
      // Method is not send/json/end
      { code: `try { work(); } catch (err) { res.write(err.stack); }` },
      // Bare call / computed property / non-identifier chain root
      { code: `try { work(); } catch (err) { send(err); }` },
      { code: `try { work(); } catch (err) { res['send'](err); }` },
      { code: `try { work(); } catch (err) { foo().send(err); }` },
      // res.end() with no argument
      { code: `try { work(); } catch (err) { res.end(); }` },
      // Serialization wrapper (documented false negative)
      { code: `try { work(); } catch (err) { res.send(serialize(err)); }` },
      // Computed member on the error (documented false negative)
      { code: `try { work(); } catch (err) { res.send(err['stack']); }` },
      // Nested member chain — object is not a bare identifier
      { code: `try { work(); } catch (err) { res.send(err.inner.stack); }` },
      // allowInDev: guarded by a NODE_ENV check
      {
        code: `
          try { work(); } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
              res.status(500).send(err.stack);
            }
          }
        `,
        options: [{ allowInDev: true }],
      },
    ]),
    invalid: xp([
      // Benchmark corpus: CWE-209/vulnerable/error-object-in-json.js
      {
        name: 'the caught error serialised into the JSON response',
        code: `
// CWE-209: stack-trace exposure — the caught error is serialised into JSON
// This MUST be detected
// Driver errors carry query text, connection strings and hostnames; echoing
// the error object hands all of it to the caller.
const express = require('express');

const app = express();

app.post('/invoices', async (req, res) => {
  try {
    const invoice = await db.insertInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ error: err, message: err.message, stack: err.stack });
  }
});

module.exports = app;
        `,
        // err.message is allowed by default; { error: err } and err.stack are not
        errors: [
          { messageId: 'errorDetailsExposed' },
          { messageId: 'errorDetailsExposed' },
        ],
      },
      // Benchmark corpus: CWE-209/vulnerable/stack-in-response.js
      {
        code: `
// CWE-209: stack-trace exposure — err.stack written to the HTTP response
// This MUST be detected
// The stack reveals absolute paths, dependency versions and internal module
// layout — a free reconnaissance channel for an attacker.
const express = require('express');

const app = express();

app.use((err, req, res, next) => {
  res.status(500).send(err.stack);
});

app.get('/reports/:id', async (req, res, next) => {
  try {
    res.json(await loadReport(req.params.id));
  } catch (err) {
    res.status(500).send(err.stack);
  }
});

module.exports = app;
        `,
        errors: [
          { messageId: 'errorDetailsExposed' },
          { messageId: 'errorDetailsExposed' },
        ],
      },
      // Raw error object
      {
        code: `try { work(); } catch (err) { res.status(500).send(err); }`,
        errors: [
          {
            messageId: 'errorDetailsExposed',
            data: { detail: 'the raw error `err`' },
          },
        ],
      },
      // `error` binding name
      {
        code: `try { work(); } catch (error) { res.json(error); }`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // Spread of the caught error
      {
        code: `try { work(); } catch (err) { res.status(500).json({ ...err }); }`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // err.message under allowMessage: false — object property and direct arg
      {
        code: `try { work(); } catch (err) { res.json({ message: err.message }); }`,
        options: [{ allowMessage: false }],
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      {
        code: `try { work(); } catch (err) { res.send(err.message); }`,
        options: [{ allowMessage: false }],
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // Error-first callbacks: arrow, function expression, declaration
      {
        code: `fs.readFile(p, (err, data) => { res.status(500).send(err); });`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      {
        code: `fs.readFile(p, function (err) { res.send(err.stack); });`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      {
        code: `function handler(err, req, res, next) { res.status(500).send(err.stack); }`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // res.end with the stack
      {
        code: `try { work(); } catch (err) { res.end(err.stack); }`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // Deep builder chain
      {
        code: `try { work(); } catch (err) { res.status(500).type('txt').send(err.stack); }`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // response / reply aliases
      {
        code: `try { work(); } catch (err) { response.json(err); }`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      {
        code: `try { work(); } catch (err) { reply.send(err); }`,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
    ]),
  });
});

// ---------------------------------------------------------------------------
// Coverage wave: frame stack edges and option-branch combinations
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-error-details-in-response (coverage wave)',
  noErrorDetailsInResponse,
  {
    valid: xp([
      // Function with no params entered while no frames are active
      { code: `register(() => { done(); });` },
      // Destructured first param
      { code: `handle(({ code }) => { use(code); });` },
      // First param is not an error name
      { code: `list.map((item) => item.id);` },
      // Non-frame function exiting while an outer frame is active
      {
        code: `try { work(); } catch (err) { const f = (x) => x; use(f); }`,
      },
      // allowInDev: true with the guard on a direct-arg send
      {
        code: `
          fs.readFile(p, (err) => {
            if (process.env.NODE_ENV === 'development') { res.send(err); }
          });
        `,
        options: [{ allowInDev: true }],
      },
    ]),
    invalid: xp([
      // Nested frames: catch inside an error-first function — both bindings
      {
        code: `
          function cb(err) {
            try { work(); } catch (error) { res.send(error); }
            res.json(err);
          }
        `,
        errors: [
          { messageId: 'errorDetailsExposed' },
          { messageId: 'errorDetailsExposed' },
        ],
      },
      // allowInDev: true but no guard anywhere
      {
        code: `try { work(); } catch (err) { res.send(err.stack); }`,
        options: [{ allowInDev: true }],
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // allowInDev: true with an if-guard that does not mention NODE_ENV
      {
        code: `try { work(); } catch (err) { if (debug) { res.send(err.stack); } }`,
        options: [{ allowInDev: true }],
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // allowInDev default (false): a NODE_ENV guard does not suppress
      {
        code: `
          try { work(); } catch (err) {
            if (process.env.NODE_ENV !== 'production') { res.send(err.stack); }
          }
        `,
        errors: [{ messageId: 'errorDetailsExposed' }],
      },
      // Spread finding detail text
      {
        code: `try { work(); } catch (err) { res.json({ ...err, ok: false }); }`,
        errors: [
          {
            messageId: 'errorDetailsExposed',
            data: { detail: '`{ ...err }` (spread of the raw error)' },
          },
        ],
      },
      // stack detail text
      {
        code: `try { work(); } catch (err) { res.json({ trace: err.stack }); }`,
        errors: [
          { messageId: 'errorDetailsExposed', data: { detail: '`err.stack`' } },
        ],
      },
      // message detail text under allowMessage: false
      {
        code: `try { work(); } catch (err) { res.json({ m: err.message }); }`,
        options: [{ allowMessage: false }],
        errors: [
          {
            messageId: 'errorDetailsExposed',
            data: { detail: '`err.message`' },
          },
        ],
      },
    ]),
  },
);
