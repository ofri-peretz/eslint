/**
 * Comprehensive tests for no-unnecessary-rerenders rule
 * Performance: React-specific - Detects prevented re-renders
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnnecessaryRerenders } from '../../rules/performance/no-unnecessary-rerenders';

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

describe('no-unnecessary-rerenders', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - memoized values', noUnnecessaryRerenders, {
      valid: [
        // Primitive values
        {
          name: 'a string prop',
          code: '<Component prop="value" />',
        },
        {
          code: '<Component count={5} />',
        },
        // Variables (not inline)
        {
          code: 'const data = { x: 1 }; <Component data={data} />',
        },
        // Test files (if ignoreInTests is true)
        {
          code: '<Component onClick={() => {}} />',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
        {
          // burgee sweep 2026-09-23: ignoreInTests missed .[cm]js/.[cm]ts test files
          // (compat-oracle/vendor/commander/tests/*.test.cjs); matches reliability #1080.
          name: 'ignoreInTests also skips an ESM test file (.test.mjs)',
          code: '<Component onClick={() => {}} />',
          filename: 'test.test.mjs',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Unnecessary Rerenders', () => {
    ruleTester.run('invalid - inline objects arrays functions', noUnnecessaryRerenders, {
      valid: [],
      invalid: [
        {
          name: 'an object literal prop — a new identity every render',
          code: '<Component data={{ x: 1 }} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Set minSize to 1 and explicitly disable test ignoring
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
        {
          code: '<Component items={[1, 2, 3]} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Set minSize to 1 and explicitly disable test ignoring
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
        {
          code: '<Component onClick={() => {}} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Functions always report regardless of minSize
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
        {
          code: '<Component handler={function() {}} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 1, ignoreInTests: false }], // Functions always report regardless of minSize
          errors: [{
            messageId: 'unnecessaryRerender',
          }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noUnnecessaryRerenders, {
      valid: [
        {
          code: '<Component onClick={() => {}} />',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: '<Component onClick={() => {}} />',
          filename: 'test.spec.tsx',
          options: [{ ignoreInTests: false }],
          errors: [{
            messageId: 'unnecessaryRerender',
            // Rule provides suggestions (hasSuggestions: true and suggest in context.report)
            // but test framework may not attach them in all cases
          }],
        },
      ],
    });

    ruleTester.run('options - minSize', noUnnecessaryRerenders, {
      valid: [
        {
          code: '<Component data={{ x: 1, y: 2, z: 3 }} />',
          options: [{ minSize: 5 }], // Below threshold
        },
      ],
      invalid: [
        {
          code: '<Component data={{ x: 1, y: 2, z: 3, a: 4, b: 5 }} />',
          filename: 'component.tsx', // Explicit filename to avoid test file detection
          options: [{ minSize: 5, ignoreInTests: false }], // Explicitly disable test ignoring
          errors: [{
            messageId: 'unnecessaryRerender',
            // Rule provides suggestions (hasSuggestions: true and suggest in context.report)
            // but test framework may not attach them in all cases
          }],
        },
      ],
    });
  });
});

/**
 * The reported expression is interpolated into the devkit's message format, whose first
 * line is `[Icon] ... | [Description] | [SEVERITY]` and whose second is `   Fix: ... | [link]`
 * (see packages/eslint-devkit/src/messaging/formatters.ts). A multi-line prop — the common
 * case for an object big enough to trip `minSize` — used to be interpolated raw, which
 * broke line 1 down to the bare token `\u26a1 {` and pushed `| MEDIUM` and the `Fix:` line
 * into the middle of the message. Any first-line-only consumer (ESLint's own `unix` and
 * `compact` formatters, an editor gutter preview) then showed only `\u26a1 {`.
 */
describe('no-unnecessary-rerenders — message stays on the documented two lines', () => {
  ruleTester.run('multi-line prop keeps the format', noUnnecessaryRerenders, {
    valid: [],
    invalid: [
      {
        // burgee apps/docs/src/app/opengraph-image.tsx:15 — a multi-line style object
        // passed as a JSX prop.
        name: 'a multi-line object prop collapses to one line, severity stays on line 1',
        code: [
          'const a = (',
          '  <Component data={{',
          "    width: '100%',",
          "    height: '100%',",
          "    display: 'flex',",
          "    alignItems: 'center',",
          "    justifyContent: 'center',",
          '  }} />',
          ');',
        ].join('\n'),
        filename: 'component.tsx',
        options: [{ minSize: 5, ignoreInTests: false }],
        errors: [
          {
            message:
              "\u26a1 { width: '100%', height: '100%', display: 'flex',  causes unnecessary re-renders | MEDIUM\n" +
              "   Fix: Use useMemo or useCallback to memoize { width: '100%', height: '100%', display: 'flex',  | https://react.dev/reference/react/useMemo",
          },
        ],
      },
    ],
  });
});
