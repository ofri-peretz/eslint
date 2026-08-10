import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireCaseInsensitivePathGuard } from './index';

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

describe('require-case-insensitive-path-guard', () => {
  ruleTester.run(
    'require-case-insensitive-path-guard',
    requireCaseInsensitivePathGuard,
    {
      valid: xp([
        // Normalized before comparing — the canonical safe pattern
        { code: `if (req.path.toLowerCase().startsWith('/admin')) deny();` },
        { code: `if (req.url.toUpperCase() === '/ADMIN') deny();` },
        // Regex guard already case-insensitive
        { code: `if (req.path.match(/^\\/admin/i)) deny();` },
        // Route REGISTRATION is routing, not guarding — never flagged
        { code: `app.get('/admin', handler);` },
        { code: `app.use('/admin/users', adminRouter);` },
        // Non-protected paths are not flagged by default
        { code: `if (req.path.startsWith('/health')) skip();` },
        { code: `if (req.path === '/healthz') skip();` },
        { code: `if (req.path.match(/^\\/health/)) skip();` },
        // Comparisons that are not path guards
        { code: `if (req.user.role !== 'admin') deny();` },
        { code: `if (role === 'admin') deny();` },
        // Indirect via a variable — documented false negative (no data-flow)
        { code: `const p = req.path; if (p.startsWith('/admin')) deny();` },
        // Non-string comparisons
        { code: `if (req.path === other) deny();` },
        { code: `if (req.url.startsWith(prefix)) deny();` },
        // Corpus FP-lock: CWE-178/safe/normalized-path-guard.js (verbatim)
        {
          code: `
// CWE-178: safe — path normalized to lower case before the prefix check
// This must NOT be flagged
// Guard and router now agree on case, so '/Admin/users' is gated exactly the
// same way the lower-case spelling is.
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const ADMIN_PREFIX = '/admin/';

const app = express();
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.use((req, res, next) => {
  const normalizedPath = req.path.toLowerCase();
  if (normalizedPath.startsWith(ADMIN_PREFIX)) {
    if (!req.user || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
  }
  next();
});

app.get(/^\\/admin\\/users$/i, async (req, res) => {
  res.json(await listAllUsers());
});

module.exports = app;
        `,
        },
      ]),
      invalid: xp([
        // REGRESSION: manual `'...'` quoting emitted invalid JS when the
        // rewritten literal itself contained a quote.
        {
          code: `if (req.path.startsWith("/Parent's/Admin")) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().startsWith("/parent's/admin")) deny();`,
                },
              ],
            },
          ],
        },
        // Prefix guard — the classic bypass
        {
          code: `if (req.path.startsWith('/admin')) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().startsWith('/admin')) deny();`,
                },
              ],
            },
          ],
        },
        // Equality guards, all four operators
        {
          code: `if (req.url === '/admin') deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.url.toLowerCase() === '/admin') deny();`,
                },
              ],
            },
          ],
        },
        {
          code: `if (req.url == '/admin') deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.url.toLowerCase() == '/admin') deny();`,
                },
              ],
            },
          ],
        },
        {
          code: `if (req.path !== '/admin') next();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase() !== '/admin') next();`,
                },
              ],
            },
          ],
        },
        {
          code: `if (req.path != '/admin') next();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase() != '/admin') next();`,
                },
              ],
            },
          ],
        },
        // Literal on the left, path on the right
        {
          code: `if ('/admin' === req.originalUrl) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if ('/admin' === req.originalUrl.toLowerCase()) deny();`,
                },
              ],
            },
          ],
        },
        // indexOf / includes / endsWith guards
        {
          code: `if (req.path.indexOf('/admin') === 0) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().indexOf('/admin') === 0) deny();`,
                },
              ],
            },
          ],
        },
        {
          code: `if (req.url.includes('/internal')) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.url.toLowerCase().includes('/internal')) deny();`,
                },
              ],
            },
          ],
        },
        {
          code: `if (req.path.endsWith('/private')) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().endsWith('/private')) deny();`,
                },
              ],
            },
          ],
        },
        // match with a string argument (implicit case-sensitive RegExp)
        {
          code: `if (req.path.match('/dashboard')) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().match('/dashboard')) deny();`,
                },
              ],
            },
          ],
        },
        // match with a regex literal lacking the i flag — suggestion adds it
        {
          code: `if (req.path.match(/^\\/admin/)) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addIgnoreCaseFlag',
                  output: `if (req.path.match(/^\\/admin/i)) deny();`,
                },
              ],
            },
          ],
        },
        // Multi-segment protected path, literal already lower-case → untouched
        {
          code: `if (req.path.startsWith('/api/internal')) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().startsWith('/api/internal')) deny();`,
                },
              ],
            },
          ],
        },
        // Mixed-case literal → suggestion also lower-cases the literal
        {
          code: `if (req.url === '/Admin') deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.url.toLowerCase() === '/admin') deny();`,
                },
              ],
            },
          ],
        },
        // request alias + originalUrl
        {
          code: `if (request.originalUrl.startsWith('/dashboard')) deny();`,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (request.originalUrl.toLowerCase().startsWith('/dashboard')) deny();`,
                },
              ],
            },
          ],
        },
        // Corpus: CWE-178/vulnerable/case-sensitive-admin-guard.js (verbatim)
        {
          code: `
// CWE-178: case-sensitive guard in front of a case-insensitive route
// This MUST be detected
// The guard only sees '/admin', but the route regex has the 'i' flag, so
// GET /Admin/users reaches the handler with no authorization check at all.
const express = require('express');

const app = express();

app.use((req, res, next) => {
  if (req.path.startsWith('/admin')) {
    if (!req.user || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
  }
  next();
});

app.get(/^\\/admin\\/users$/i, async (req, res) => {
  res.json(await listAllUsers());
});

module.exports = app;
        `,
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `
// CWE-178: case-sensitive guard in front of a case-insensitive route
// This MUST be detected
// The guard only sees '/admin', but the route regex has the 'i' flag, so
// GET /Admin/users reaches the handler with no authorization check at all.
const express = require('express');

const app = express();

app.use((req, res, next) => {
  if (req.path.toLowerCase().startsWith('/admin')) {
    if (!req.user || req.user.role !== 'admin') {
      return res.sendStatus(403);
    }
  }
  next();
});

app.get(/^\\/admin\\/users$/i, async (req, res) => {
  res.json(await listAllUsers());
});

module.exports = app;
        `,
                },
              ],
            },
          ],
        },
      ]),
    },
  );

  // Options: protectedPaths replaces the default pattern set
  ruleTester.run(
    'require-case-insensitive-path-guard (protectedPaths option)',
    requireCaseInsensitivePathGuard,
    {
      valid: xp([
        // '/admin' no longer protected once the set is replaced
        {
          code: `if (req.path.startsWith('/admin')) deny();`,
          options: [{ protectedPaths: ['secret'] }],
        },
      ]),
      invalid: xp([
        {
          code: `if (req.path.startsWith('/secret')) deny();`,
          options: [{ protectedPaths: ['secret'] }],
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().startsWith('/secret')) deny();`,
                },
              ],
            },
          ],
        },
      ]),
    },
  );

  // Options: checkAllPaths flags every case-sensitive path guard
  ruleTester.run(
    'require-case-insensitive-path-guard (checkAllPaths option)',
    requireCaseInsensitivePathGuard,
    {
      valid: xp([
        // Normalized guards stay valid even with checkAllPaths
        {
          code: `if (req.path.toLowerCase().startsWith('/health')) skip();`,
          options: [{ checkAllPaths: true }],
        },
        {
          code: `if (req.path.match(/^\\/health/i)) skip();`,
          options: [{ checkAllPaths: true }],
        },
      ]),
      invalid: xp([
        {
          code: `if (req.path.startsWith('/health')) skip();`,
          options: [{ checkAllPaths: true }],
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase().startsWith('/health')) skip();`,
                },
              ],
            },
          ],
        },
        {
          code: `if (req.path === '/status') skip();`,
          options: [{ checkAllPaths: true }],
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addToLowerCase',
                  output: `if (req.path.toLowerCase() === '/status') skip();`,
                },
              ],
            },
          ],
        },
        {
          code: `if (req.path.match(/^\\/health/)) skip();`,
          options: [{ checkAllPaths: true }],
          errors: [
            {
              messageId: 'caseSensitivePathGuard',
              suggestions: [
                {
                  messageId: 'addIgnoreCaseFlag',
                  output: `if (req.path.match(/^\\/health/i)) skip();`,
                },
              ],
            },
          ],
        },
      ]),
    },
  );
});
