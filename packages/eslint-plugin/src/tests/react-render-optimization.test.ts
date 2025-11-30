/**
 * Comprehensive tests for react-render-optimization rule
 * Performance: Detects unnecessary re-renders and expensive computations
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { reactRenderOptimization } from '../rules/performance/react-render-optimization';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('react-render-optimization', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - optimized props', reactRenderOptimization, {
      valid: [
        {
          code: `
            const data = { x: 1 };
            <Component data={data} />
          `,
        },
        {
          code: `
            const handler = useCallback(() => {}, []);
            <Component onClick={handler} />
          `,
        },
        {
          code: `
            const items = useMemo(() => [1, 2, 3], []);
            <Component items={items} />
          `,
        },
        {
          code: `
            <Component value={42} />
          `,
        },
        {
          code: `
            // Test file - should be ignored
            <Component data={{ x: 1 }} />
          `,
          filename: 'test.spec.tsx',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Inline Props', () => {
    ruleTester.run('invalid - inline object array function props', reactRenderOptimization, {
      valid: [],
      invalid: [
        {
          code: `
            <Component data={{ x: 1 }} />
          `,
          errors: [{ messageId: 'unnecessaryRerender' }],
        },
        {
          code: `
            <Component items={[1, 2, 3]} />
          `,
          errors: [{ messageId: 'unnecessaryRerender' }],
        },
        {
          code: `
            <Component onClick={() => {}} />
          `,
          errors: [{ messageId: 'unnecessaryRerender' }],
        },
        {
          code: `
            <Component handler={function() {}} />
          `,
          errors: [{ messageId: 'unnecessaryRerender' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - disable inline props detection', reactRenderOptimization, {
      valid: [
        {
          code: `
            <Component data={{ x: 1 }} />
          `,
          options: [{ detectInlineProps: false }],
        },
      ],
      invalid: [
        {
          code: `
            <Component onClick={() => {}} />
          `,
          options: [{ detectInlineProps: false, detectInlineFunctions: true }],
          errors: [{ messageId: 'unnecessaryRerender' }],
        },
      ],
    });
  });
});

