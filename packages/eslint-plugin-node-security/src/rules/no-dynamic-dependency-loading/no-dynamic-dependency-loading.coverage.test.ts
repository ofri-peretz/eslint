/**
 * Coverage-gap tests for no-dynamic-dependency-loading (Layer 1).
 * Targets: dynamic import() with a static string literal (allowed path).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicDependencyLoading } from './index';

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

describe('no-dynamic-dependency-loading coverage gaps', () => {
  ruleTester.run('no-dynamic-dependency-loading', noDynamicDependencyLoading, {
    valid: [
      // import() with a literal source → Literal check suppresses report
      { code: 'import("node:fs");' },
    ],
    invalid: [],
  });
});
