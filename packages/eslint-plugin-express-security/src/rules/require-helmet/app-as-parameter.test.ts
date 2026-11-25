/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The Express app handed to a function as a PARAMETER.
 *
 * Any call that took the app used to count as the app leaving the file, so
 * `const app = express(); configure(app)` was silent even when `configure` is
 * defined four lines below and never applies helmet. A function this file
 * defines, whose parameter is only used as a receiver (`app.use(...)`), is
 * readable here: helmet applied through the parameter counts, and its absence
 * is reported at `express()`.
 *
 * The limit, on purpose: a module that only RECEIVES the app (`export default
 * (app) => { ... }`, the loader shape) is never reported. Whether helmet is
 * applied by whoever calls it is not provable in this file, so the rule stays
 * silent there. Anything not readable here still counts as an escape: an
 * imported function, a method, a parameter that is passed on, returned,
 * stored or reassigned.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import { requireHelmet } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const missing = [{ messageId: 'missingHelmet' as const }];

describe('require-helmet — app as a parameter', () => {
  ruleTester.run('app-as-parameter', requireHelmet, {
    valid: [
      {
        // @source santiq/bulletproof-nodejs src/loaders/express.ts
        // @found linting popular Node.js packages and Express/NestJS starters
        name: 'the loader shape: a module that only receives the app is never reported',
        code: `
          import express from 'express';
          export default ({ app }) => {
            app.set('view engine', 'pug');
            app.enable('trust proxy');
            app.use(express.json());
          };
        `,
      },
      {
        name: 'a loader that applies helmet through its parameter',
        code: `
          import express from 'express';
          import helmet from 'helmet';
          export default (app) => {
            app.set('view engine', 'pug');
            app.use(helmet());
          };
        `,
      },
      {
        name: 'a local function applies helmet through its parameter',
        code: `
          import express from 'express';
          import helmet from 'helmet';
          function secure(target) { target.use(helmet()); }
          const app = express();
          app.set('view engine', 'pug');
          secure(app);
        `,
      },
      {
        name: 'a local arrow that only mounts routes still leaves helmet to its importer when the app is also exported',
        code: `
          import express from 'express';
          const mount = (target) => { target.use('/api', router); };
          const app = express();
          app.set('view engine', 'pug');
          mount(app);
          export default app;
        `,
      },
      {
        name: 'an imported function still takes the app out of view',
        code: `
          import express from 'express';
          import { secure } from './secure';
          const app = express();
          app.set('view engine', 'pug');
          secure(app);
        `,
      },
      {
        name: 'a parameter passed on to another call is an escape, so nothing is proven',
        code: `
          import express from 'express';
          function configure(target) { register(target); }
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        name: 'a parameter that is returned is an escape',
        code: `
          import express from 'express';
          function configure(target) { target.use(json); return target; }
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        name: 'a parameter that is rewritten is no longer the app, so nothing is proven',
        code: `
          import express from 'express';
          function configure(target) { target = wrap(target); target.use(json); }
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        name: 'an argument with no matching parameter is reachable only through arguments, so it escapes',
        code: `
          import express from 'express';
          function configure() { use(arguments[0]); }
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        name: 'a destructured parameter cannot be followed, so it escapes',
        code: `
          import express from 'express';
          function configure({ use }) { use(json); }
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        name: 'a spread argument after the app cannot be matched to a parameter, so it escapes',
        code: `
          import express from 'express';
          function configure(target) { target.use(json); }
          const app = express();
          app.set('view engine', 'pug');
          configure(app, ...rest);
        `,
      },
      {
        name: 'a method callee is not a function this file defines',
        code: `
          import express from 'express';
          const app = express();
          app.set('view engine', 'pug');
          setup.configure(app);
        `,
      },
      {
        name: 'a callee bound by a loop or reassigned is not a known function',
        code: `
          import express from 'express';
          let configure = (target) => { target.use(json); };
          configure = other;
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        name: 'a callee bound to something that is not a function',
        code: `
          import express from 'express';
          const configure = makeConfigure();
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        name: 'an argument before the app is skipped; the app is matched to its own parameter',
        code: `
          import express from 'express';
          import helmet from 'helmet';
          function configure(options, target) { target.use(helmet(options)); }
          const app = express();
          app.set('view engine', 'pug');
          configure({ strict: true }, app);
        `,
      },
      {
        name: 'another identifier before the app is skipped too',
        code: `
          import express from 'express';
          import helmet from 'helmet';
          function configure(options, target) { target.use(helmet(options)); }
          const app = express();
          const options = {};
          app.set('view engine', 'pug');
          configure(options, app);
        `,
      },
      {
        // Review: a declaration can be reassigned to something this file does not hold.
        name: 'a function declaration that is reassigned is not the function that was declared',
        code: `
          import express from 'express';
          import { secure } from './secure';
          function configure(target) { target.use(json); }
          configure = secure;
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
      {
        // Review: arguments[0] is the app, passed on.
        name: 'the app passed on through arguments is an escape',
        code: `
          import express from 'express';
          import { secure } from './secure';
          function configure(target) {
            target.use(json);
            secure(arguments[0]);
          }
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
      },
    ],
    invalid: [
      {
        name: 'a local function that mounts middleware without helmet is now readable, so the missing control reports',
        code: `
          import express from 'express';
          function configure(target) {
            target.use(express.json());
            target.set('view engine', 'pug');
          }
          const app = express();
          configure(app);
        `,
        errors: missing,
      },
      {
        name: 'a local arrow bound with const is read the same way',
        code: `
          import express from 'express';
          const configure = (target) => { target.use(express.json()); };
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
        errors: missing,
      },
      {
        name: 'an arrow function has no arguments of its own, so one it names is the outer one',
        code: `
          import express from 'express';
          const configure = (target) => { target.use(json); };
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
        errors: missing,
      },
      {
        name: 'a function that never touches arguments is still read',
        code: `
          import express from 'express';
          function configure(target) { target.use(json); return; }
          const app = express();
          app.set('view engine', 'pug');
          configure(app);
        `,
        errors: missing,
      },
    ],
  });
});
