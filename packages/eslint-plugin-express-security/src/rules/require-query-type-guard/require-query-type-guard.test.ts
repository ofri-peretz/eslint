import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireQueryTypeGuard } from './index';

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

describe('require-query-type-guard', () => {
  ruleTester.run('require-query-type-guard', requireQueryTypeGuard, {
    valid: xp([
      // Coerced at the source — String() init is never tracked
      { code: `const name = String(req.query.name); name.replace(/x/g, '');` },
      // Inline typeof guard on the member itself
      {
        code: `typeof req.query.name === 'string' && req.query.name.replace(/x/g, '');`,
      },
      // typeof guard in an if-block
      {
        code: `
          function handler(req, res) {
            const q = req.query.term;
            if (typeof q !== 'string') return res.sendStatus(400);
            res.json(q.trim());
          }
        `,
      },
      // Array.isArray guard
      {
        code: `
          function handler(req, res) {
            const raw = req.query.name;
            if (Array.isArray(raw)) return res.sendStatus(400);
            res.json(raw.split(','));
          }
        `,
      },
      // Array.isArray guard directly on the member
      {
        code: `
          if (!Array.isArray(req.query.tags)) {
            req.query.tags.split(',');
          }
        `,
      },
      // Validator results are type-safe sources (default: parse / safeParse)
      { code: `const name = schema.parse(req.query).name; name.trim();` },
      { code: `let v = req.query.q; v = schema.parse(v); v.trim();` },
      { code: `let v = req.query.q; v = String(v); v.toLowerCase();` },
      // String methods on non-query values
      { code: `path.split('/');` },
      { code: `req.params.id.trim();` },
      { code: `req.body.name.replace(/x/g, '');` },
      // Identifier never assigned from req.query
      { code: `const term = sanitize(input); term.trim();` },
      // Reversed typeof operand order
      {
        code: `'string' === typeof req.query.sort && req.query.sort.toLowerCase();`,
      },
      // Corpus FP-lock: CWE-843/safe/guarded-query-type.js (verbatim)
      {
        code: `
// CWE-843: safe — the query value is type-checked before use
// This must NOT be flagged
// Arrays and objects are rejected up front, so everything downstream sees a
// string and nothing else.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.get('/search', async (req, res) => {
  const raw = req.query.name;
  if (Array.isArray(raw) || typeof raw !== 'string') {
    return res.status(400).json({ error: 'name must be a single string value' });
  }

  const term = raw.replace(/[^a-z0-9 ]/gi, '').toLowerCase();
  res.json(await searchProducts(term));
});

module.exports = app;
        `,
      },
    ]),
    invalid: xp([
      // Direct member call — the classic shape, with String() suggestion
      {
        code: `req.query.name.replace(/x/g, '');`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.name).replace(/x/g, '');`,
              },
            ],
          },
        ],
      },
      // Computed member access
      {
        code: `req.query['x'].trim();`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query['x']).trim();`,
              },
            ],
          },
        ],
      },
      // Identifier assigned from a raw query member — coerce-at-assignment suggestion
      {
        code: `const term = req.query.name; term.trim();`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `const term = String(req.query.name); term.trim();`,
              },
            ],
          },
        ],
      },
      // A sample of the other string methods
      {
        code: `req.query.sort.toLowerCase();`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.sort).toLowerCase();`,
              },
            ],
          },
        ],
      },
      {
        code: `req.query.page.startsWith('1');`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.page).startsWith('1');`,
              },
            ],
          },
        ],
      },
      {
        code: `req.query.range.substring(0, 2);`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.range).substring(0, 2);`,
              },
            ],
          },
        ],
      },
      {
        code: `req.query.csv.slice(1);`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.csv).slice(1);`,
              },
            ],
          },
        ],
      },
      {
        code: `req.query.pattern.match(/abc/);`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.pattern).match(/abc/);`,
              },
            ],
          },
        ],
      },
      {
        code: `request.query.term.endsWith('!');`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(request.query.term).endsWith('!');`,
              },
            ],
          },
        ],
      },
      {
        code: `req.query.list.includes('a');`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.list).includes('a');`,
              },
            ],
          },
        ],
      },
      {
        code: `req.query.raw.toUpperCase();`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `String(req.query.raw).toUpperCase();`,
              },
            ],
          },
        ],
      },
      // Guard on a DIFFERENT property does not clear this one
      {
        code: `typeof req.query.a === 'string' && req.query.b.trim();`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `typeof req.query.a === 'string' && String(req.query.b).trim();`,
              },
            ],
          },
        ],
      },
      // Guard on a different identifier does not clear this one
      {
        code: `
          const a = req.query.a;
          const b = req.query.b;
          if (typeof a === 'string') { b.trim(); }
        `,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `
          const a = req.query.a;
          const b = String(req.query.b);
          if (typeof a === 'string') { b.trim(); }
        `,
              },
            ],
          },
        ],
      },
      // Reassignment through an UNKNOWN call is not a coercion
      {
        code: `let v = req.query.q; v = transform(v); v.trim();`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `let v = String(req.query.q); v = transform(v); v.trim();`,
              },
            ],
          },
        ],
      },
      // Tracked variable used inside a nested closure
      {
        code: `
          function handler(req, res) {
            const status = req.query.status;
            return items.map((o) => status.trim());
          }
        `,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `
          function handler(req, res) {
            const status = String(req.query.status);
            return items.map((o) => status.trim());
          }
        `,
              },
            ],
          },
        ],
      },
      // Assignment (not declaration) from a query member
      {
        code: `let q; q = req.query.filter; q.split(',');`,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `let q; q = String(req.query.filter); q.split(',');`,
              },
            ],
          },
        ],
      },
      // Corpus: CWE-843/vulnerable/query-string-methods.js (verbatim)
      {
        code: `
