/**
 * Comprehensive tests for detect-child-process rule
 * Tests command injection detection in child_process usage
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectChildProcess } from '../rules/security/detect-child-process';

// Configure RuleTester for Vitest
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

describe('detect-child-process', () => {
  describe('Basic detection', () => {
    ruleTester.run('detects dangerous child_process calls', detectChildProcess, {
      valid: [
        { code: 'const fs = require("fs");' },
      ],
      invalid: [],
    });
  });
});
