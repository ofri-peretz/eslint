import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireCsrfProtection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Found linting sahat/hackathon-starter (app.js): CSRF is mounted once for every
 * route through a wrapper that builds lusca's middleware and calls it,
 *
 *   app.use((req, res, next) => {
 *     if (req.path === '/api/upload') next(); else lusca.csrf()(req, res, next);
 *   });
 *
 * and the upload route chains lusca's combined form, `lusca({ csrf: true })`.
 * All 30 POST routes were reported as unprotected.
 */
const HEAD =
  "import 'express';\nimport session from 'express-session';\napp.use(session({ secret: s }));\n";

ruleTester.run(
  'require-csrf-protection (lusca factory)',
  requireCsrfProtection,
  {
    valid: [
      {
        name: 'a wrapper that calls lusca.csrf() with its own next protects every route',
        code: `${HEAD}const lusca = require('lusca');
      app.use((req, res, next) => {
        if (req.path === '/api/upload') { next(); } else { lusca.csrf()(req, res, next); }
      });
      app.post('/account/profile', requireAuth, handler);`,
      },
      {
        name: 'a wrapper that calls an imported csurf() factory with its own next',
        code: `${HEAD}import csurf from 'csurf';
      app.use(function (req, res, next) { csurf({ cookie: true })(req, res, next); });
      app.post('/account/profile', requireAuth, handler);`,
      },
      {
        name: 'lusca({ csrf: true }) in the route chain protects that route',
        code: `${HEAD}import lusca from 'lusca';
      app.post('/api/upload', requireAuth, lusca({ csrf: true }), handler);`,
      },
      {
        name: 'lusca({ csrf: options }) mounted globally protects every route',
        code: `${HEAD}import lusca from 'lusca';
      app.use(lusca({ csrf: { angular: true }, xframe: 'SAMEORIGIN' }));
      app.post('/account/profile', requireAuth, handler);`,
      },
    ],
    invalid: [
      {
        name: 'lusca({ csrf: false }) turns CSRF off',
        code: `${HEAD}import lusca from 'lusca';
      app.use(lusca({ csrf: false, xframe: 'SAMEORIGIN' }));
      app.post('/account/profile', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'lusca() with no csrf key mounts only the other protections',
        code: `${HEAD}import lusca from 'lusca';
      app.post('/api/upload', requireAuth, lusca({ xframe: 'SAMEORIGIN' }), handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a csrf() method on something that is not lusca is not lusca',
        code: `${HEAD}const tools = require('./tools');
      app.use((req, res, next) => { tools.csrf()(req, res, next); });
      app.post('/account/profile', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a lusca factory built but never handed next does not protect',
        code: `${HEAD}const lusca = require('lusca');
      app.use((req, res, next) => { lusca.csrf()(req, res); next(); });
      app.post('/account/profile', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'lusca.xframe() is not CSRF',
        code: `${HEAD}const lusca = require('lusca');
      app.use((req, res, next) => { lusca.xframe('SAMEORIGIN')(req, res, next); });
      app.post('/account/profile', requireAuth, handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
    ],
  },
);

const tsRuleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

tsRuleTester.run(
  'require-csrf-protection (lusca factory, TypeScript imports)',
  requireCsrfProtection,
  {
    valid: [
      {
        name: 'lusca loaded with import = require() protects the route',
        code: `${HEAD}import lusca = require('lusca');
      app.post('/api/upload', requireAuth, lusca({ csrf: true }), handler);`,
      },
    ],
    invalid: [
      {
        name: 'a namespace alias named lusca is not the lusca module',
        code: `${HEAD}import lusca = Tools.lusca;
      app.post('/api/upload', requireAuth, lusca({ csrf: true }), handler);`,
        errors: [{ messageId: 'missingCsrf' }],
      },
    ],
  },
);