// CWE-843: req.query type confusion — string method on an unguarded query value
// This MUST be detected
// Express parses ?name=a&name=b into an array, so .replace throws (DoS) and
// ?name[$ne]= produces an object that flows straight into the query layer.
const express = require('express');

const app = express();

app.get('/search', async (req, res) => {
  const term = req.query.name.replace(/[^a-z0-9 ]/gi, '');
  const results = await searchProducts(term.toLowerCase());
  res.json(results);
});

module.exports = app;
        `,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'wrapString',
                output: `
// CWE-843: req.query type confusion — string method on an unguarded query value
// This MUST be detected
// Express parses ?name=a&name=b into an array, so .replace throws (DoS) and
// ?name[$ne]= produces an object that flows straight into the query layer.
const express = require('express');

const app = express();

app.get('/search', async (req, res) => {
  const term = String(req.query.name).replace(/[^a-z0-9 ]/gi, '');
  const results = await searchProducts(term.toLowerCase());
  res.json(results);
});

module.exports = app;
        `,
              },
            ],
          },
        ],
      },
      // Corpus: CWE-843/vulnerable/query-object-spread.js (verbatim)
      {
        code: `
// CWE-843: req.query type confusion — object-valued query used as a scalar
// This MUST be detected
const express = require('express');

const app = express();

app.get('/orders', async (req, res) => {
  const status = req.query.status;
  const orders = await db.orders.find({ status, ownerId: req.user.id });
  res.json(orders.map((o) => ({ ...o, status: status.trim() })));
});

module.exports = app;
        `,
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `
// CWE-843: req.query type confusion — object-valued query used as a scalar
// This MUST be detected
const express = require('express');

const app = express();

app.get('/orders', async (req, res) => {
  const status = String(req.query.status);
  const orders = await db.orders.find({ status, ownerId: req.user.id });
  res.json(orders.map((o) => ({ ...o, status: status.trim() })));
});

module.exports = app;
        `,
              },
            ],
          },
        ],
      },
    ]),
  });

  // Options: custom coercers / validators
  ruleTester.run('require-query-type-guard (options)', requireQueryTypeGuard, {
    valid: xp([
      // Custom coercer accepted in a reassignment
      {
        code: `let v = req.query.q; v = toStr(v); v.trim();`,
        options: [{ coercers: ['toStr'] }],
      },
      // Custom validator method accepted in a reassignment
      {
        code: `let v = req.query.q; v = check.validate(v); v.trim();`,
        options: [{ validators: ['validate'] }],
      },
      // Bare validator call
      {
        code: `let v = req.query.q; v = validate(v); v.trim();`,
        options: [{ validators: ['validate'] }],
      },
    ]),
    invalid: xp([
      // Replacing coercers drops the String default
      {
        code: `let v = req.query.q; v = String(v); v.trim();`,
        options: [{ coercers: ['toStr'] }],
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `let v = String(req.query.q); v = String(v); v.trim();`,
              },
            ],
          },
        ],
      },
      // Replacing validators drops the parse default
      {
        code: `let v = req.query.q; v = schema.parse(v); v.trim();`,
        options: [{ validators: ['validate'] }],
        errors: [
          {
            messageId: 'unguardedQueryStringMethod',
            suggestions: [
              {
                messageId: 'coerceAtAssignment',
                output: `let v = String(req.query.q); v = schema.parse(v); v.trim();`,
              },
            ],
          },
        ],
      },
    ]),
  });
});
