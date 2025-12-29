/**
 * Tests for no-timestamp-manipulation rule
 * Security: LightSEC 2025 - "Back to the Future" Attack
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimestampManipulation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-timestamp-manipulation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - default timestamps', noTimestampManipulation, {
      valid: [
        { code: `jwt.sign(payload, secret);` },
        { code: `jwt.sign(payload, secret, {});` },
        { code: `jwt.sign(payload, secret, { expiresIn: '1h' });` },
        { code: `jwt.sign(payload, secret, { noTimestamp: false });` },
        { code: `jwt.verify(token, secret);` }, // verify not checked
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - noTimestamp true', noTimestampManipulation, {
      valid: [],
      invalid: [
        {
          code: `jwt.sign(payload, secret, { noTimestamp: true });`,
          errors: [{ messageId: 'noTimestampTrue' }],
        },
        {
          code: `jwt.sign(payload, secret, { algorithm: 'RS256', noTimestamp: true });`,
          errors: [{ messageId: 'noTimestampTrue' }],
        },
      ],
    });
  });
});
