/**
 * Tests for require-helmet rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireHelmet } from './index';
import * as vitest from 'vitest';

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
const xp = <T>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string'
        ? { output: asExpress(test.output) }
        : {}),
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

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-helmet', requireHelmet, {
  valid: xp([
    // -----------------------------------------------------------------
    // LOCK: helmet's headers are instructions to a *renderer*.
    //
    // Four of the six corpus findings were apps that never render a
    // document — a static asset server and two form-post demos. Reporting
    // them claimed a browser protection was missing from a response no
    // browser renders. Each of these reported `missingHelmet` before
    // 2026-08-12.
    // -----------------------------------------------------------------
    {
      name: 'an app that only serves static files',
      code: `
        import express from 'express';
        const app = express();
        app.use(express.static('./public'));
        app.listen(8080);
      `,
    },
    {
      code: `
        import express from 'express';
        const app = express();
        app.use(express.json());
        app.post('/login', handleLogin);
      `,
    },
    // -----------------------------------------------------------------
    // LOCK: `module.exports = app` is an escape, not a missing control.
    //
    // The other two corpus findings. The app is configured by whoever
    // imports it, so "no helmet here" says nothing about the application —
    // the same reasoning the `setAppConfigurations(app)` guard already
    // encoded for the call form.
    // -----------------------------------------------------------------
    {
      code: `
        const express = require('express');
        const app = express();
        module.exports = app;
        app.set('view engine', 'mustache');
        app.use(express.static('./public'));
      `,
    },
    {
      code: `
        import express from 'express';
        const app = express();
        app.set('view engine', 'pug');
        export default app;
      `,
    },
    {
      // A router factory that returns the configured app.
      code: `
        import express from 'express';
        function build() {
          const app = express();
          app.engine('html', renderer);
          return app;
        }
      `,
    },
    {
      // ToniR7/express-typescript-starter: the app is created here and helmet
      // is registered in `utils/appInitialization.ts`. Once the binding is handed
      // to another function the middleware stack is assembled out of view, so
      // "not here" says nothing about the application.
      code: `
        import express from 'express';
        import { setAppConfigurations, setAppRoutes } from './utils/index.ts';
        const app = express();
        app.set('view engine', 'pug');
        setAppConfigurations(app);
        setAppRoutes(app);
      `,
    },
    {
      // A call that takes the app but is not the escape hatch's target still
      // counts — we cannot tell `configure(app)` from `log(app)`, and guessing
      // is what produced the false positive in the first place.
      code: `
        import express from 'express';
        const app = express();
        app.set('view engine', 'pug');
        registerEverything(app);
      `,
    },
    // Express with helmet middleware
    {
      code: `
        import express from 'express';
        import helmet from 'helmet';
        const app = express();
        app.set('view engine', 'pug');
        app.use(helmet());
      `,
    },
    // Express with helmet inline
    {
      code: `
        const express = require('express');
        const helmet = require('helmet');
        const app = express();
        app.get('/', (req, res) => res.render('index'));
        app.use(helmet());
      `,
    },
    // Express with specific helmet middleware
    {
      code: `
        import express from 'express';
        import helmet from 'helmet';
        const app = express();
        app.set('view engine', 'pug');
        app.use(helmet.contentSecurityPolicy());
        app.use(helmet.xssFilter());
      `,
    },
    // Alternative middleware accepted
    {
      code: `
        import express from 'express';
        const app = express();
        app.set('view engine', 'pug');
        app.use(secureHeaders());
      `,
      options: [{ alternativeMiddleware: ['secureHeaders'] }],
    },
    // No express app - should not trigger
    {
      code: `
        import fastify from 'fastify';
        const app = fastify();
        app.get('/', (req, res) => res.render('index'));
      `,
    },
    // Test file with allowInTests
    {
      code: `
        import express from 'express';
        const app = express();
        app.set('view engine', 'pug');
      `,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // assumeHelmetMiddleware option (helmet provided by infrastructure)
    {
      code: `
        import express from 'express';
        const app = express();
        app.set('view engine', 'pug');
        app.use(express.json());
      `,
      options: [{ assumeHelmetMiddleware: true }],
    },
    // `app.set` with a non-view setting is not document evidence
    {
      code: `
        import express from 'express';
        const app = express();
        app.set('trust proxy', 1);
      `,
    },
    // `app.set` with a non-literal key
    {
      code: `
        import express from 'express';
        const app = express();
        app.set(settingName, 1);
      `,
    },
    // `app.set` with a non-string literal key
    {
      code: `
        import express from 'express';
        const app = express();
        app.set(1, 2);
      `,
    },
    // a computed member call — the property is a Literal, not an Identifier
    {
      code: `
        import express from 'express';
        const app = express();
        app['render']('index');
      `,
    },
    // `app.set` with no arguments at all
    {
      code: `
        import express from 'express';
        const app = express();
        app.set();
      `,
    },
    // res.send of a hand-built page is deliberately NOT document evidence:
    // `send` is the generic responder and its payload cannot be classified
    // without reading it. Documented in servesBrowserDocuments.
    {
      code: `
        import express from 'express';
        const app = express();
        res.send('<html></html>');
      `,
    },
  ]),
  invalid: xp([
    {
      name: 'an app that renders views with no helmet',
      // `express()` with no binding at all — there is nothing to follow, so the
      // escape hatch must not engage and the missing middleware is still a
      // finding. Guards the abstain path against over-reaching.
      code: `
        import express from 'express';
        express().set('view engine', 'pug');
      `,
      errors: [{ messageId: 'missingHelmet' }],
    },
    // A rendering app without helmet
    {
      code: `
        import express from 'express';
        const app = express();
        app.set('view engine', 'pug');
        app.use(express.json());
      `,
      errors: [{ messageId: 'missingHelmet' }],
    },
    // res.render is document evidence on its own
    {
      code: `
        const express = require('express');
        const app = express();
        app.get('/', (req, res) => res.render('home'));
      `,
      errors: [{ messageId: 'missingHelmet' }],
    },
    // res.sendFile is document evidence
    {
      code: `
        import express from 'express';
        const app = express();
        app.get('/', (req, res) => res.sendFile('index.html'));
      `,
      errors: [{ messageId: 'missingHelmet' }],
    },
    // Express with other middleware but not helmet
    {
      code: `
        import express from 'express';
        import cors from 'cors';
        const app = express();
        app.set('view engine', 'pug');
        app.use(cors());
        app.use(express.json());
      `,
      errors: [{ messageId: 'missingHelmet' }],
    },
    // Test file without allowInTests
    {
      code: `
        import express from 'express';
        const app = express();
        app.set('view engine', 'pug');
      `,
      options: [{ allowInTests: false }],
      filename: 'app.test.ts',
      errors: [{ messageId: 'missingHelmet' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('require-helmet (coverage wave)', requireHelmet, {
  valid: xp([
    // app.use(helmet) — identifier reference without a call
    {
      code: `const app = express(); app.set('view engine', 'pug'); app.use(helmet);`,
    },
    // call-of-a-call that is not require('express')()
    { code: `f()(); res.render('x');` },
    // require()() with no module argument
    { code: `require()(); res.render('x');` },
    // require(identifier)()
    { code: `require(moduleName)(); res.render('x');` },
    // require of a different module
    { code: `require('lodash')(); res.render('x');` },
    // alternative middleware referenced as an identifier
    {
      code: `const app = express(); app.set('view engine', 'pug'); app.use(secureHeaders);`,
      options: [{ alternativeMiddleware: ['secureHeaders'] }],
    },
    // assignment whose right-hand side is not the app binding
    {
      code: `const app = express(); app.set('view engine', 'pug'); module.exports = router; app.use(helmet());`,
    },
    // `return` with no argument, inside a function that also holds the app
    {
      code: `function f() { const app = express(); app.set('view engine', 'pug'); if (x) return; app.use(helmet()); }`,
    },
    // `export default` of something that is not the app binding
    {
      code: `const app = express(); app.set('view engine', 'pug'); app.use(helmet()); export default router;`,
    },
  ]),
  invalid: xp([
    // require('express')() pattern creates an app without helmet
    {
      code: `const app = require('express')(); app.set('view engine', 'pug'); app.listen(3000);`,
      errors: [{ messageId: 'missingHelmet' }],
    },
    // identifier middleware that is not helmet
    {
      code: `const app = express(); app.set('view engine', 'pug'); app.use(morgan);`,
      errors: [{ messageId: 'missingHelmet' }],
    },
    // literal + identifier middleware args, none of them helmet
    {
      code: `const app = express(); app.set('view engine', 'pug'); app.use('/api', apiRouter);`,
      errors: [{ messageId: 'missingHelmet' }],
    },
  ]),
});
