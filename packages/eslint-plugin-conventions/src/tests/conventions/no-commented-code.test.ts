/**
 * Comprehensive tests for no-commented-code rule
 * Quality: Detects commented-out code blocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCommentedCode } from '../../rules/conventions/no-commented-code';

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

describe('no-commented-code', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no commented code', noCommentedCode, {
      valid: [
        // Regular comments (not code)
        { name: 'prose in a comment', code: '// This is a regular comment' },
        { code: '/* This is a block comment */' },
        // TODO comments (allowed)
        { code: '// TODO: Fix this later' },
        { code: '// FIXME: Need to refactor' },
        { code: '// HACK: Temporary workaround' },
        { code: '// XXX: Known issue' },
        // Single line (if ignoreSingleLine is true)
        {
          code: '// const x = 1;',
          options: [{ ignoreSingleLine: true }],
        },
        // Test files (if ignoreInTests is true)
        {
          code: `
            // const oldCode = "removed";
            // function oldFunction() { }
          `,
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        // Below minLines threshold
        {
          code: '// const x = 1;',
          options: [{ minLines: 3 }],
        },
        // Empty block comment
        { code: '/**  */' },
        // Descriptive text that doesn't match code patterns
        { code: '// This describes what the function does' },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code — Commented-out code detected', () => {
    ruleTester.run(
      'invalid - commented code patterns',
      noCommentedCode,
      {
        valid: [],
        invalid: [
          // Variable declaration
          {
            name: 'a commented-out statement',
            code: '// const x = 1;',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Function declaration
          {
            code: '// function doStuff() {',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Import statement
          {
            code: '// import lodash from "lodash";',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Block comment with code inside
          {
            code: '/* const x = 1; */',
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Multi-line block comment with code
          {
            code: `/*
const a = 1;
const b = 2;
*/`,
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
          // Multiple consecutive single-line comments that look like code
          {
            code: `// const x = 1;
// const y = 2;`,
            errors: [{
              messageId: 'commentedCode',
              suggestions: [{
                messageId: 'removeCode',
                output: '',
              }],
            }],
          },
        ],
      },
    );
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreSingleLine', noCommentedCode, {
      valid: [
        {
          code: '// const x = 1;',
          options: [{ ignoreSingleLine: true }],
        },
      ],
      invalid: [
        {
          code: '// const x = 1;',
          options: [{ ignoreSingleLine: false }],
          errors: [{
            messageId: 'commentedCode',
            suggestions: [{
              messageId: 'removeCode',
              output: '',
            }],
          }],
        },
      ],
    });

    ruleTester.run('options - minLines', noCommentedCode, {
      valid: [
        {
          code: '// const x = 1;',
          options: [{ minLines: 3 }],
        },
      ],
      invalid: [],
    });

    ruleTester.run('options - ignoreInTests false', noCommentedCode, {
      valid: [],
      invalid: [
        {
          code: '// const x = 1;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{
            messageId: 'commentedCode',
            suggestions: [{
              messageId: 'removeCode',
              output: '',
            }],
          }],
        },
      ],
    });
  });
});

/**
 * Prose is not code, however it opens.
 *
 * Measured on the pinned 8-repository corpus: this rule reported 2,441
 * findings, and the overwhelming majority were English. Three mechanics did
 * it, all inside `looksLikeCode`:
 *
 *   `Copyright (c) 2018 …`  — the call pattern allowed whitespace before `(`
 *   `https://example.com/x` — `https:` matched the `ident:` assign pattern
 *   `for backward compat…`  — a sentence that opens with a keyword
 *
 * The discriminator that survived is punctuation. Commented-out code is COPIED
 * out of a file and keeps its semicolons and braces; a sentence ends in a word.
 * 2,441 -> 143.
 */
