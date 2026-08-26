import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUserControlledRenderLocals } from './index';

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

describe('no-user-controlled-render-locals', () => {
  ruleTester.run(
    'no-user-controlled-render-locals',
    noUserControlledRenderLocals,
    {
      valid: xp([
        // Static locals — always safe
        { name: 'render with no locals', code: `res.render('home');` },
        { code: `res.render('home', { title: 'Welcome' });` },
        // Field-picking is THE safe pattern (corpus FP-lock: render-explicit-locals.js)
        {
          code: `
          const express = require('express');
          const helmet = require('helmet');
          const rateLimit = require('express-rate-limit');
          const csrf = require('csurf');

          const app = express();
          app.use(helmet());
          app.use(rateLimit({ windowMs: 60000, max: 100 }));
          app.use(express.json({ limit: '10kb' }));
          const csrfProtection = csrf();

          app.post('/preview', csrfProtection, (req, res) => {
            res.render('preview', {
              title: String(req.body.title || ''),
              body: String(req.body.body || ''),
              authorName: String(req.body.authorName || 'anonymous'),
            });
          });

          module.exports = app;
        `,
        },
        // Picked fields inline
        {
          code: `res.render('profile', { name: req.body.name, age: req.body.age });`,
        },
        // Spread of a non-request object
        { code: `res.render('home', { ...defaults, title: 'x' });` },
        // Destructuring assignment is field-picking
        {
          code: `
          const { title, body } = req.body;
          res.render('post', { title, body });
        `,
        },
        // Sanitizer wrapping (option)
        {
          code: `res.render('post', pick(req.body, ['title']));`,
          options: [{ allowSanitizers: ['pick'] }],
        },
        {
          code: `res.render('post', _.pick(req.body, ['title']));`,
          options: [{ allowSanitizers: ['pick'] }],
        },
        {
          code: `
          const locals = sanitizeLocals(req.body);
          res.render('post', locals);
        `,
          options: [{ allowSanitizers: ['sanitizeLocals'] }],
        },
        // Not a render call
        { code: `res.json(req.body);` },
        { code: `res.send(req.query);` },
        // Variable holds a single FIELD, not the whole object — locals stay safe
        {
          code: `
          const title = req.query.title;
          res.render('post', { title });
        `,
        },
        // Static view names
        { code: `res.render('pages/' + page);` },
        { code: 'res.render(`pages/${page}`);' },
      ]),
      invalid: xp([
        // Corpus fixture (verbatim): CWE-073/vulnerable/render-body-spread.js
        {
          name: 'request data passed as template locals',
          code: `
          const express = require('express');

          const app = express();
          app.use(express.json());
          app.set('view engine', 'pug');

          app.post('/preview', (req, res) => {
            res.render('preview', req.body);
          });

          module.exports = app;
        `,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
          ],
        },
        // Corpus fixture (verbatim): CWE-073/vulnerable/render-query-spread.js
        {
          code: `
          const express = require('express');

          const app = express();
          app.set('view engine', 'ejs');

          app.get('/newsletter', (req, res) => {
            res.render('newsletter', { ...req.query, generatedAt: Date.now() });
          });

          module.exports = app;
        `,
          errors: [
            {
              messageId: 'unsafeRenderLocals',
              data: { source: 'req.query' },
              suggestions: [
                {
                  messageId: 'pickFieldsExplicitly',
                  output: `
          const express = require('express');

          const app = express();
          app.set('view engine', 'ejs');

          app.get('/newsletter', (req, res) => {
            res.render('newsletter', {  generatedAt: Date.now() });
          });

          module.exports = app;
        `,
                },
              ],
            },
          ],
        },
        // Direct whole objects
        {
          code: `res.render('view', req.body);`,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
          ],
        },
        {
          code: `res.render('view', req.query);`,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.query' } },
          ],
        },
        {
          code: `res.render('view', req.params);`,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.params' } },
          ],
        },
        // Spread — with removal suggestion (spread first, trailing comma)
        {
          code: `res.render('v', { ...req.query, generatedAt: Date.now() });`,
          errors: [
            {
              messageId: 'unsafeRenderLocals',
              data: { source: 'req.query' },
              suggestions: [
                {
                  messageId: 'pickFieldsExplicitly',
                  output: `res.render('v', {  generatedAt: Date.now() });`,
                },
              ],
            },
          ],
        },
        // Spread last — preceding comma removed
        {
          code: `res.render('v', { a: 1, ...req.body });`,
          errors: [
            {
              messageId: 'unsafeRenderLocals',
              data: { source: 'req.body' },
              suggestions: [
                {
                  messageId: 'pickFieldsExplicitly',
                  output: `res.render('v', { a: 1 });`,
                },
              ],
            },
          ],
        },
        // Spread only element
        {
          code: `res.render('v', { ...req.body });`,
          errors: [
            {
              messageId: 'unsafeRenderLocals',
              data: { source: 'req.body' },
              suggestions: [
                {
                  messageId: 'pickFieldsExplicitly',
                  output: `res.render('v', {  });`,
                },
              ],
            },
          ],
        },
        // Identifier assigned the whole object without field-picking
        {
          code: `
          const locals = req.body;
          res.render('post', locals);
        `,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
          ],
        },
        // Identifier assigned a spread copy
        {
          code: `
          const locals = { ...req.query };
          res.render('post', locals);
        `,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.query' } },
          ],
        },
        // Non-sanitizer call forwarding the whole object
        {
          code: `res.render('post', normalize(req.body));`,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
          ],
        },
        // Sanitizer option present but callee not listed
        {
          code: `res.render('post', clone(req.body));`,
          options: [{ allowSanitizers: ['pick'] }],
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
          ],
        },
        // User-controlled VIEW argument
        {
          code: `res.render(req.query.view);`,
          errors: [
            { messageId: 'userControlledView', data: { source: 'req.query' } },
          ],
        },
        {
          code: `res.render(req.params.page, { title: 'x' });`,
          errors: [
            { messageId: 'userControlledView', data: { source: 'req.params' } },
          ],
        },
        // View built by concatenation / template literal
        {
          code: `res.render('pages/' + req.query.p);`,
          errors: [
            { messageId: 'userControlledView', data: { source: 'req.query' } },
          ],
        },
        {
          code: 'res.render(`pages/${req.params.name}`);',
          errors: [
            { messageId: 'userControlledView', data: { source: 'req.params' } },
          ],
        },
        // View from a variable derived from request input
        {
          code: `
          const view = req.query.template;
          res.render(view);
        `,
          errors: [
            { messageId: 'userControlledView', data: { source: 'req.query' } },
          ],
        },
        // Both view and locals user-controlled → two reports
        {
          code: `res.render(req.params.page, req.body);`,
          errors: [
            { messageId: 'userControlledView', data: { source: 'req.params' } },
            { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
          ],
        },
        // response / reply aliases (case-insensitive match)
        {
          code: `response.render('v', request.body);`,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
          ],
        },
        {
          code: `reply.render('v', ctx.query);`,
          errors: [
            { messageId: 'unsafeRenderLocals', data: { source: 'req.query' } },
          ],
        },
      ]),
    },
  );
});

