/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noPiiInLogs } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const pii = [{ messageId: 'violationDetected' as const }];

describe('no-pii-in-logs (mutation edges)', () => {
  ruleTester.run('no-pii-in-logs', noPiiInLogs, {
    valid: [
      {
        name: 'JSON.parse is not JSON.stringify',
        code: 'console.log(JSON.parse(user.emailJson));',
      },
      {
        name: 'a dynamically keyed field names nothing',
        code: 'console.log(user[key]);',
      },
      {
        name: 'a logger reached through a call is not judged',
        code: 'getLogger().info(user.email);',
      },
      {
        name: 'a boolean test of a PII field does not log the value',
        code: 'console.log(!user.email, typeof user.phone, user.ssn % 10);',
      },
      {
        name: 'a number argument is not a label',
        code: 'console.log(42, total);',
      },
      {
        name: 'a label with nothing after it labels nothing',
        code: "console.log('email:');",
      },
    ],
    invalid: [
      {
        name: 'an SSN followed by text is an SSN',
        code: "logger.info('SSN 123-45-6789 on file');",
        errors: pii,
      },
      {
        name: 'a card number followed by text is a card number',
        code: "console.log('card 4111 1111 1111 1111 on file');",
        errors: pii,
      },
      {
        name: 'a Luhn-valid card whose doubled digits exceed nine is a card number',
        code: "console.log('5555555555554444');",
        errors: pii,
      },
      {
        name: 'the binding is resolved by its own reference, not the first in scope',
        code: 'const other = 1; const { email } = applicant; console.log(email);',
        errors: pii,
      },
      {
        name: 'a stringified patient record is a person record',
        code: 'console.log(JSON.stringify(patient));',
        errors: pii,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a quoted destructuring key names the field',
        code: "const { 'email': e } = applicant; console.log(e);",
        errors: pii,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a destructuring default keeps the field',
        code: "const { email = '' } = applicant; console.log(email);",
        errors: pii,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a unary plus around a PII field still logs the value',
        // @found mutation testing
        code: 'logger.info(+user.phone);',
        errors: pii,
      },
      {
        name: 'FN: invertible arithmetic on a PII field still logs the value',
        // @found mutation testing
        code: 'console.log(user.ssn * 1);',
        errors: pii,
      },
      {
        name: 'FN: a negated PII field still logs the value',
        // @found mutation testing
        code: 'console.log(-account.phone);',
        errors: pii,
      },
      {
        name: 'a configured label is matched after trimming',
        options: [{ piiLabels: ['  dob:  '] }],
        code: "console.log('dob:', value);",
        errors: pii,
      },
    ],
  });
});
