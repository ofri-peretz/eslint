import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireRouteAuthentication } from './index';

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

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-route-authentication', () => {
  ruleTester.run('require-route-authentication', requireRouteAuthentication, {
    valid: xp([
      // THE safe pattern — auth middleware in the chain
      { name: 'the route carries requireAuth', code: `app.post('/account/password', requireAuth, changePassword);` },
      { code: `router.delete('/users/:id', authenticate, removeUser);` },
      {
        code: `app.put('/billing/card', passport.authenticate('jwt'), saveCard);`,
      },
      // Router-wide guard, mounted after the routes
      {
        code: `
          router.post('/users', createUser);
          router.use(requireAuth);
        `,
      },
      // Mounting a sub-router with a literal prefix is not a guard, but the
      // route itself resolves the principal
      {
        code: `
          app.use('/api', apiRouter);
          app.get('/account/profile', (req, res) => res.json(req.user));
        `,
      },
      // Handler resolves the principal itself
      { code: `app.post('/orders', (req, res) => save(req.session.cart));` },
      { code: `app.get('/profile', (req, res) => res.json(res.locals.user));` },
      {
        code: `app.get('/profile', function (req, res) { return req.auth.sub; });`,
      },
      // -------------------------------------------------------------
      // LOCK: the steps that *establish* authentication cannot require it.
      //
      // All fifteen corpus findings were this class — okta-auth-js's IdX
      // sample router registers credential-recovery and factor-enrolment
      // steps whose paths contain "password" or "otp", and the vocabulary
      // had no word for the flow they belong to. Each of these reported
      // `missingAuthentication` before 2026-08-12.
      // -------------------------------------------------------------
      { code: `router.get('/recover-password', showRecoverForm);` },
      { code: `router.post('/recover-password', startRecovery);` },
      { code: `router.get('/unlock-account', showUnlockForm);` },
      { code: `router.post('/select-authenticator-unlock-account', unlock);` },
      {
        code: `router.post('/challenge-authenticator/okta_password', proceed);`,
      },
      { code: `router.get('/enroll-authenticator/google_otp', showEnroll);` },
      { code: `router.post('/enroll-authenticator/okta_password', setPass);` },
      { code: `router.post('/account/activate', activate);` },
      { code: `router.post('/otp/resend', resend);` },
      { code: `router.post('/consent/permissions', grantConsent);` },
      { code: `router.get('/recovery/password', showQuestions);` },
      { code: `router.post('/enrollment/password', enrolPassword);` },
      // …but the vocabulary is whole-word, so an ordinary route that merely
      // shares letters with one of them is still judged on its own merits.
      // Public-by-design endpoints
      { code: `app.post('/login', doLogin);` },
      { code: `app.post('/password/reset', resetPassword);` },
      { code: `app.post('/webhooks/stripe/payment', handleStripe);` },
      { code: `app.get('/health', healthCheck);` },
      // Nothing critical about the path
      { code: `app.get('/articles', listArticles);` },
      { code: `app.post('/search', runSearch);` },
      // Word-boundary matching — "order"/"user" must not collide on English
      { code: `app.post('/reorder-items', reorder);` },
      { code: `app.post('/border-crossing', cross);` },
      { code: `app.get('/healthz', healthCheck);` },
      // Not a route registration
      { code: `app.get('view engine');` },
      { code: `app.listen(3000, onListen);` },
      { code: `app.set('trust proxy', 1);` },
      { code: `app.post(routePath, createUser);` },
      { code: `app.post(42, createUser);` },
      { code: `app[method]('/users', createUser);` },
      { code: `app['post']('/users', createUser);` },
      { code: `getRouter().post('/users', createUser);` },
      { code: `config.get('/users', createUser);` },
      { code: `post('/users', createUser);` },
      // Custom vocabularies
      {
        code: `app.post('/users', createUser);`,
        options: [{ criticalPaths: ['tenant'] }],
      },
      {
        code: `app.post('/users', createUser);`,
        options: [{ publicPaths: ['users'] }],
      },
      // Extra middleware name accepted as authentication
      {
        code: `app.post('/users', withTenantContext, createUser);`,
        options: [{ authMiddleware: ['withTenantContext'] }],
      },
      // -------------------------------------------------------------
      // LOCK: a handler that hands the request on is not the exposed
      // function. okta-auth-js's SPA sample points three routes at one URL
      // rewriter so `express.static` can serve the shell.
      // -------------------------------------------------------------
      {
        code: `
          function redirectToOrigin(req, res, next) { req.url = '/'; next(); }
          app.get('/login', redirectToOrigin);
          app.get('/profile', redirectToOrigin);
        `,
      },
      {
        code: `
          const rewrite = (req, res, next) => { req.url = '/'; next(); };
          app.get('/account/settings', rewrite);
        `,
      },
      // inline delegating handler
      {
        code: `app.get('/profile', (req, res, next) => { req.url = '/'; next(); });`,
      },
      // Global guard via a bare app.use
      {
        code: `
          app.use(ensureLoggedIn);
          app.post('/users', createUser);
        `,
      },
    ]),
    invalid: xp([
      // LOCK COMPLEMENT: the new public vocabulary is whole-word anchored, so
      // a route that merely *contains* one of its words is still judged.
      // `unlocked` is not `unlock`; this route stays reported.
      {
        name: 'a config-writing POST with no auth middleware',
        code: `app.post('/unlocked-items/config', saveConfig);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // A session store is credential plumbing, not an auth assertion — it
      // must not switch the rule off file-wide.
      {
        code: `
          app.use(session({ secret: s }));
          app.post('/account/password', changePassword);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // COMPLEMENT: a handler that bails with `next()` on one branch but
      // answers on another IS the endpoint, and stays reported.
      {
        code: `
          function showProfile(req, res, next) { if (!ok) return next(); res.json(profile); }
          app.get('/profile', showProfile);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // a handler that neither calls next nor is resolvable
      {
        code: `
          function showProfile(req, res) { render(profile); }
          app.get('/profile', showProfile);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // a member-expression handler is neither a function nor a name we index
      {
        code: `app.get('/profile', controllers.showProfile);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // a bare identifier that resolves to nothing in this file
      {
        code: `app.get('/profile', importedHandler);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // a top-level declaration that is not a function
      {
        code: `
          const showProfile = 42;
          app.get('/profile', showProfile);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // a destructured top-level declaration is not indexed
      {
        code: `
          const { showProfile } = handlers;
          app.get('/profile', showProfile);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // a declaration with no initialiser
      {
        code: `
          let showProfile;
          app.get('/profile', showProfile);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // A computed member reference contributes only its receiver's name:
      // `registry['auth']` names the map, not the middleware inside it.
      {
        code: `app.post('/account/password', registry['auth'], changePassword);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // LOCK: the auth test reads the middleware *reference*, not the printed
      // source of the whole registration. An inline middleware whose body
      // merely mentions `requireAuth` used to match the AUTH_MIDDLEWARE regex
      // through `sourceCode.getText(arg)` and suppress the finding.
      {
        code: `app.post('/account/password', function (req, res, next) { log('requireAuth was removed'); next(); }, changePassword);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // REGRESSION: a path-scoped mount is not global auth. `app.use('/public', ...)`
      // guards /public only — before this lock it switched the rule off file-wide.
      {
        code: `
          app.use('/public', requireAuth);
          app.post('/users', createUser);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // REGRESSION: AUTH_MIDDLEWARE matches printed source text and contains
      // `require`, so in CommonJS an ordinary import read as a global auth guard
      // and suppressed every route in the file.
      {
        code: `
          app.use(require('body-parser'));
          app.post('/users', createUser);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Account management wide open
      {
        code: `app.post('/users', createUser);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Credential change with an unrelated middleware in the chain
      {
        code: `app.put('/account/password', jsonParser, changePassword);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Money movement
      {
        code: `router.post('/payments/transfer', (req, res) => transfer(req.body));`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Destructive account operation
      {
        code: `app.delete('/orders/:id', (req, res) => remove(req.params.id));`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Configuration surface
      {
        code: `app.all('/internal/config', updateConfig);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // A non-auth middleware chain plus an unrelated app.use
      {
        code: `
          app.use('/api', apiRouter);
          app.patch('/billing/plan', bodyParser.json(), updatePlan);
        `,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Plural routes still match the singular vocabulary
      {
        code: `app.get('/invoices/:id', showInvoice);`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Custom critical vocabulary
      {
        code: `app.post('/tenant/switch', switchTenant);`,
        options: [{ criticalPaths: ['tenant'] }],
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Extra auth name configured but this chain does not use it
      {
        code: `app.post('/users', logRequest, createUser);`,
        options: [{ authMiddleware: ['withTenantContext'] }],
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Handler reads a request property that is not a principal
      {
        code: `app.post('/users', (req, res) => createUser(req.body.email));`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // Principal-shaped property on a receiver that is not the request
      {
        code: `app.post('/users', (req, res) => createUser(payload.user));`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      {
        code: `app.post('/users', (req, res) => createUser(payload.body.user));`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
      // A principal reached through a call is not statically a principal read
      {
        code: `app.post('/users', (req, res) => createUser(getReq().user));`,
        errors: [{ messageId: 'missingAuthentication' as const }],
      },
    ]),
  });
});
