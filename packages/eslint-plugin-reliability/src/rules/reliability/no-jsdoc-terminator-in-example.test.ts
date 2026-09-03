/**
 * Tests for no-jsdoc-terminator-in-example rule
 * Detects dangerous `* /` sequences inside JSDoc @example blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import {
  noJsdocTerminatorInExample,
  findTerminatorsInExamples,
} from './no-jsdoc-terminator-in-example';

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

describe('no-jsdoc-terminator-in-example', () => {
  describe('Valid Code — Safe @example blocks', () => {
    ruleTester.run(
      'valid - normal JSDoc without @example',
      noJsdocTerminatorInExample,
      {
        valid: [
          // Normal JSDoc without @example
          {
            code: `
              /**
               * Fetches a resource.
               * @param url - The URL
               * @returns The response
               */
              function fetch(url) {}
            `,
          },
          // @example without any terminator inside
          {
            code: `
              /**
               * Adds two numbers.
               * @example
               * add(1, 2); // 3
               */
              function add(a, b) { return a + b; }
            `,
          },
          // @example with quoted content — already safe
          {
            code: `
              /**
               * Sets the content type.
               * @example
               * setHeader('Content-Type', 'text/html');
               */
              function setHeader(name, value) {}
            `,
          },
          // Single-line comments should never trigger
          {
            code: `
              // @example some comment
              function foo() {}
            `,
          },
          // Empty @example
          {
            code: `
              /**
               * @example
               */
              function foo() {}
            `,
          },
          // MIME-like text in description (not @example) is fine
          {
            code: `
              /**
               * A MIME type like text/html
               * @param type - The MIME type
               */
              function setType(type) {}
            `,
          },
          // @example with safe code patterns
          {
            code: `
              /**
               * Divides two numbers.
               * @example
               * divide(10, 2); // 5
               * @param a - dividend
               * @param b - divisor
               */
              function divide(a, b) { return a / b; }
            `,
          },
          // @example that exits scope with another @tag before any terminator
          {
            code: `
              /**
               * @example
               * safe code
               * @returns something
               */
              function bar() {}
            `,
          },
          // Block comment without @example containing */ -like text won't trigger
          {
            code: `
              /**
               * This is a normal comment
               * Nothing dangerous here
               */
              function baz() {}
            `,
          },
        ],
        invalid: [],
      },
    );
  });

  // ---------------------------------------------------------------------
  // Layer 2 — direct unit tests. A real parser terminates the enclosing
  // block comment at the first star-slash, so comment values containing one
  // can never reach this rule through a normally-parsed file.
  // ---------------------------------------------------------------------

  const T = '*' + String('/'); // avoids a raw terminator sequence in this file's source

  describe('Layer 2: findTerminatorsInExamples', () => {
    it('flags a terminator inside an @example block at its exact offset', () => {
      const text = ['@example', 'glob: ' + T + ' pattern', 'trailing'].join('\n');
      expect(findTerminatorsInExamples(text)).toEqual([text.indexOf(T)]);
    });

    it('does not flag the final terminator that closes the comment', () => {
      const text = '@example\ncode ' + T;
      expect(findTerminatorsInExamples(text)).toEqual([]);
    });

    it('stops flagging after another JSDoc tag ends the example scope', () => {
      const text = ['@example', 'safe', '@returns x', 'has ' + T + ' here'].join('\n');
      expect(findTerminatorsInExamples(text)).toEqual([]);
    });

    it('does not treat @examples (prefix word) as a scope boundary or opener', () => {
      const text = ['@examples', T + ' x', 'rest'].join('\n');
      // @examples never opened an example block → nothing flagged
      expect(findTerminatorsInExamples(text)).toEqual([]);
    });

    it('flags every terminator on a line with multiple occurrences', () => {
      const line = 'a ' + T + ' b ' + T + ' c';
      const text = ['@example', line, 'more'].join('\n');
      const first = text.indexOf(T);
      const second = text.indexOf(T, first + 2);
      expect(findTerminatorsInExamples(text)).toEqual([first, second]);
    });

    it('skips example lines without terminators', () => {
      const text = ['@example', 'plain line', 'x ' + T + ' y', 'z'].join('\n');
      expect(findTerminatorsInExamples(text)).toEqual([text.indexOf(T)]);
    });
  });

  describe('Layer 2: Program listener with synthetic comments', () => {
    function runProgram(comments: unknown[]) {
      const { listeners, reports, context } = createWithMockContext(
        noJsdocTerminatorInExample,
        {},
      );
      Object.assign(context.sourceCode, {
        getAllComments: () => comments,
        getLocFromIndex: (index: number) => ({ line: 1, column: index }),
      });
      (listeners['Program'] as () => void)();
      return reports;
    }

    it('reports a dangerous terminator with suggestion at the mapped location', () => {
      const value = '*\n * @example\n * foo ' + T + ' bar\n ';
      const offset = findTerminatorsInExamples(value)[0];
      const comment = { type: 'Block', value, range: [10, 10 + value.length + 4] };
      const reports = runProgram([
        // Line comment → skipped by the Block-only filter
        { type: 'Line', value: ' @example ' + T, range: [0, 5] },
        // Block comment without @example → quick bail-out
        { type: 'Block', value: ' nothing here ', range: [6, 9] },
        comment,
      ]);

      expect(reports).toHaveLength(1);
      const report = reports[0] as TSESLint.ReportDescriptor<string> & {
        loc: TSESTree.SourceLocation;
        suggest: { messageId: string; fix: (f: TSESLint.RuleFixer) => unknown }[];
      };
      expect(report.messageId).toBe('jsdocTerminatorInExample');
      // range[0] + 2 (opening delimiter) + offset within the comment value
      const absoluteStart = 10 + 2 + offset;
      expect(report.loc.start).toEqual({ line: 1, column: absoluteStart });
      expect(report.loc.end).toEqual({ line: 1, column: absoluteStart + 2 });

      // The suggestion fix wraps the terminator in quotes
      const calls: unknown[] = [];
      const fixer = {
        replaceTextRange: (range: [number, number], text: string) => {
          calls.push([range, text]);
          return { range, text };
        },
      } as unknown as TSESLint.RuleFixer;
      expect(report.suggest).toHaveLength(1);
      expect(report.suggest[0].messageId).toBe('wrapInQuotes');
      report.suggest[0].fix(fixer);
      expect(calls).toEqual([[[absoluteStart, absoluteStart + 2], "'" + T + "'"]]);
    });

    it('reports nothing when the @example block has no terminator', () => {
      const reports = runProgram([
        { type: 'Block', value: '*\n * @example\n * safe code\n ', range: [0, 40] },
      ]);
      expect(reports).toHaveLength(0);
    });
  });
});