// ---------------------------------------------------------------------------
// Coverage wave: every branch not exercised by the scenario tests above
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-user-controlled-render-locals (coverage wave)',
  noUserControlledRenderLocals,
  {
    valid: xp([
      // REGRESSION: a name-keyed tracking map leaked the first handler's origin
      // into the second, flagging a `locals` that was never user-controlled.
      {
        code: `
        app.post('/a', (req, res) => {
          const locals = req.body;
          res.render('a', { title: locals.title });
        });
        app.get('/b', (req, res) => {
          const locals = { title: 'static' };
          res.render('b', locals);
        });
      `,
      },
      // Computed access reads a variable named by `body`, not the body object
      { code: `res.render('v', req[body]);` },
      // isRenderCall negatives
      { code: `render('v', req.body);` }, // bare call — callee not a member expression
      { code: `res['render']('v', req.body);` }, // computed property
      { code: `a.res.render('v', req.body);` }, // object is itself a member expression
      { code: `foo.render('v', req.body);` }, // unknown response name
      // render with no arguments at all
      { code: `res.render();` },
      // view only — no locals argument
      { code: `res.render('home');` },
      // getWholeSource negatives as the locals argument
      { code: `res.render('v', req['body']);` }, // computed source property
      { code: `res.render('v', req.session);` }, // non user-source property
      { code: `res.render('v', foo.body);` }, // non-request root
      { code: `res.render('v', a.req.body);` }, // root object not an identifier
      // literal locals — not member/identifier/call
      { code: `res.render('v', 42);` },
      // untracked identifier locals
      { code: `res.render('v', locals);` },
      // tracked NON-whole identifier used as locals — single field is safe
      {
        code: `
        const v = req.query.title;
        res.render('post', { title: v });
      `,
      },
      // tracked NON-whole identifier passed directly as the locals argument
      {
        code: `
        const single = req.query.title;
        res.render('post', single);
      `,
      },
      // call locals with no user-source argument
      { code: `res.render('v', build());` },
      // sanitizer via member callee with computed property is NOT recognized
      // (falls through to argument scan → safe because no whole source is passed)
      {
        code: `res.render('v', _['pick'](safe));`,
        options: [{ allowSanitizers: ['pick'] }],
      },
      // view derivation negatives
      { code: `res.render(config.view);` }, // member chain rooted at untracked ident
      { code: `res.render(a - b);` }, // binary operator other than '+'
      { code: `res.render('a' + b);` }, // concat of non-request values
      { code: 'res.render(`pages/${name}`);' }, // template expr not user-derived
      { code: 'res.render(`home`);' }, // template with no expressions
      // VariableDeclarator branches
      { code: `let pending;` }, // no init
      { code: `const { a } = req.body;` }, // destructuring id — field-picking
      { code: `const o = { ...defaults }; res.render('v', o);` }, // spread of safe object
      { code: `const o = { a: 1 }; res.render('v', o);` }, // object with no spread
      { code: `const n = 5;` }, // init matches nothing
      // sanitizer assignment is not tracked
      {
        code: `
        const locals = pick(req.body, ['title']);
        res.render('post', locals);
      `,
        options: [{ allowSanitizers: ['pick'] }],
      },
    ]),
    invalid: xp([
      // sanitizer-callee scan: callee is itself a CallExpression → not a sanitizer
      {
        code: `res.render('v', factory()(req.body));`,
        errors: [
          { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
        ],
      },
      // member-callee sanitizer name not in the allowlist
      {
        code: `res.render('v', _.merge(req.body));`,
        options: [{ allowSanitizers: ['pick'] }],
        errors: [
          { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
        ],
      },
      // member sanitizer WITHOUT the option configured
      {
        code: `res.render('v', _.pick(req.body, ['a']));`,
        errors: [
          { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
        ],
      },
      // whole source as the VIEW argument
      {
        code: `res.render(req.query);`,
        errors: [
          { messageId: 'userControlledView', data: { source: 'req.query' } },
        ],
      },
      // deep member chain rooted in a user source (req.query.a.b)
      {
        code: `res.render(req.query.section.page);`,
        errors: [
          { messageId: 'userControlledView', data: { source: 'req.query' } },
        ],
      },
      // concat where the RIGHT side is user-derived
      {
        code: `res.render('pages/' + req.query.p, { title: 'x' });`,
        errors: [
          { messageId: 'userControlledView', data: { source: 'req.query' } },
        ],
      },
      // concat where the LEFT side is user-derived
      {
        code: `res.render(req.query.p + '.pug');`,
        errors: [
          { messageId: 'userControlledView', data: { source: 'req.query' } },
        ],
      },
      // tracked derived (non-whole) variable in a template literal view
      {
        code: `
        const name = req.params.page;
        res.render(\`pages/\${name}\`);
      `,
        errors: [
          { messageId: 'userControlledView', data: { source: 'req.params' } },
        ],
      },
      // uppercase response alias
      {
        code: `RES.render('v', req.body);`,
        errors: [
          { messageId: 'unsafeRenderLocals', data: { source: 'req.body' } },
        ],
      },
      // multiple spreads → one report per unsafe spread
      {
        code: `res.render('v', { ...req.query, ...req.body });`,
        errors: [
          {
            messageId: 'unsafeRenderLocals',
            data: { source: 'req.query' },
            suggestions: [
              {
                messageId: 'pickFieldsExplicitly',
                output: `res.render('v', {  ...req.body });`,
              },
            ],
          },
          {
            messageId: 'unsafeRenderLocals',
            data: { source: 'req.body' },
            suggestions: [
              {
                messageId: 'pickFieldsExplicitly',
                output: `res.render('v', { ...req.query });`,
              },
            ],
          },
        ],
      },
      // spread of a TRACKED whole variable
      {
        code: `
        const data = req.body;
        res.render('v', { ...data, safe: true });
      `,
        errors: [
          {
            messageId: 'unsafeRenderLocals',
            data: { source: 'req.body' },
            suggestions: [
              {
                messageId: 'pickFieldsExplicitly',
                output: `
        const data = req.body;
        res.render('v', {  safe: true });
      `,
              },
            ],
          },
        ],
      },
      // variable assigned via non-sanitizer call, then rendered
      {
        code: `
        const locals = normalize(req.query);
        res.render('v', locals);
      `,
        errors: [
          { messageId: 'unsafeRenderLocals', data: { source: 'req.query' } },
        ],
      },
    ]),
  },
);
