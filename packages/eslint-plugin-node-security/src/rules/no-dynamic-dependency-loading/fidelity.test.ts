/**
 * no-dynamic-dependency-loading — the contract the Quint fidelity model
 * settled (benchmarks/suites/fidelity/models/node-security/no_dynamic_dependency_loading.qnt):
 * a choice between author-written literals is a static specifier. The doc used
 * to list it as a finding while its own "static" examples said otherwise; the
 * doc now states it, and this locks it.
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
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-dynamic-dependency-loading fidelity', () => {
  ruleTester.run('a choice between literals', noDynamicDependencyLoading, {
    valid: [
      {
        name: 'require of a const ternary between two literal names is static',
        code: `const libName = process.env.USE_ALT_LIB ? 'alt-lib' : 'main-lib';
export const loaded = require(libName);`,
      },
      {
        name: 'import() of a const ternary between two literal names is static',
        code: `const libName = process.env.USE_ALT_LIB ? 'alt-lib' : 'main-lib';
export const loaded = import(libName);`,
      },
    ],
    invalid: [
      {
        name: 'a ternary with a request value in a branch is not static',
        code: `export function load(req: any) { return require(req.query.alt ? req.query.lib : 'main-lib'); }`,
        errors: 1,
      },
    ],
  });
});
