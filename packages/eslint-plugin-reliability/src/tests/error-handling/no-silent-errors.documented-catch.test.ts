/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * no-silent-errors: a catch that SAYS why it is empty is not silent.
 *
 * ESLint core `no-empty` has always accepted an empty catch that holds a
 * comment, because the comment is the author's record of the decision. Linting
 * Vite, NestJS and Hono, this rule reported 14, 12 and 11 catches of exactly
 * that kind, each with a reason in prose:
 *
 *   catch { // Failure to remove a lock file must not affect the command. }
 *   catch { // Files referenced by HTML may not exist yet. }
 *
 * Only a bare `catch {}` is silent. A placeholder is not a reason either:
 * `// Empty`, a two-word deferral and the like still report.
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

ruleTester.run('no-silent-errors (documented catch)', noSilentErrors, {
  valid: [
    {
      name: 'a prose reason inside the catch (vite commandLock.ts)',
      code: [
        'try { unlink(); } catch {',
        '  // Failure to remove a lock file must not affect the command.',
        '}',
      ].join('\n'),
    },
    {
      name: 'a prose reason that uses none of the keyword list (vite htmlSafeModulePaths.ts)',
      code: [
        'try { stat(); } catch {',
        '  // Files referenced by HTML may not exist yet.',
        '}',
      ].join('\n'),
    },
    {
      name: 'a multi-line block comment reason',
      code: [
        'try { parse(); } catch {',
        '  /*',
        '   * deno.jsonc is only detected when it is also valid JSON.',
        '   */',
        '}',
      ].join('\n'),
    },
    {
      name: 'a prose reason trailing the catch on its own line (vite ws.ts)',
      code: 'try { go(); } catch {} // an error is thrown when the length is incorrect',
    },
    {
      name: 'a keyword comment still works with the option left at its default',
      code: 'try { go(); } catch { /* intentional */ }',
    },
  ],
  invalid: [
    {
      name: 'a bare catch is silent',
      code: 'try { go(); } catch {}',
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'a bare catch with a binding is silent',
      code: 'try { go(); } catch (e) {\n}',
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'a one-word placeholder is not a reason',
      code: 'try { go(); } catch (e) {\n  // Empty\n}',
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'a two-word deferral is not a reason',
      code: 'try { go(); } catch { /* handle later */ }',
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'a trailing placeholder is not a reason',
      code: 'try { go(); } catch {} // ok',
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'a trailing comment on a DIFFERENT line than the catch does not document it',
      code: 'try { go(); } catch {}\nnext(); // an error is thrown when the length is incorrect',
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'a comment AFTER the catch does not document it',
      code: 'try { go(); } catch {}\n// Failure to remove a lock file must not affect the command.',
      errors: [{ messageId: 'silentError' }],
    },
    {
      name: 'the option can still switch comments off',
      code: [
        'try { go(); } catch {',
        '  // Failure to remove a lock file must not affect the command.',
        '}',
      ].join('\n'),
      options: [{ allowWithComment: false }],
      errors: [{ messageId: 'silentError' }],
    },
  ],
});
