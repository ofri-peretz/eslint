import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUserControlledRedirect } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-user-controlled-redirect', () => {
  ruleTester.run('no-user-controlled-redirect', noUserControlledRedirect, {
    valid: [
      // Literal redirect — always safe
      { code: `res.redirect('/dashboard');` },
      { code: `res.redirect(301, '/login');` },
      // Validated with allowlist
      {
        code: `
          const ALLOWED = ['/home', '/dashboard'];
          const url = req.query.next;
          if (ALLOWED.includes(url)) res.redirect(url);
        `,
      },
      // Indirect — variable holds the value, not direct member access
      {
        code: `
          const next = req.query.next;
          res.redirect(next);
        `,
      },
      // Not a redirect call
      { code: `res.send(req.query.message);` },
      { code: `res.json({ url: req.body.url });` },
      // Numeric status code + literal target
      { code: `response.redirect(302, '/logout');` },
    ],
    invalid: [
      // Direct req.query access
      {
        code: `res.redirect(req.query.returnUrl);`,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.query' } }],
      },
      // Direct req.body access
      {
        code: `res.redirect(req.body.next);`,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.body' } }],
      },
      // Direct req.params access
      {
        code: `res.redirect(req.params.slug);`,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.params' } }],
      },
      // Direct req.headers access
      {
        code: `res.redirect(req.headers['x-redirect-to']);`,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.headers' } }],
      },
      // response alias
      {
        code: `response.redirect(request.query.url);`,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.query' } }],
      },
      // res.location()
      {
        code: `res.location(req.query.back);`,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.query' } }],
      },
      // Whole query object
      {
        code: `res.redirect(req.query);`,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.query' } }],
      },
      // Inside a route handler
      {
        code: `
          app.get('/login', (req, res) => {
            res.redirect(req.query.next);
          });
        `,
        errors: [{ messageId: 'openRedirect', data: { source: 'req.query' } }],
      },
      // With custom names via options
      {
        code: `reply.redirect(ctx.query.url);`,
        options: [{ responseObjects: ['reply'], requestObjects: ['ctx'] }],
        errors: [{ messageId: 'openRedirect', data: { source: 'req.query' } }],
      },
    ],
  });
});
