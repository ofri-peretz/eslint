/**
 * Tests for require-csrf-protection rule
 * 
 * Zero FP tolerance - comprehensive edge case coverage
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireCsrfProtection } from './index';
import * as vitest from 'vitest';

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

ruleTester.run('require-csrf-protection', requireCsrfProtection, {
  valid: [
    // ============================================
    // GLOBAL CSRF MIDDLEWARE PATTERNS
    // ============================================
    
    // Global CSRF via app.use(csrf())
    {
      code: `
        import express from 'express';
        import csrf from 'csurf';
        const app = express();
        app.use(csrf());
        app.post('/login', handler);
      `,
    },
    // Global CSRF protects ALL routes (no spam!)
    {
      code: `
        const app = express();
        app.use(csrf());
        app.post('/login', handler);
        app.put('/users/:id', handler);
        app.delete('/posts/:id', handler);
        app.patch('/settings', handler);
      `,
    },
    // csurf package (alternative naming)
    {
      code: `
        const csurf = require('csurf');
        const app = express();
        app.use(csurf());
        app.post('/api/data', handler);
      `,
    },
    // CSRF middleware stored in variable
    {
      code: `
        const csrfMiddleware = csrf({ cookie: true });
        app.use(csrfMiddleware);
        app.post('/submit', handler);
      `,
    },
    // CSRF from lusca package
    {
      code: `
        const lusca = require('lusca');
        app.use(lusca.csrf());
        app.post('/form', handler);
      `,
    },
    
    // ============================================
    // ROUTE-LEVEL CSRF PATTERNS
    // ============================================
    
    // CSRF in route middleware chain
    {
      code: `
        app.post('/login', csrfProtection, (req, res) => {});
      `,
    },
    // Multiple middlewares with CSRF
    {
      code: `
        app.post('/submit', auth, csrfProtection, validate, handler);
      `,
    },
    // CSRF first in chain
    {
      code: `
        app.put('/update', csrf(), authenticate, handler);
      `,
    },
    // CSRF with express.Router()
    {
      code: `
        const router = express.Router();
        router.use(csrfProtection);
        router.post('/create', handler);
      `,
    },
    
    // ============================================
    // SAFE HTTP METHODS (no CSRF needed)
    // ============================================
    
    // GET request
    {
      code: `
        app.get('/users', handler);
      `,
    },
    // HEAD request
    {
      code: `
        app.head('/status', handler);
      `,
    },
    // OPTIONS request
    {
      code: `
        app.options('/cors', handler);
      `,
    },
    
    // ============================================
    // IGNORED PATTERNS (webhooks, APIs, etc.)
    // ============================================
    
    // Webhook route (explicitly ignored)
    {
      code: `
        app.post('/api/webhook', handler);
      `,
      options: [{ ignorePatterns: ['/api/webhook'] }],
    },
    // Stripe webhook
    {
      code: `
        app.post('/webhook/stripe', stripeHandler);
      `,
      options: [{ ignorePatterns: ['/webhook/.*'] }],
    },
    // GitHub webhook
    {
      code: `
        app.post('/hooks/github', githubHandler);
      `,
      options: [{ ignorePatterns: ['/hooks/.*'] }],
    },
    // Multiple ignore patterns
    {
      code: `
        app.post('/internal/health', healthHandler);
        app.post('/webhook/payment', paymentHandler);
      `,
      options: [{ ignorePatterns: ['/internal/.*', '/webhook/.*'] }],
    },
    // API with JWT auth (no CSRF needed for token-based auth)
    {
      code: `
        app.post('/api/v1/resource', handler);
      `,
      options: [{ ignorePatterns: ['/api/.*'] }],
    },
    
    // ============================================
    // TEST FILE HANDLING
    // ============================================
    
    // Test file with allowInTests
    {
      code: `
        app.post('/login', handler);
      `,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // Spec file
    {
      code: `
        app.put('/update', handler);
      `,
      options: [{ allowInTests: true }],
      filename: 'routes.spec.js',
    },
    
    // ============================================
    // FALSE POSITIVE PREVENTION
    // ============================================
    
    // Not Express - different framework (Fastify-like)
    {
      code: `
        server.post('/route', handler);
      `,
    },
    // Method on custom object (not Express app/router)
    {
      code: `
        customApi.post('/data', handler);
      `,
    },
    // Class method call
    {
      code: `
        this.controller.post('/resource', handler);
      `,
    },
    // Chained app creation with CSRF
    {
      code: `
        const app = express();
        app.use(helmet());
        app.use(csrf());
        app.use(cors());
        app.post('/secure', handler);
      `,
    },
  ],
  
  invalid: [
    // ============================================
    // MISSING CSRF - SHOULD FLAG
    // ============================================
    
    // POST without CSRF
    {
      code: `
        app.post('/login', handler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // PUT without CSRF
    {
      code: `
        app.put('/users/:id', handler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // DELETE without CSRF
    {
      code: `
        app.delete('/users/:id', handler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // PATCH without CSRF
    {
      code: `
        router.patch('/profile', updateProfile);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Multiple routes without CSRF
    {
      code: `
        app.post('/login', loginHandler);
        app.put('/settings', settingsHandler);
      `,
      errors: [
        { messageId: 'missingCsrf' },
        { messageId: 'missingCsrf' },
      ],
    },
    // Express app with other middleware but no CSRF
    {
      code: `
        const app = express();
        app.use(helmet());
        app.use(cors());
        app.post('/form', formHandler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Router without CSRF
    {
      code: `
        const router = express.Router();
        router.post('/create', createHandler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Inline express.Router().post() pattern
    {
      code: `
        express.Router().post('/inline-create', handler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Inline express().post() pattern
    {
      code: `
        express().post('/inline-express', handler);
      `,
      errors: [{ messageId: 'missingCsrf' }],
    },
    // Test file WITHOUT allowInTests option
    {
      code: `
        app.post('/test-route', handler);
      `,
      filename: 'app.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingCsrf' }],
    },
  ],
});
