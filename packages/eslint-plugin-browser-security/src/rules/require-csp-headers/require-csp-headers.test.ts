/**
 * @fileoverview Tests for require-csp-headers
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireCspHeaders } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-csp-headers', requireCspHeaders, {
  valid: [
    // JSON responses don't need CSP
    { code: "res.send({ data: 'json' })" },
    { code: "res.json({ status: 'ok' })" },
    // Non-HTML strings
    { code: "res.send('Hello World')" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Sending HTML without CSP
    { code: "res.send('<html><body>Hello</body></html>')", errors: [{ messageId: 'violationDetected' }] },
    { code: "res.send('<!DOCTYPE html><html></html>')", errors: [{ messageId: 'violationDetected' }] },
    { code: "res.send(`<html>${content}</html>`)", errors: [{ messageId: 'violationDetected' }] },
    // Render calls need CSP
    { code: "res.render('index')", errors: [{ messageId: 'violationDetected' }] },
    { code: "res.render('template', { data })", errors: [{ messageId: 'violationDetected' }] },
  ],
});

/**
 * Regression lock — helmet sets Content-Security-Policy by default, so it IS the fix this
 * rule recommends. Reporting `res.render()` in a file that already installs helmet tells the
 * reader to do what they have done; it fired on a clean benchmark fixture that called
 * `app.use(helmet())` three lines earlier.
 *
 * Detected from the AST (import / require binding), never from printed source.
 */
ruleTester.run('lock: helmet in scope suppresses the render reminder', requireCspHeaders, {
  valid: [
    { code: "import helmet from 'helmet'; app.use(helmet()); res.render('index');" },
    { code: "import { contentSecurityPolicy } from 'helmet/index'; app.use(contentSecurityPolicy()); res.render('index');" },
    { code: "const helmet = require('helmet'); app.use(helmet()); res.render('index');" },
  ],
  invalid: [
    // An unrelated import must not count as helmet.
    {
      code: "import express from 'express'; res.render('index');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Nor an unrelated require, including one whose name merely starts similarly.
    {
      code: "const helmetish = require('helmetish'); res.render('index');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A non-literal require argument cannot be resolved, so it is not evidence.
    {
      code: "const mod = require(name); res.render('index');",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
