/**
 * @fileoverview Tests for no-pii-in-logs
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noPiiInLogs } from './index';

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

ruleTester.run('no-pii-in-logs', noPiiInLogs, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
    { code: "console.log('Status:', status)" },
    { code: "console.info('Count:', count)" },
    // Callee is not a MemberExpression at all — fails the first condition
    // of the console.log/error/warn/info type-guard chain.
    { code: "log(user.email)" },
    // MemberExpression callee, but the object is not `console`.
    { code: "logger.log(user.email)" },
    // `console` object, but the method is not one of log/error/warn/info.
    { code: "console.debug(user.email)" },
    // MemberExpression argument whose property name matches none of the
    // PII keywords — exercises the `piiProps.some(...)` false outcome.
    { code: "console.log(user.name)" },
  ],

  invalid: [
    { code: "console.log(user.email)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log('email:', value)", errors: [{ messageId: 'violationDetected' }] },
    { code: "console.log(data.ssn)", errors: [{ messageId: 'violationDetected' }] }
  ],
});

/**
 * Regression locks — each FAILS on the pre-fix rule.
 *
 * 1. FALSE POSITIVES. The rule matched its PII vocabulary with
 *    `propName.includes(term)`, so every English word that happens to contain
 *    a shorter one was reported. `console.log(device.microphoneEnabled)` — a
 *    WebRTC capability boolean — was reported as "PII in console logs" because
 *    `phone` ⊂ `microphone`. Whole-word segment matching fixes the class.
 * 2. The string-literal check was `text.includes('email:')`, which reported
 *    UI copy that merely NAMES a form field. A literal is a compile-time
 *    constant and cannot hold anyone's data; it can only LABEL a sibling
 *    argument, so it now has to be exactly a label with a value after it.
 * 3. FALSE NEGATIVES. Only an argument that was ITSELF a MemberExpression was
 *    inspected, so the four commonest ways to log the very same field —
 *    interpolation, concatenation, a structured-log object, a TS cast — all
 *    passed silently, as did one destructuring hop.
 */
ruleTester.run('lock: PII vocabulary matches whole words, not substrings', noPiiInLogs, {
  valid: [
    // phone ⊂ microphone / headphones / smartphone / saxophone
    { code: 'console.log(device.microphoneEnabled)' },
    { code: 'console.info(inventory.headphonesInStock)' },
    { code: 'console.info(inventory.smartphoneCaseSku)' },
    // password ⊂ passwordless — the opposite meaning
    { code: 'console.log(authConfig.passwordlessEnabled)' },
    // credit card must be consecutive segments, so wildcard is not a card
    { code: 'console.log(policy.wildcardPolicy)' },
    // A literal naming a form field is not the field's value.
    { code: "console.error('Validation failed - email: must be a valid address')" },
    // A call is not value-preserving: the digest is logged, not the address.
    { code: 'console.log(account.id, correlationId(account.email))' },
  ],
  invalid: [
    // The whole-word terms still fire, including the two-word one.
    {
      code: 'console.error("Charge declined for card", order.creditCardNumber)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'console.log(customer.phoneNumber)',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

ruleTester.run('lock: PII reached through value-preserving syntax', noPiiInLogs, {
  valid: [],
  invalid: [
    // Template interpolation
    {
      code: 'console.log(`reset issued to ${user.email}`)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // String concatenation
    {
      code: "console.log('Contacting customer at ' + customer.emailAddress)",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Structured-log object literal
    {
      code: "console.info({ stage: 'underwriting', applicantSsn: applicant.ssn })",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Ternary arm
    {
      code: 'console.log(verbose ? user.email : user.id)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // One destructuring hop
    {
      code: 'const { email } = applicant; console.log("KYC submitted", email);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // One declarator hop
    {
      code: 'const contact = applicant.email; console.log("KYC submitted", contact);',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

ruleTester.run('lock: TypeScript casts do not hide the field read', noPiiInLogs, {
  valid: [
    // Unresolvable identifier: no binding, so no evidence, so no report.
    { code: 'console.log(unknownValue)' },
    // Declarator whose init is not a field read at all.
    { code: 'const total = 42; console.log(total);' },
  ],
  invalid: [
    {
      code: 'declare const payment: { creditCardLast4: unknown }; console.warn("refund", payment.creditCardLast4 as string);',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

ruleTester.run('coverage - a binding that is not a declarator or pattern property', noPiiInLogs, {
  valid: [
    // A function PARAMETER named `email` resolves to a definition with no
    // initialiser and no destructuring key, so there is no evidence to read.
    { code: 'function notify(email) { console.log(email); }' },
    // A BinaryExpression that is not concatenation does not carry a value
    // through to the output the way `+` does.
    { code: 'console.log("over age", customer.age > 18)' },
    // A spread element in a structured-log object is not a Property.
    { code: 'console.info({ ...baseFields, stage: "underwriting" })' },
  ],
  invalid: [],
});
