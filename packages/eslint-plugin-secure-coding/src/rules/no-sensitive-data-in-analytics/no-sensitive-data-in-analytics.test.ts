/**
 * @fileoverview Tests for no-sensitive-data-in-analytics
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveDataInAnalytics } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-sensitive-data-in-analytics', noSensitiveDataInAnalytics, {
  valid: [
    // Non-sensitive analytics
    { code: "analytics.track('page_view', { page: '/home' })" },
    { code: "analytics.track('click', { element: 'button', action: 'submit' })" },
    { code: "gtag('event', 'click', { element: 'button' })" },
    // Non-analytics code
    { code: "const x = 1" },
  ],

  invalid: [
    // Email in analytics
    { code: "analytics.track('signup', { email: user.email })", errors: [{ messageId: 'violationDetected' }] },
    { code: "analytics.track('login', { userEmail: email })", errors: [{ messageId: 'violationDetected' }] },
    // SSN
    { code: "analytics.track('verify', { ssn: userSSN })", errors: [{ messageId: 'violationDetected' }] },
    // Credit card
    { code: "analytics.track('purchase', { creditcard: card })", errors: [{ messageId: 'violationDetected' }] },
    // Password
    { code: "analytics.track('auth', { password: pwd })", errors: [{ messageId: 'violationDetected' }] },
    // Phone
    { code: "analytics.track('contact', { phone: number })", errors: [{ messageId: 'violationDetected' }] },
    // Address
    { code: "analytics.track('order', { address: addr })", errors: [{ messageId: 'violationDetected' }] },
    // Multiple sensitive fields
    { code: "analytics.track('profile', { email: e, phone: p })", errors: [{ messageId: 'violationDetected' }, { messageId: 'violationDetected' }] },
  ],
});
