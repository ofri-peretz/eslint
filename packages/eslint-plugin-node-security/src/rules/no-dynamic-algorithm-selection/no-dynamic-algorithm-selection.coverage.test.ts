/**
 * Coverage-gap tests for no-dynamic-algorithm-selection (dual-layer, Layer 1).
 * Targets: every early-return guard in the CallExpression listener.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicAlgorithmSelection } from './index';

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

describe('no-dynamic-algorithm-selection coverage gaps', () => {
  ruleTester.run('no-dynamic-algorithm-selection', noDynamicAlgorithmSelection, {
    valid: [
      // Callee is not a MemberExpression → first guard returns
      { code: 'doHash(algo);' },
      // Callee object is not an Identifier → second guard returns
      { code: 'getCrypto().createHash(algo);' },
      // Computed member with a Literal property → third guard returns
      { code: 'crypto["createHash"](algo);' },
      // Matching crypto method but zero arguments → firstArg guard returns
      { code: 'crypto.createHash();' },
    ],
    invalid: [],
  });
});
