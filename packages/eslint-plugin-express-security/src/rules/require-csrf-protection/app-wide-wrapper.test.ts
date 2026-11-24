import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { requireCsrfProtection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Found linting open-source Node apps: a dashboard mounted its own CSRF module
 * once for every route, behind a function that lets plugins opt a request out:
 *
 *   app.use(function (req, res, next) { csrf(req, res, next); });
 *
 * and ten `app.post(...)` routes were reported as unprotected.
 */
const HEAD =
  "import 'express';\nimport session from 'express-session';\napp.use(session({ secret: s }));\n";

ruleTester.run(
  'require-csrf-protection (app-wide wrapper)',
  requireCsrfProtection,
  {
    valid: [
      {
        name: 'a mounted wrapper that delegates to a required csrf module',
        code: `${HEAD}const csrf = require('./libs/csrf.js');
        app.use(function (req, res, next) { csrf(req, res, next); });
        app.post('/settings', requireAuth, handler);`,
      },
      {
        name: 'an arrow wrapper delegating to an imported csurf',
        code: `${HEAD}import csrfGuard from 'csurf';
        app.use((req, res, next) => csrfGuard(req, res, next));
        app.post('/settings', requireAuth, handler);`,
      },
      {
        name: 'a wrapper that delegates only on one branch still mounts the module',
        code: `${HEAD}const protect = require('./libs/csrf.js');
        app.use(function (req, res, next) {
          if (!skip(req)) { protect(req, res, next); } else { next(); }
        });
        app.post('/settings', requireAuth, handler);`,
      },
    ],
    invalid: [
      {
        name: 'a wrapper whose callee is not bound to a csrf module still reports',
        code: `${HEAD}const logger = require('./libs/logger.js');
        app.use(function (req, res, next) { logger(req, res, next); });
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a callee named csrf but bound to something local still reports',
        code: `${HEAD}function csrf(req, res, next) { next(); }
        app.use(function (req, res, next) { csrf(req, res, next); });
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a csrf module called without handing on next still reports',
        code: `${HEAD}const csrf = require('./libs/csrf.js');
        app.use(function (req, res, next) { csrf(req); next(); });
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a wrapper with no next parameter still reports',
        code: `${HEAD}const csrf = require('./libs/csrf.js');
        app.use(function (req, res) { csrf(req, res); });
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'an imported csrf binding that is not a module call (a require of something else) still reports',
        code: `${HEAD}const csrf = loadCsrf('./libs/csrf.js');
        app.use(function (req, res, next) { csrf(req, res, next); });
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a csrf name that is a parameter, not a module, still reports',
        code: `${HEAD}function mount(csrf) { app.use(function (req, res, next) { csrf(req, res, next); }); }
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a global csrf name from nowhere still reports',
        code: `${HEAD}app.use(function (req, res, next) { csrf(req, res, next); });
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a csrf declared only as a global has no module behind it',
        code: `${HEAD}/* global csrf */
        app.use(function (req, res, next) { csrf(req, res, next); });
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a non-function middleware is not a wrapper',
        code: `${HEAD}app.use(1);
        app.post('/settings', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
    ],
  },
);
