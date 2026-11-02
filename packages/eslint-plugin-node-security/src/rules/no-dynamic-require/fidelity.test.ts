/**
 * no-dynamic-require — `allowContexts` had no documented meaning, so the Quint
 * fidelity model (benchmarks/suites/fidelity/models/node-security/no_dynamic_require.qnt)
 * could not cover it. The doc now states it — a substring test on the linted
 * file's path per context — and these lock what it states.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicRequire } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const LOAD = 'export function load(name: string) { return require(name); }';

describe('no-dynamic-require fidelity', () => {
  ruleTester.run('allowContexts', noDynamicRequire, {
    valid: [
      {
        name: 'test context covers a .test. file',
        code: LOAD,
        filename: 'src/loader.test.ts',
        options: [{ allowContexts: ['test'] }],
      },
      {
        name: 'config context covers a webpack config',
        code: LOAD,
        filename: 'webpack.config.ts',
        options: [{ allowContexts: ['config'] }],
      },
      {
        name: 'build context covers a scripts file',
        code: LOAD,
        filename: 'scripts/build-plugins.ts',
        options: [{ allowContexts: ['build'] }],
      },
      {
        name: 'runtime context covers a runtime directory',
        code: LOAD,
        filename: 'src/runtime/loader.ts',
        options: [{ allowContexts: ['runtime'] }],
      },
      {
        name: 'the match is a substring, so configure.ts is a config file',
        code: LOAD,
        filename: 'src/configure.ts',
        options: [{ allowContexts: ['config'] }],
      },
    ],
    invalid: [
      {
        name: 'a test file is not covered by the config context',
        code: LOAD,
        filename: 'src/loader.test.ts',
        options: [{ allowContexts: ['config'] }],
        errors: 1,
      },
      {
        name: 'a test file is reported with no allowContexts',
        code: LOAD,
        filename: 'src/loader.test.ts',
        errors: 1,
      },
    ],
  });
});
