/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from 'vitest';
import { noDisabledTemplateEscaping } from './index';

const ruleTester = new RuleTester();

const disabled = [{ messageId: 'escapingDisabled' as const }];

// The cases in the blocks marked "Ported" are adapted from
// eslint-plugin-security@4.2.0, test/rules/detect-disable-mustache-escape.js
// (https://github.com/eslint-community/eslint-plugin-security), licensed
// Apache-2.0. This rule is the drop-in for that rule, so its cases are the
// parity contract. The implementation is independent; the cases are theirs.

describe('no-disabled-template-escaping', () => {
  ruleTester.run('no-disabled-template-escaping', noDisabledTemplateEscaping, {
    valid: [
      // ── Ported from eslint-plugin-security (Apache-2.0) ──────────────────
      {
        name: 'a bare variable named escapeMarkup is not an engine option',
        code: 'escapeMarkup = false',
      },

      // ── Our own ──────────────────────────────────────────────────────────
      {
        name: 'setting escapeMarkup to true keeps escaping on',
        code: 'view.escapeMarkup = true;',
      },
      {
        name: 'assigning false to an unrelated property is quiet',
        code: 'view.cache = false;',
      },
      {
        name: 'a computed key that is a variable names no fixed property',
        code: 'const escapeMarkup = "cache";\nview[escapeMarkup] = false;',
      },
      {
        name: 'the string "false" is truthy and does not disable escaping',
        code: 'view.escapeMarkup = "false";',
      },
      {
        name: 'reading the option to compare it is not setting it',
        code: 'if (view.escapeMarkup === false) warn();',
      },
      {
        name: 'a local variable declaration named escapeMarkup is not an option',
        code: 'const escapeMarkup = false;',
      },
    ],
    invalid: [
      // ── Ported from eslint-plugin-security (Apache-2.0) ──────────────────
      {
        name: 'escapeMarkup = false on an object disables auto-escaping',
        code: 'a.escapeMarkup = false',
        errors: disabled,
      },

      // ── Our own ──────────────────────────────────────────────────────────
      {
        name: 'the same option in bracket notation with a string key',
        code: "view['escapeMarkup'] = false;",
        errors: disabled,
      },
      {
        name: 'the same option in bracket notation with a template-literal key',
        code: 'view[`escapeMarkup`] = false;',
        errors: disabled,
      },
      {
        name: 'a nested options object is still the engine option',
        code: 'this.options.escapeMarkup = false;',
        errors: disabled,
      },
      {
        name: 'a TypeScript non-null receiver does not hide the assignment',
        code: 'engine!.escapeMarkup = false;',
        errors: disabled,
      },
    ],
  });
});
