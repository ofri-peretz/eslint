/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `'unsafe-inline'` is judged by the directive it sits in.
 *
 * The rule is CWE-79 and its message says inline SCRIPT executes. That is true
 * of `script-src` (and `script-src-elem` / `-attr`), and of `default-src` when
 * no `script-src` overrides it. Under `style-src` the keyword permits inline
 * CSS: a real but lower-severity weakness (CSS injection, not script
 * execution). tolaria's sandboxed HTML previews allow inline styles on
 * purpose — the frame has an opaque origin and `connect-src 'none'` — and the
 * rule reported them as XSS.
 *
 * `style-src` is reported only under `checkStyleSrc: true`, with its own
 * message and a MEDIUM severity. Directives where the keyword means nothing
 * (`img-src`) are not reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnsafeInlineCsp } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const script = [{ messageId: 'unsafeInline' as const }];
const style = [{ messageId: 'unsafeInlineStyle' as const }];

describe('no-unsafe-inline-csp — style-src is not script-src', () => {
  ruleTester.run('by-directive', noUnsafeInlineCsp, {
    valid: [
      {
        // @source refactoringhq/tolaria src/utils/htmlBlockSandbox.ts:29
        // @found real-source scan
        name: 'FP: style-src unsafe-inline in a sandboxed preview policy is not script execution',
        filename: 'src/utils/htmlBlockSandbox.ts',
        code: `
          const BASE_CSP_DIRECTIVES = [
            "default-src 'none'",
            "connect-src 'none'",
            "img-src data: blob:",
            "style-src 'unsafe-inline'",
          ];
        `,
      },
      {
        // @source refactoringhq/tolaria src/utils/htmlFilePreview.ts:47
        // @found real-source scan
        name: 'FP: style-src with other sources in a joined policy',
        filename: 'src/utils/htmlFilePreview.ts',
        code: `
          const CSP = [
            "default-src 'none'",
            "object-src 'none'",
            "style-src 'unsafe-inline' asset: http://asset.localhost",
          ].join('; ');
        `,
      },
      {
        name: 'a policy whose script-src overrides default-src leaves inline styles only',
        code: `const csp = "default-src 'self' 'unsafe-inline'; script-src 'self'";`,
      },
      {
        name: 'the keyword means nothing under img-src',
        code: `const csp = "img-src 'unsafe-inline'";`,
      },
      {
        name: 'prose that names a directive after the keyword is not a policy',
        code: `const hint = "never add 'unsafe-inline' to script-src";`,
      },
    ],
    invalid: [
      {
        // @source refactoringhq/tolaria src/utils/htmlBlockSandbox.ts:162
        // The opt-in "sandboxed scripts" mode. Inline script IS what
        // `'unsafe-inline'` enables here; that it is the feature is the
        // consumer's call to make with a disable comment.
        name: 'script-src unsafe-inline in the same codebase still reports',
        code: `const scriptPolicy = "script-src 'unsafe-inline'";`,
        errors: script,
      },
      {
        name: 'default-src governs scripts when there is no script-src',
        code: `const csp = "default-src 'self' 'unsafe-inline'; style-src 'self'";`,
        errors: script,
      },
      {
        name: 'script-src-elem governs script elements',
        code: `const csp = "script-src-elem 'unsafe-inline'";`,
        errors: script,
      },
      {
        name: 'a header line with the header name in front still names the directive',
        code: `const line = "Content-Security-Policy: script-src 'self' 'unsafe-inline'";`,
        errors: script,
      },
      {
        name: 'checkStyleSrc: style-src is reported under its own message',
        code: `const csp = "style-src 'unsafe-inline'";`,
        options: [{ checkStyleSrc: true }],
        errors: style,
      },
      {
        name: 'checkStyleSrc: default-src governs styles when there is no style-src',
        code: `const csp = "default-src 'self' 'unsafe-inline'; script-src 'self'";`,
        options: [{ checkStyleSrc: true }],
        errors: style,
      },
      {
        name: 'checkStyleSrc: script and style in one policy is one script finding',
        code: `const csp = "script-src 'unsafe-inline'; style-src 'unsafe-inline'";`,
        options: [{ checkStyleSrc: true }],
        errors: script,
      },
    ],
  });
});
