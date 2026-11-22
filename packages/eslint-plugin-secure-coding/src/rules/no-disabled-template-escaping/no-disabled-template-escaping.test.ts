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
      // ── Other engines: lookalikes that must stay quiet ───────────────────
      {
        name: 'autoescape: false in an object that is itself the callee',
        code: '({ autoescape: false })();',
      },
      {
        name: 'autoescape: false passed to a call whose callee is not a plain name',
        code: 'makeEngine()({ autoescape: false });',
      },
      {
        name: 'autoescape: false in a const that is only read, never passed',
        code: 'const opts = { autoescape: false };\nconsole.log(opts.autoescape);',
      },
      {
        name: 'autoescape: false in a const passed to a non-engine call',
        code: 'const opts = { autoescape: false };\nrender(page, opts);',
      },
      {
        name: 'autoescape: false in an object nested in an array argument',
        code: 'swig.setDefaults([{ autoescape: false }]);',
      },
      {
        name: 'swig autoescape: true keeps escaping on',
        code: 'swig.setDefaults({ autoescape: true });',
      },
      {
        name: 'swig defaults without the option',
        code: 'swig.setDefaults({ cache: false });',
      },
      {
        name: 'nunjucks configure with autoescape on',
        code: "nunjucks.configure('views', { autoescape: true, express: app });",
      },
      {
        name: 'autoescape: false on a call that is not a template engine entry point',
        code: 'render(page, { autoescape: false });',
      },
      {
        name: 'autoescape: false in a plain object that reaches no call',
        code: 'const settings = { autoescape: false }; save(settings);',
      },
      {
        name: 'handlebars noEscape: false keeps escaping on',
        code: 'Handlebars.compile(source, { noEscape: false });',
      },
      {
        name: 'noEscape: true on a call that is not Handlebars compile',
        code: 'quote(text, { noEscape: true });',
      },
      {
        name: 'a computed key that is a variable names no fixed option',
        code: "const k = 'autoescape'; swig.setDefaults({ [k]: false });",
      },
      {
        name: 'autoescape set to a non-literal value is undecidable, not reported',
        code: 'swig.setDefaults({ autoescape: process.env.RAW === "1" ? false : true });',
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
      // ── Other engines ────────────────────────────────────────────────────
      {
        name: 'swig.setDefaults({ autoescape: false })',
        code: 'swig.setDefaults({ autoescape: false });',
        errors: disabled,
      },
      {
        name: 'swig constructed with autoescape off',
        code: 'const engine = new swig.Swig({ autoescape: false });',
        errors: disabled,
      },
      {
        name: 'nunjucks.configure with autoescape off',
        code: "nunjucks.configure('views', { autoescape: false, express: app });",
        errors: disabled,
      },
      {
        name: 'nunjucks Environment with autoescape off',
        code: 'const env = new nunjucks.Environment(loader, { autoescape: false });',
        errors: disabled,
      },
      {
        name: 'a quoted option key is the same option',
        code: "swig.setDefaults({ 'autoescape': false });",
        errors: disabled,
      },
      {
        name: 'options declared once, then passed to the engine',
        code: 'const opts = { autoescape: false };\nnunjucks.configure("views", opts);',
        errors: disabled,
      },
      {
        name: 'autoescape assigned off on an engine options object',
        code: 'env.opts.autoescape = false;',
        errors: disabled,
      },
      {
        name: 'handlebars compile with noEscape',
        code: 'const t = Handlebars.compile(source, { noEscape: true });',
        errors: disabled,
      },
      {
        name: 'handlebars precompile with noEscape',
        code: 'hbs.precompile(source, { noEscape: true });',
        errors: disabled,
      },
    ],
  });
});
