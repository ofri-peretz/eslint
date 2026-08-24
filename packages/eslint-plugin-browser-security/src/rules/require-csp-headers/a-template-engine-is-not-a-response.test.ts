/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `nunjucksEnv.render(…)` returns a string. `res.render(…)` sends a response.
 *
 * Hand-verification run 2026-08-24 against
 * ministryofjustice/hmpps-arns-assessment-platform-ui. The rule matched the
 * METHOD NAME alone, so every Nunjucks component module and every component
 * test drew a finding: 31 reports, the single largest block in that scan, on a
 * repository that already sets a nonce-based CSP in `setUpWebSecurity.ts`.
 *
 * Twenty-nine of the 31 were in `*.test.ts` — a test that renders a template
 * to assert on its markup is not a route serving a document — so the rule also
 * takes `skipTestFiles`.
 *
 * Asking a template helper to set an HTTP header is asking for something it
 * cannot do, which is the shape of a finding nobody can action.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { requireCspHeaders } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'require-csp-headers — a template engine is not a response',
  requireCspHeaders,
  {
    valid: [
      // The corpus shape: an environment render that returns markup.
      `function createRenderer(templatePath) {
         return (props, nunjucksEnv) => nunjucksEnv.render(templatePath, { params: props });
       }`,
      // An alias resolves to what it was declared as, and the declaration
      // outranks the name. Review's case: spelling a renderer `res` must not
      // make it a response.
      `const res = nunjucksEnv;
       const html = res.render('index');`,
      // skipTestFiles, isolated from receiver filtering: a real response
      // object, in a file named like a test.
      {
        code: `app.get('/', (req, res) => { res.render('index'); });`,
        filename: 'component.test.ts',
      },
      // The other engines with the same method name.
      `const html = mustache.render(template, view);`,
      `const out = ejs.render(str, data);`,
      `const markup = ReactDOMServer.render(element);`,
      // Configuring the list REPLACES the default, so the built-in names stop
      // matching — which is what makes the option able to narrow as well as
      // widen.
      {
        code: `function handler(res) { res.render('index'); }`,
        options: [{ responseReceivers: ['httpRes'] }],
      },
    ],
    invalid: [
      // The real thing still reports — a response object rendering a view.
      {
        code: `app.get('/', (req, res) => { res.render('index'); });`,
        errors: 1,
      },
      // Fastify names it `reply`, and `this.res` / `ctx.res` are the same
      // object one member deep.
      {
        code: `app.get('/', (req, reply) => { reply.render('index'); });`,
        errors: 1,
      },
      { code: `function handler(ctx) { ctx.res.render('index'); }`, errors: 1 },
      // A house convention that names it something else configures the list
      // rather than losing the finding.
      {
        code: `function handler(httpRes) { httpRes.render('index'); }`,
        options: [{ responseReceivers: ['httpRes'] }],
        errors: 1,
      },
    ],
  },
);
