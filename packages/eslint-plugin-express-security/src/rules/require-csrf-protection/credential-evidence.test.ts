/**
 * require-csrf-protection: which credential evidence counts.
 *
 * Measured on training apps (results tracked privately): the rule's findings on a
 * bearer-token Express app were dominated by four shapes that carry no
 * cross-site authority, while the same rule stayed silent on a server-rendered
 * app whose session was configured in another file. Each block below locks one
 * of those, in both directions: what must stay quiet and the lookalike that must
 * still report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireCsrfProtection } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

// Side-effect import: opens the Express gate without reserving a binding.
const x = (code: string): string => `import 'express';\n${code}`;
const SESSION =
  "import session from 'express-session';\napp.use(session({ secret: s }));\n";

ruleTester.run(
  'require-csrf-protection (credential evidence)',
  requireCsrfProtection,
  {
    valid: [
      // ------------------------------------------------------------------
      // 1. A guard mounted on its own is not a state-changing handler. The
      //    registration has no handler; the route that mutates state is
      //    registered elsewhere (a REST resource generator, a later `app.post`).
      // ------------------------------------------------------------------
      {
        name: 'guard-only: a call to an authorisation guard is the only argument',
        code: x(`${SESSION}app.use(requireAuth);
        app.post('/api/Products', security.isAuthorized());`),
      },
      {
        name: 'guard-only: deny-all guard on a mutating verb',
        code: x(`${SESSION}app.use(requireAuth);
        app.delete('/api/Products/:id', security.denyAll());`),
      },
      {
        name: 'guard-only: several guards, no handler',
        code: x(`${SESSION}app.use(requireAuth);
        app.put('/api/Cards/:id', security.isAuthorized(), security.denyAll());`),
      },
      {
        name: 'guard-only: bare guard reference',
        code: x(`${SESSION}app.use(requireAuth);
        app.post('/api/Orders', ensureLoggedIn);`),
      },
      {
        name: 'guard-only: guards on an app.route() chain',
        code: x(`${SESSION}app.use(requireAuth);
        app.route('/api/Users/:id')
          .put(security.denyAll())
          .delete(security.denyAll());`),
      },
      {
        name: 'guard-only: a user-context decorator is not a handler either',
        code: x(`${SESSION}app.use(requireAuth);
        app.post('/api/Cards', security.appendUserId());`),
      },

      // ------------------------------------------------------------------
      // 2. A cookie *parser* is not a credential. `cookie-parser` fills
      //    `req.cookies` for whatever a cookie holds (a language flag, a
      //    consent banner); only a session store, or code that reads
      //    `req.cookies` / `res.cookie`, shows a cookie carrying authority.
      // ------------------------------------------------------------------
      {
        name: 'cookie-parser alone, bearer-authenticated routes',
        code: x(`import cookieParser from 'cookie-parser';
        app.use(cookieParser('secret'));
        app.use(requireAuth);
        app.post('/api/items', createItem);`),
      },
      {
        name: 'cookie-parser through require(), guard on the route',
        code: x(`const cookieParser = require('cookie-parser');
        app.post('/form', requireAuth, formHandler);`),
      },

      // ------------------------------------------------------------------
      // 3. Bearer credentials are not ambient: the browser does not attach an
      //    Authorization header to a cross-site request on its own.
      // ------------------------------------------------------------------
      {
        name: 'bearer: passport jwt strategy without a session',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('jwt', { session: false }), createItem);`,
        ),
      },
      {
        name: 'bearer: passport bearer strategy',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('bearer', { session: false }), createItem);`,
        ),
      },
      {
        name: 'bearer: express-jwt with the default token source',
        code: x(`import { expressjwt } from 'express-jwt';
        ${SESSION}app.post('/items', expressjwt({ secret: s, algorithms: ['HS256'] }), createItem);`),
      },
      {
        name: 'bearer: express-jwt required through CommonJS',
        code: x(`const { expressjwt: jwt } = require('express-jwt');
        ${SESSION}app.put('/items/:id', jwt({ secret: s, algorithms: ['HS256'] }), updateItem);`),
      },
      {
        name: 'bearer: the handler reads the Authorization header',
        code: x(`${SESSION}app.post('/items', requireAuth, (req, res) => {
          const token = req.headers.authorization.split(' ')[1];
          res.json(createItem(token, req.body));
        });`),
      },
      {
        name: 'bearer: header read through req.get()',
        code: x(`${SESSION}app.post('/items', requireAuth, (req, res) => {
          const token = req.get('Authorization');
          res.json(createItem(token, req.body));
        });`),
      },

      // ------------------------------------------------------------------
      // 4. Same module shape as the cross-module reports below, but nothing
      //    shows a browser session could be behind it.
      // ------------------------------------------------------------------
      {
        name: 'exported JSON router: no document is rendered, so no browser session is implied',
        code: x(`const router = require('express').Router();
        module.exports = function () {
          router.post('/ping', authHandler.isAuthenticated, appHandler.ping);
          return router;
        };`),
      },
      {
        name: 'app built here, renders documents, no credential anywhere in the file',
        code: x(`const router = express.Router();
        router.get('/', authHandler.isAuthenticated, (req, res) => res.render('home'));
        router.post('/ping', authHandler.isAuthenticated, appHandler.ping);
        app.use(router);`),
      },
      {
        name: 'a router that is never handed to an importer',
        code: x(`const router = express.Router();
        router.get('/', authHandler.isAuthenticated, (req, res) => res.render('home'));
        router.post('/ping', authHandler.isAuthenticated, appHandler.ping);`),
      },
      {
        name: 'the app is created through require(express)() in the same file',
        code: x(`const app = require('express')();
        const router = express.Router();
        router.get('/', authHandler.isAuthenticated, (req, res) => res.render('home'));
        router.post('/ping', authHandler.isAuthenticated, appHandler.ping);
        module.exports = router;`),
      },
      {
        name: 'a module with member calls that is neither a router nor an app',
        code: x(`const x = foo.bar();
        module.exports = function () { return x; };`),
      },
      {
        name: 'a variable initialised from a member call that is not Router',
        code: x(`const r = express.json();
        module.exports = r;`),
      },
      {
        name: 'bearer: passport jwt with a quoted-computed session:false',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('jwt', { ['session']: false }), createItem);`,
        ),
      },
      // The request is the handler's first parameter, whatever it is spelled;
      // a binding that merely happens to be called `req` is not the request.
      {
        name: 'bearer: the request parameter is not spelled req',
        code: x(`${SESSION}app.post('/items', requireAuth, (r, s) => {
          s.json(create(r.headers.authorization, r.body));
        });`),
      },
      {
        name: 'bearer: a local named req is not the request, so its cookies do not count',
        code: x(`${SESSION}app.post('/items', requireAuth, (r, s) => {
          const req = buildOutbound();
          req.cookies = {};
          s.json(create(r.get('Authorization'), req.body));
        });`),
      },
    ],
    invalid: [
      // ------------------------------------------------------------------
      // Lookalikes that must keep reporting.
      // ------------------------------------------------------------------
      {
        name: 'a guard plus a real handler still reports',
        code: x(`${SESSION}app.use(requireAuth);
        app.post('/api/Orders', security.isAuthorized(), createOrder);`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a handler factory named like a verb is a handler, not a guard',
        code: x(`${SESSION}app.use(requireAuth);
        app.post('/login', login());`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a handler whose name starts with verify is a handler, not a guard',
        code: x(`${SESSION}app.use(requireAuth);
        app.post('/verify', verifyEmail);`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'cookie-parser plus a read of req.cookies is a cookie credential',
        code: x(`import cookieParser from 'cookie-parser';
        app.use(cookieParser());
        app.post('/items', requireAuth, (req, res) => {
          res.json(save(req.cookies.token, req.body));
        });`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'passport local strategy keeps a session cookie',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('local'), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'express-jwt told to read the token from a cookie is cookie authority',
        code: x(`import { expressjwt } from 'express-jwt';
        ${SESSION}app.post('/items', expressjwt({ secret: s, algorithms: ['HS256'], getToken: (req) => req.cookies.jwt }), createItem);`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a handler that reads the Authorization header and a cookie',
        code: x(`${SESSION}app.post('/items', requireAuth, (req, res) => {
          const token = req.headers.authorization || req.cookies.token;
          res.json(createItem(token, req.body));
        });`),
        errors: [{ messageId: 'missingCsrf' }],
      },

      // ------------------------------------------------------------------
      // Cross-module evidence: the session is configured in the module that
      // mounts this router, so no credential appears in this file at all. A
      // router module that renders documents and is handed to its importer is
      // the file shape of a server-rendered app's routes.
      // ------------------------------------------------------------------
      {
        name: 'exported router factory that renders documents (CommonJS)',
        code: x(`var router = require('express').Router();
        var authHandler = require('../core/authHandler');
        var appHandler = require('../core/appHandler');
        module.exports = function () {
          router.get('/', authHandler.isAuthenticated, function (req, res) {
            res.render('app/home');
          });
          router.post('/ping', authHandler.isAuthenticated, appHandler.ping);
          return router;
        };`),
        errors: [{ messageId: 'missingCsrf', line: 9 }],
      },
      {
        name: 'router exported directly that serves a file',
        code: x(`const router = express.Router();
        router.get('/', requireAuth, (req, res) => res.sendFile('/index.html'));
        router.put('/settings', requireAuth, updateSettings);
        module.exports = router;`),
        errors: [{ messageId: 'missingCsrf', line: 4 }],
      },
      {
        name: 'router exported as the ES default',
        code: x(`import { Router } from 'express';
        const router = Router();
        router.get('/', requireAuth, (req, res) => res.render('home'));
        router.delete('/account', requireAuth, deleteAccount);
        export default router;`),
        errors: [{ messageId: 'missingCsrf', line: 5 }],
      },
      {
        name: 'passport jwt without session:false may keep a session',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('jwt'), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'passport jwt with session:true',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('jwt', { session: true }), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'passport jwt with a dynamic option key',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('jwt', { [k]: false }), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'passport jwt with a spread option bag',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate('jwt', { ...opts }), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'passport strategy chosen at runtime',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate(strategy), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'passport authenticate with no arguments',
        code: x(
          `${SESSION}app.post('/items', passport.authenticate(), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a registration with no handler at all',
        code: x(`${SESSION}app.use(requireAuth);
        app.post('/items');`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'an unrelated member call in the chain is not a bearer guard',
        code: x(
          `${SESSION}app.post('/items', requireAuth, limiter.check(), createItem);`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a request header other than Authorization',
        code: x(`${SESSION}app.post('/items', requireAuth, (req, res) => {
          const t = req.get('X-Trace') || req.headers['x-trace'];
          res.json(create(t, req.body));
        });`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a curried require of another package does not make the app',
        code: x(`const make = require('other')();
        const router = express.Router();
        router.get('/', authHandler.isAuthenticated, (req, res) => res.render('home'));
        router.post('/ping', requireAuth, appHandler.ping);
        module.exports = router;`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a handler with no parameters carries no bearer evidence',
        code: x(
          `${SESSION}app.post('/items', requireAuth, () => createItem());`,
        ),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'a destructured request parameter is not bound to a name',
        code: x(`${SESSION}app.post('/items', requireAuth, ({ headers }) => {
          return create(headers.authorization);
        });`),
        errors: [{ messageId: 'missingCsrf' }],
      },
      {
        name: 'bearer plus a cookie read through a differently spelled request parameter',
        code: x(`${SESSION}app.post('/items', requireAuth, (r, s) => {
          s.json(create(r.headers.authorization, r.cookies.sid));
        });`),
        errors: [{ messageId: 'missingCsrf' }],
      },
    ],
  },
);
