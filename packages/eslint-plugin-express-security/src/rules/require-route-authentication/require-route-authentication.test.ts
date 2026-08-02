import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireRouteAuthentication } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-route-authentication', () => {
  ruleTester.run('require-route-authentication', requireRouteAuthentication, {
    valid: [
      // THE safe pattern — auth middleware in the chain
      { code: `app.post('/account/password', requireAuth, changePassword);` },
      { code: `router.delete('/users/:id', authenticate, removeUser);` },
      { code: `app.put('/billing/card', passport.authenticate('jwt'), saveCard);` },
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
      { code: `app.get('/profile', function (req, res) { return req.auth.sub; });` },
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
      // Global guard via a bare app.use
      {
        code: `
          app.use(ensureLoggedIn);
          app.post('/users', createUser);
        `,
      },
    ],
    invalid: [
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
    ],
  });
});
