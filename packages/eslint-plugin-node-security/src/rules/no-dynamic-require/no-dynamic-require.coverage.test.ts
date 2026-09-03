/**
 * Coverage-gap tests for no-dynamic-require.
 * Layer 1: every allowContexts filename branch (config/build/runtime).
 * Layer 2: `context.filename || ''` fallback with an empty filename, which
 * RuleTester always overrides. Uses createWithMockContext from
 * @interlace/eslint-devkit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noDynamicRequire } from './index';

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

describe('no-dynamic-require coverage gaps', () => {
  ruleTester.run('no-dynamic-require', noDynamicRequire, {
    valid: [
      // config context: filename matches 'config' / 'webpack' / 'rollup'
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['config'] }],
        filename: '/proj/app.config.js',
      },
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['config'] }],
        filename: '/proj/webpack.js',
      },
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['config'] }],
        filename: '/proj/rollup.js',
      },
      // build context: filename matches 'build' / 'scripts' / 'tools'
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['build'] }],
        filename: '/proj/builder.js',
      },
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['build'] }],
        filename: '/proj/scripts/x.js',
      },
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['build'] }],
        filename: '/proj/tools/x.js',
      },
      // runtime context: filename matches 'runtime' / 'dynamic'
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['runtime'] }],
        filename: '/proj/runtime.js',
      },
      {
        code: 'require(modulePath);',
        options: [{ allowContexts: ['runtime'] }],
        filename: '/proj/loads-dynamic.js',
      },
    ],
    invalid: [],
  });

  describe('Layer 2: empty context.filename', () => {
    it('instantiates with the empty-string fallback and still reports dynamic require', () => {
      const { listeners, reports } = createWithMockContext(
        noDynamicRequire as never,
        { filename: '' }
      );
      expect(typeof listeners.CallExpression).toBe('function');
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'require' },
        arguments: [{ type: 'Identifier', name: 'modulePath' }],
      });
      expect(reports).toHaveLength(1);
      expect((reports[0] as { messageId: string }).messageId).toBe(
        'dynamicRequire'
      );
    });
  });
});
