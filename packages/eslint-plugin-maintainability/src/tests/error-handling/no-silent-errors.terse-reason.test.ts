/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-silent-errors: a terse reason is still a reason (#1554).
 *
 * `allowWithComment` accepted a comment inside an empty catch only when it
 * matched a keyword (`ignore`, `expected`, ...) or ran to three words of prose.
 * `// pre-init — skip` says when the error happens and what is done about it,
 * and was reported because the dash is not a word, leaving two. A one-word
 * `// ignore` passed on the keyword list at the same time, so the bar was
 * higher for a comment that explains more.
 *
 * Two words that do not open with a placeholder (`todo`, `handle`, `empty`,
 * ...) are now a reason. A single non-keyword word and a two-word deferral
 * still report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSilentErrors } from '../../rules/error-handling/no-silent-errors';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-silent-errors (terse reason)', noSilentErrors, {
  valid: [
    {
      // @found ofri-peretz/interlace 2026-11-17 (#1554)
      name: 'a two-word reason around a dash is a reason',
      code: 'try { a(); } catch {\n  // pre-init — skip\n}',
      options: [{ allowWithComment: true }],
    },
    {
      name: 'a two-word block-comment reason is a reason',
      code: 'try { a(); } catch { /* best effort */ }',
      options: [{ allowWithComment: true }],
    },
  ],
  invalid: [
    {
      name: 'a single non-keyword word is not a reason',
      code: 'try { a(); } catch {\n  // skip\n}',
      options: [{ allowWithComment: true }],
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'a two-word placeholder is still not a reason',
      code: 'try { a(); } catch {\n  // empty — skip\n}',
      options: [{ allowWithComment: true }],
      errors: [{ messageId: 'silentError' }],
    },
  ],
});
