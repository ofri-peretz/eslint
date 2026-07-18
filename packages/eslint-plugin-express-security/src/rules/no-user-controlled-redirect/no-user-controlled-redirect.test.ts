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

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('no-user-controlled-redirect (coverage wave)', noUserControlledRedirect, {
  valid: [
    // bare call — callee is not a member expression
    { code: `redirect(req.query.url);` },
    // computed member access on the response object
    { code: `res['redirect'](req.query.url);` },
    // response object is itself a member expression
    { code: `a.res.redirect(req.query.url);` },
    // unknown response object name
    { code: `foo.redirect(req.query.url);` },
    // no arguments
    { code: `res.redirect();` },
    // argument is a non-request member expression
    { code: `res.redirect(config.url);` },
    // root of the chain is not an identifier
    { code: `res.redirect(a.req.query.url);` },
    // computed source property — not an Identifier
    { code: `res.redirect(req['query'].url);` },
    // non user-source property
    { code: `res.redirect(req.session.url);` },
    // two-level access with a computed property
    { code: `res.redirect(req['query']);` },
    // safe literal
    { code: `res.redirect('/home');` },
  ],
  invalid: [
    { code: `reply.redirect(req.query.url);`, errors: [{ messageId: 'openRedirect' }] },
    { code: `response.location(request.query.next);`, errors: [{ messageId: 'openRedirect' }] },
    { code: `res.redirect(ctx.params.slug);`, errors: [{ messageId: 'openRedirect' }] },
    // custom response object via options
    {
      code: `appRes.redirect(req.query.url);`,
      options: [{ responseObjects: ['appRes'] }],
      errors: [{ messageId: 'openRedirect' }],
    },
    // custom request object via options
    {
      code: `res.redirect(myReq.body.target);`,
      options: [{ requestObjects: ['myReq'] }],
      errors: [{ messageId: 'openRedirect' }],
    },
    // whole user-source object (two levels)
    { code: `res.redirect(req.query);`, errors: [{ messageId: 'openRedirect' }] },
    // computed leaf property on a user source
    { code: `res.redirect(req.body['to']);`, errors: [{ messageId: 'openRedirect' }] },
  ],
});