describe('no-commented-code — prose is not code', () => {
  ruleTester.run('valid - English that opens like code', noCommentedCode, {
    valid: [
      // Sentences that begin with a JavaScript keyword.
      { code: 'const a = 1;\n// for widget / idx-js backward compatibility' },
      { code: 'const a = 1;\n// if no key is passed, all cookies are returned' },
      { code: 'const a = 1;\n// let existing promise finish to prevent running into loops' },
      { code: 'const a = 1;\n// return all cookies when no args is provided' },
      { code: 'const a = 1;\n// class names are kebab-case here' },
      // Prose with a parenthetical reads as a call only if the gap is allowed.
      { code: 'const a = 1;\n// Authn (classic) api' },
      { code: 'const a = 1;\n// fetch() can throw exceptions' },
      // A documentation link.
      { code: 'const a = 1;\n// https://developer.mozilla.org/en-US/docs/Web/API/fetch#exceptions' },
      { code: 'const a = 1;\n// See http://example.com/a/b#c for details' },
      // The terser "preserve" banner: a legal notice, never code.
      {
        code: '/*!\n * Copyright (c) 2018-Present, Okta, Inc. and/or its affiliates.\n * Licensed under the Apache License, Version 2.0\n */\nconst a = 1;',
      },
    ],
    invalid: [
      {
        // FN GUARD: real commented-out code keeps its punctuation.
        // okta-auth-js lib/idx/idxState/v1/generateIdxAction.ts:80.
        code: 'const a = 1;\n//   const target = actionDefinition.href;',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        // okta-auth-js lib/http/request.ts:110.
        code: 'const a = 1;\n//   err = wwwAuthErr ?? err;',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        // A call with no gap before the paren is still a call.
        code: 'const a = 1;\n// const inputs = this.getInputs();',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        // A keyword line that DOES end like a statement.
        code: 'const a = 1;\n// if (ready) {',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        // A plain block comment is not a `/*!` banner and is still checked.
        code: '/*\n * const target = actionDefinition.href;\n */\nconst a = 1;',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: '\nconst a = 1;' }] }],
      },
    ],
  });
});

/**
 * The adversarial wave.
 *
 * The prose fix traded away recall, and the trade was documented as costing
 * `// x = 1`. A wave written to break the tuned rule showed it cost far more:
 * 11 of 14 genuinely commented-out lines went silent, including
 * `// const timeout = 5000`, `// import fs from "fs"` and
 * `// throw new Error("x")`.
 *
 * Two causes, not one. The terminator test is a proxy for "is this a
 * sentence", which is right for a line that merely OPENS with a keyword and
 * far too blunt for a line that is unmistakably a statement. And the pattern
 * list had no `throw`, no `await`, and no member-call chain at all.
 *
 * STRUCTURAL_CODE now carries the shapes prose does not have. `throw` and
 * `await` require a call shape after them, because bare `^await\s` matched
 * "await for the retry window to elapse" — the same trap as the keyword
 * patterns, one keyword further along.
 */
describe('no-commented-code — adversarial', () => {
  ruleTester.run('invalid - structure beats punctuation', noCommentedCode, {
    valid: [
      {
        // A JSDoc block is documentation, and the code inside an `@example` is
        // deliberate — the one place a comment is SUPPOSED to contain code.
        // Largest new shape on the 20-repository ledger; mongoose documents
        // most of its API this way.
        code: [
          '/**',
          ' * Does a thing.',
          ' *',
          ' * @example',
          ' *     const x = doThing()',
          ' *     return x',
          ' */',
          'export function f() { return 1; }',
        ].join('\n'),
      },
      { code: 'const a = 1;\n// await for the retry window to elapse before polling' },
      { code: 'const a = 1;\n// throw away the cache when the tab closes' },
      { code: 'const a = 1;\n// for widget / idx-js backward compatibility' },
      { code: 'const a = 1;\n// fetch() can throw exceptions' },
    ],
    invalid: [
      {
        // FN GUARD: a plain block comment is how people actually comment code
        // out, and is NOT exempt. Only `/**` is.
        name: 'a plain block comment is still checked',
        code: '/*\n * const target = actionDefinition.href;\n */\nconst a = 1;',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: '\nconst a = 1;' }] }],
      },
      {
        name: 'a declaration with an initializer needs no terminator',
        code: 'const a = 1;\n// const timeout = 5000',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        name: 'an import with a module specifier',
        code: 'const a = 1;\n// import fs from "fs"',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        name: 'an export',
        code: 'const a = 1;\n// export default config',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        name: 'a constructed throw',
        code: 'const a = 1;\n// throw new Error("x")',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        name: 'an awaited call',
        code: 'const a = 1;\n// await client.connect()',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        name: 'a call on a member chain',
        code: 'const a = 1;\n// promise.then(x => x).catch(noop)',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
      {
        name: 'a typed declaration',
        code: 'const a = 1;\n// let count: number = 0',
        errors: [{ messageId: 'commentedCode', suggestions: [{ messageId: 'removeCode', output: 'const a = 1;\n' }] }],
      },
    ],
  });
});
