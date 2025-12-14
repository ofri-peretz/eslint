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
