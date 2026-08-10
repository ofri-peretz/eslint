import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noStaticRootExposure } from './index';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
const asExpress = (code: string): string => `import express from 'express';\n${code}`;
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

describe('no-static-root-exposure', () => {
  ruleTester.run('no-static-root-exposure', noStaticRootExposure, {
    valid: xp([
      // THE safe pattern (corpus FP-lock: CWE-548/safe/static-public-dir.js)
      {
        code: `
          const express = require('express');
          const helmet = require('helmet');
          const rateLimit = require('express-rate-limit');
          const path = require('path');

          const app = express();
          app.use(helmet());
          app.use(rateLimit({ windowMs: 60000, max: 100 }));

          app.use(
            express.static(path.join(__dirname, 'public'), {
              index: 'index.html',
              dotfiles: 'ignore',
            }),
          );

          module.exports = app;
        `,
      },
      // Allowlisted roots — bare literal and joined
      { code: `express.static('public');` },
      { code: `express.static('./public');` },
      { code: `express.static(path.join(__dirname, 'public'));` },
      { code: `express.static(path.join(__dirname, 'static'));` },
      { code: `express.static(path.join(__dirname, 'dist'));` },
      { code: `express.static(path.join(__dirname, 'build'));` },
      { code: `express.static(path.join(__dirname, 'assets'));` },
      // Nested inside an allowlisted root
      { code: `express.static(path.join(__dirname, 'public', 'img'));` },
      { code: `express.static('public/img');` },
      // process.cwd() as an anchor with an allowlisted subdirectory
      { code: `express.static(path.join(process.cwd(), 'public'));` },
      // path.resolve() with an allowlisted subdirectory
      { code: `express.static(path.resolve(__dirname, 'public'));` },
      // Custom allowlist
      {
        code: `express.static(path.join(__dirname, 'www'));`,
        options: [{ allowedRoots: ['www'] }],
      },
      { code: `express.static('www');`, options: [{ allowedRoots: ['www'] }] },
      // Not express.static at all
      { code: `express.json();` },
      { code: `fastify.static('.');` },
      { code: `app.use(express.static(path.join(__dirname, 'public')));` },
    ]),
    invalid: xp([
      // Corpus fixture (verbatim): CWE-548/vulnerable/static-root-dirname.js
      {
        code: `
          const express = require('express');

          const app = express();

          app.use(express.static(__dirname));

          app.get('/health', (req, res) => res.send('ok'));

          module.exports = app;
        `,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: '__dirname' },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `
          const express = require('express');

          const app = express();

          app.use(express.static(path.join(__dirname, 'public')));

          app.get('/health', (req, res) => res.send('ok'));

          module.exports = app;
        `,
              },
            ],
          },
        ],
      },
      // Corpus fixture (verbatim): CWE-548/vulnerable/serve-index-root.js
      {
        code: `
          const express = require('express');
          const serveIndex = require('serve-index');

          const app = express();

          app.use(express.static(__dirname));
          app.use(serveIndex('/', { icons: true }));

          module.exports = app;
        `,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: '__dirname' },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `
          const express = require('express');
          const serveIndex = require('serve-index');

          const app = express();

          app.use(express.static(path.join(__dirname, 'public')));
          app.use(serveIndex('/', { icons: true }));

          module.exports = app;
        `,
              },
            ],
          },
          { messageId: 'directoryListing' },
        ],
      },
      // __dirname directly — with the scoping suggestion
      {
        code: `express.static(__dirname);`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: '__dirname' },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // '.' and '..' literals
      {
        code: `express.static('.');`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: "'.'" },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      {
        code: `express.static('..');`,
        errors: [{ messageId: 'traversalSegments' }],
      },
      // process.cwd()
      {
        code: `express.static(process.cwd());`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: 'process.cwd()' },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // path.join(__dirname) — anchors only, no subdirectory
      {
        code: `express.static(path.join(__dirname));`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: 'path.join(__dirname)' },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // path.join with '..' segments
      {
        code: `express.static(path.join(__dirname, '..', 'shared'));`,
        errors: [{ messageId: 'traversalSegments' }],
      },
      {
        code: `express.static(path.join(__dirname, '../secrets'));`,
        errors: [{ messageId: 'traversalSegments' }],
      },
      // path.join with a non-literal segment
      {
        code: `express.static(path.join(__dirname, dir));`,
        errors: [{ messageId: 'nonLiteralPath' }],
      },
      // Non-allowlisted directory
      {
        code: `express.static(path.join(__dirname, 'www'));`,
        errors: [{ messageId: 'unknownRoot', data: { root: 'www' } }],
      },
      {
        code: `express.static('secret-files');`,
        errors: [{ messageId: 'unknownRoot', data: { root: 'secret-files' } }],
      },
      // Custom allowlist replaces the default set
      {
        code: `express.static(path.join(__dirname, 'public'));`,
        options: [{ allowedRoots: ['www'] }],
        errors: [{ messageId: 'unknownRoot', data: { root: 'public' } }],
      },
      // A configured root containing a quote must not break the emitted source
      {
        code: `express.static(__dirname);`,
        options: [{ allowedRoots: ["pete's-files"] }],
        errors: [
          {
            messageId: 'staticRoot',
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, "pete's-files"));`,
              },
            ],
          },
        ],
      },
      // Suggestion uses the first configured root
      {
        code: `express.static(__dirname);`,
        options: [{ allowedRoots: ['www'] }],
        errors: [
          {
            messageId: 'staticRoot',
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'www'));`,
              },
            ],
          },
        ],
      },
      // serveIndex — flagged regardless of arguments
      {
        code: `app.use(serveIndex(path.join(__dirname, 'files')));`,
        errors: [{ messageId: 'directoryListing' }],
      },
      // serve-index bound to a different name via require
      {
        code: `
          const listing = require('serve-index');
          app.use(listing('/uploads'));
        `,
        errors: [{ messageId: 'directoryListing' }],
      },
      // serve-index bound via ESM import
      {
        code: `
          import dirListing from 'serve-index';
          app.use(dirListing('/'));
        `,
        errors: [{ messageId: 'directoryListing' }],
      },
    ]),
  });
});

