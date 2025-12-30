import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExpressUnsafeRegexRoute } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-express-unsafe-regex-route', noExpressUnsafeRegexRoute, {
  valid: [
    // Simple string routes
    {
      code: `app.get('/api/users', handler)`,
    },
    {
      code: `app.post('/api/users/:id', handler)`,
    },
    {
      code: `router.get('/products/:id/details', handler)`,
    },
    // Simple regex routes
    {
      code: `app.get(/^\\/api\\/users$/, handler)`,
    },
    {
      code: `app.get(/^\\/products\\/[0-9]+$/, handler)`,
    },
    // Non-route methods
    {
      code: `app.listen(3000)`,
    },
    {
      code: `app.set('view engine', 'ejs')`,
    },
    // Test file with allowInTests
    {
      code: `app.get('/api/:path+', handler)`,
      filename: 'test.spec.ts',
      options: [{ allowInTests: true }],
    },
  ],
  invalid: [
    // Vulnerable regex: nested quantifiers - simpler pattern
    {
      code: `app.get(/(a+)+/, handler)`,
      errors: [{ messageId: 'unsafeRegexRoute' }],
    },
    // Vulnerable regex: overlapping alternatives with quantifier
    {
      code: `app.get(/(a|ab)+/, handler)`,
      errors: [{ messageId: 'unsafeRegexRoute' }],
    },
    // Vulnerable param patterns: :param+
    {
      code: `app.get('/api/:path+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // Vulnerable param patterns: :param*
    {
      code: `app.get('/api/:path*', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // Router methods
    {
      code: `router.get('/files/:file+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // Different HTTP methods
    {
      code: `app.post('/api/:id+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    {
      code: `app.put('/api/:id+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    {
      code: `app.delete('/api/:id+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // app.all and app.use
    {
      code: `app.all('/api/:path+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    {
      code: `app.use('/api/:path+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // new RegExp() with vulnerable pattern
    {
      code: `app.get(new RegExp('(a+)+'), handler)`,
      errors: [{ messageId: 'unsafeRegexRoute' }],
    },
  ],
});
