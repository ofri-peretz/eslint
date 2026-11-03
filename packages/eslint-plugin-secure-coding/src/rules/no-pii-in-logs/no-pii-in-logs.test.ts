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
    { code: 'const x = 42;', name: 'a numeric constant logs no PII' },
    'const flag = true;',
    'function noop() {}',
    'const items = [];',
    { name: 'a status value', code: "console.log('Status:', status)" },
    {
      name: 'logging a plain count is not PII',
      code: "console.info('Count:', count)",
    },
    // Callee is not a MemberExpression at all — fails the first condition
    // of the console.log/error/warn/info type-guard chain.
    { code: 'log(user.email)' },
    // MemberExpression callee, but the object is neither `console` nor a logger.
    { code: 'cache.log(user.email)' },
    // `console` object, but the method is not one of log/error/warn/info.
    { code: 'console.debug(user.email)' },
    // MemberExpression argument whose property name matches none of the
    // PII keywords — exercises the `piiProps.some(...)` false outcome.
    { code: 'console.log(user.name)' },
  ],

  invalid: [
    {
      name: 'an email address written to the log',
      code: 'console.log(user.email)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'logging a value under an email label',
      code: "console.log('email:', value)",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'logging data.ssn is reported',
      code: 'console.log(data.ssn)',
      errors: [{ messageId: 'violationDetected' }],
    },
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
ruleTester.run(
  'lock: PII vocabulary matches whole words, not substrings',
  noPiiInLogs,
  {
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
      {
        code: "console.error('Validation failed - email: must be a valid address')",
      },
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
  },
);

ruleTester.run(
  'lock: PII reached through value-preserving syntax',
  noPiiInLogs,
  {
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
  },
);

ruleTester.run(
  'lock: TypeScript casts do not hide the field read',
  noPiiInLogs,
  {
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
  },
);

ruleTester.run(
  'coverage - a binding that is not a declarator or pattern property',
  noPiiInLogs,
  {
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
  },
);

/**
 * The three vocabularies are options, and the default is exactly what shipped.
 *
 * Every `options: [{}]` case here is paired with the SAME code un-optioned in
 * the suites above, so a default that silently changed would show up as a
 * disagreement between the two rather than as a uniformly quiet rule.
 */
ruleTester.run(
  'options: vocabularies are configurable, defaults unchanged',
  noPiiInLogs,
  {
    valid: [
      // ---- the default is unchanged ----------------------------------------
      { code: 'console.log(device.microphoneEnabled)', options: [{}] },
      {
        code: "console.error('Validation failed - email: must be a valid address')",
        options: [{}],
      },

      // ---- replacing a vocabulary silences the built-ins --------------------
      // A telephony product logs `phone` fields all day and they are the device,
      // not a person. Narrowing the term list is the remedy.
      {
        code: 'console.log(handset.phoneNumber)',
        options: [{ piiTerms: ['ssn'] }],
      },
      // A codebase that ships nothing but `console.debug` to its log pipeline
      // and treats `console.log` as local scratch output.
      {
        code: 'console.log(user.email)',
        options: [{ consoleMethods: ['debug'] }],
      },
      // With the label list replaced, `email:` no longer announces its sibling.
      {
        code: "console.log('email:', value)",
        options: [{ piiLabels: ['ssn:'] }],
      },
      // Extending never removes: a term that is not in either list stays quiet.
      {
        code: 'console.log(user.nickname)',
        options: [{ additionalPiiTerms: ['passport'] }],
      },
      {
        code: 'console.table(user.email)',
        options: [{ additionalConsoleMethods: ['debug'] }],
      },
      {
        code: "console.log('nickname:', value)",
        options: [{ additionalPiiLabels: ['dob:'] }],
      },
    ],
    invalid: [
      // ---- the default is unchanged ----------------------------------------
      // Positive control for the `options: [{}]` valid cases: an empty bag still
      // reports what the built-in vocabularies report.
      {
        code: 'console.log(customer.phoneNumber)',
        options: [{}],
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "console.log('email:', contactValue)",
        options: [{}],
        errors: [{ messageId: 'violationDetected' }],
      },

      // ---- extending a vocabulary adds coverage -----------------------------
      // A passport number is PII and is not in the default five.
      {
        code: 'console.log("KYC", applicant.passportNumber)',
        options: [{ additionalPiiTerms: ['passport'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      // `console.debug` reaches the same pipeline on a service that ships debug.
      {
        code: 'console.debug(user.email)',
        options: [{ additionalConsoleMethods: ['debug'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      // A label the built-ins do not carry. Compared case-insensitively after
      // trimming, exactly like the built-ins.
      {
        code: 'console.log("DOB: ", record.value)',
        options: [{ additionalPiiLabels: ['dob:'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      // Full replacement widens just as well as it narrows.
      {
        code: 'console.log(applicant.passportNumber)',
        options: [{ piiTerms: ['passport'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'console.debug(user.email)',
        options: [{ consoleMethods: ['debug'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'console.log("dob:", record.value)',
        options: [{ piiLabels: ['dob:'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);

/**
 * The doc's own incorrect examples: an application logger is a sink, a
 * `JSON.stringify`ed person record leaks every field it holds, and a literal
 * email address, SSN or card number is PII in the line. All three were silent:
 * only `console.*` member reads were inspected.
 */
ruleTester.run(
  'doc contract: loggers, serialized records, literal PII',
  noPiiInLogs,
  {
    valid: [
      {
        name: 'a logger level method logging a non-PII field is clean',
        code: "logger.info('signed in', user.id)",
      },
      {
        name: 'a hashed value through a logger is the documented fix',
        code: "logger.info('signed in', hashStable(record.ssn))",
      },
      {
        name: 'a non-level method on a logger is not a sink',
        code: 'logger.child(user.email)',
      },
      {
        name: 'a method of a member receiver that is not a logger is not a sink',
        code: 'this.cache.info(user.email)',
      },
      {
        name: 'a runtime-keyed receiver names no logger',
        code: 'this[key].info(user.email)',
      },
      {
        name: 'serializing a non-person object is not a record leak',
        code: 'console.log(JSON.stringify(config))',
      },
      {
        name: 'serializing a computed expression names no record',
        code: 'console.log(JSON.stringify(getUser()))',
      },
      {
        name: 'JSON.stringify with no argument serializes nothing',
        code: 'console.log(JSON.stringify())',
      },
      {
        name: 'JSON.stringify of a spread argument names no record',
        code: 'console.log(JSON.stringify(...parts))',
      },
      {
        name: 'a stringify on some other receiver is not JSON serialization',
        code: 'console.log(qs.stringify(user))',
      },
      {
        name: 'a long order number that fails Luhn is not a card',
        code: "console.log('order 1234567890123')",
      },
      {
        name: 'a numeric literal is not PII text',
        code: 'console.log(42)',
      },
      {
        name: 'console.debug is not in the default console sinks even for a literal email',
        code: "console.debug('signed in', 'john.doe@example.com')",
      },
    ],
    invalid: [
      {
        name: 'a logger interpolating a card field is a sink',
        code: 'logger.info(`payment from ${customer.creditCard}`)',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a logger.log of an email field is a sink',
        code: 'logger.log(user.email)',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a NestJS-style this.logger is a sink',
        code: 'this.logger.error(record.ssn)',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a JSON.stringify-ed user record through a logger leaks its fields',
        code: 'logger.debug(JSON.stringify(user))',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a JSON.stringify-ed user record in a console template leaks its fields',
        code: 'console.error(`signed in ${JSON.stringify(user)}`)',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'JSON.stringify of a PII field serializes the field verbatim',
        code: 'console.log(JSON.stringify(user.email))',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a literal email address argument is PII',
        code: "console.log('signed in', 'john.doe@example.com')",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a literal email address in a template is PII',
        code: 'logger.info(`signed in john.doe@example.com`)',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a literal SSN is PII',
        code: "console.log('ssn 123-45-6789')",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a literal SSN in a no-substitution template is the same constant string',
        code: 'console.log(`ssn 123-45-6789`)',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a literal Luhn-valid card number is PII',
        code: "console.log('card 4111 1111 1111 1111')",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);

ruleTester.run('options: logger and record vocabularies', noPiiInLogs, {
  valid: [
    {
      name: 'loggers replaces the default receivers',
      code: 'logger.info(user.email)',
      options: [{ loggers: ['audit'] }],
    },
    {
      name: 'piiRecords replaces the default record words',
      code: 'console.log(JSON.stringify(user))',
      options: [{ piiRecords: ['member'] }],
    },
  ],
  invalid: [
    {
      name: 'additionalLoggers adds a receiver',
      code: 'audit.info(user.email)',
      options: [{ additionalLoggers: ['audit'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'additionalPiiRecords adds a record word',
      code: 'console.log(JSON.stringify(member))',
      options: [{ additionalPiiRecords: ['member'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