// ---------------------------------------------------------------------------
// Coverage wave: every branch not exercised by the scenario tests above
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-static-root-exposure (coverage wave)',
  noStaticRootExposure,
  {
    valid: xp([
      // express.static with no argument — nothing to analyze
      { code: `express.static();` },
      // non-string literal root
      { code: `express.static(42);` },
      // variable root — documented false negative (no taint analysis)
      { code: `express.static(root);` },
      // computed member callee — not recognized as express.static
      { code: `express['static']('.');` },
      // object of the callee is itself a member expression
      { code: `a.express.static(__dirname);` },
      // process-like negatives for the cwd detector
      { code: `express.static(getRoot());` }, // callee is a bare identifier
      { code: `express.static(a.b.cwd());` }, // callee object is a member expression
      { code: `express.static(shell.cwd());` }, // object is not `process`
      { code: `express.static(process['cwd']());` }, // computed property
      { code: `express.static(process.uptime());` }, // property is not `cwd`
      // path-join negatives
      { code: `express.static(path['join'](__dirname, x));` }, // computed property
      { code: `express.static(path.basename(__dirname));` }, // not join/resolve
      { code: `express.static(pathlib.join(__dirname, x));` }, // object not `path`
      // absolute root of an allowlisted name
      { code: `express.static('/public');` },
      // Uppercase Express binding still matches (case-insensitive)
      { code: `Express.static(path.join(__dirname, 'assets'));` },
      // serve-index require-tracking negatives
      { code: `const { x } = require('serve-index');` }, // destructured id
      { code: `let pending;` }, // no init
      { code: `const n = 5;` }, // init is not a call
      { code: `const x = foo.bar();` }, // callee is not an identifier
      { code: `const x = load('serve-index');` }, // callee is not `require`
      { code: `const x = require();` }, // no module argument
      { code: `const x = require(moduleName);` }, // non-literal module
      { code: `const morgan = require('morgan');` }, // different module
      { code: `import express from 'express';` }, // different import source
    ]),
    invalid: xp([
      // empty-string root
      {
        code: `express.static('');`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: "''" },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // bare '/' — filesystem root
      {
        code: `express.static('/');`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: "'/'" },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // './' collapses to the app root
      {
        code: `express.static('./');`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: "'./'" },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // traversal wins over the non-literal verdict
      {
        code: `express.static(path.join(__dirname, '..', dir));`,
        errors: [{ messageId: 'traversalSegments' }],
      },
      // non-string literal inside path.join is a non-literal segment
      {
        code: `express.static(path.join(__dirname, 42));`,
        errors: [{ messageId: 'nonLiteralPath' }],
      },
      // path.join with only a literal '..'
      {
        code: `express.static(path.join('..'));`,
        errors: [{ messageId: 'traversalSegments' }],
      },
      // path.resolve exposing the anchor alone
      {
        code: `express.static(path.resolve(__dirname));`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: 'path.resolve(__dirname)' },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // path.join(process.cwd()) — cwd anchor alone
      {
        code: `express.static(path.join(process.cwd()));`,
        errors: [
          {
            messageId: 'staticRoot',
            data: { exposed: 'path.join(process.cwd())' },
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // empty allowedRoots — suggestion falls back to 'public'
      {
        code: `express.static(__dirname);`,
        options: [{ allowedRoots: [] }],
        errors: [
          {
            messageId: 'staticRoot',
            suggestions: [
              {
                messageId: 'scopeToSubdir',
                output: `express.static(path.join(__dirname, 'public'));`,
              },
            ],
          },
        ],
      },
      // serveIndex default binding name flags even without a tracked require
      {
        code: `serveIndex('/');`,
        errors: [{ messageId: 'directoryListing' }],
      },
      // namespace import of serve-index
      {
        code: `
        import * as listing from 'serve-index';
        app.use(listing('/'));
      `,
        errors: [{ messageId: 'directoryListing' }],
      },
    ]),
  },
);
