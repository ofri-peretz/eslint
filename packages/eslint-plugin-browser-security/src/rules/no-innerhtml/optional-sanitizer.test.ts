/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * FP-005 was not a false positive.
 *
 * `el.innerHTML = DOMPurify?.sanitize(html) ?? html` was parked for weeks as
 * noise — 21 findings in the wild, all looking like a defensive idiom somebody
 * had written on purpose. Running it settles it:
 *
 *   let DOMPurify;                                   // module not loaded
 *   DOMPurify?.sanitize(payload) ?? payload
 *   -> "<img src=x onerror=alert(1)>"                // the RAW payload
 *
 * The `??` is the whole problem. `?.` yields `undefined` when the sanitiser is
 * absent, and `??` then chooses the unsanitised operand — so the shape degrades
 * to no sanitisation at all in exactly the circumstance the optional chain was
 * written to survive. It reads as a belt-and-braces guard and behaves as a
 * bypass.
 *
 * That is the third time in this work that something filed as a false positive
 * turned out to be correct behaviour, after `<nav role="navigation">` and
 * `this[k] = v`. The pattern is worth naming: **a shape that looks like a
 * remediation is not one if it has a fallback path.** Check what the fallback
 * does before believing the guard.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { noInnerhtml } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = suite;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

const IMPORT = `import DOMPurify from 'dompurify';`;

suite('no-innerhtml — a sanitiser with a fallback is not a sanitiser', () => {
  ruleTester.run('optional-sanitizer', noInnerhtml, {
    valid: [
      {
        // The same call WITHOUT a fallback is genuinely safe: if DOMPurify is
        // absent this throws, and a crash is not an XSS.
        name: 'an optional sanitiser call with no fallback',
        code: `${IMPORT}\nfunction f(el, html) { el.innerHTML = DOMPurify?.sanitize(html); }`,
      },
      {
        name: 'the ordinary non-optional call',
        code: `${IMPORT}\nfunction f(el, html) { el.innerHTML = DOMPurify.sanitize(html); }`,
      },
      {
        // A fallback to a CONSTANT is safe — nothing untrusted reaches the sink.
        name: 'a fallback to a literal, which carries no user input',
        code: `${IMPORT}\nfunction f(el, html) { el.innerHTML = DOMPurify.sanitize(html) ?? ''; }`,
      },
    ],
    invalid: [
      {
        // @source the real-source scan, 21 findings
        // @found rule review
        name: 'FN: a sanitiser whose ?? fallback is the unsanitised value',
        code: `${IMPORT}\nfunction f(el, html) { el.innerHTML = DOMPurify?.sanitize(html) ?? html; }`,
        errors: 1,
      },
      {
        name: 'the same written with || instead of ??',
        code: `${IMPORT}\nfunction f(el, html) { el.innerHTML = DOMPurify?.sanitize(html) || html; }`,
        errors: 1,
      },
      {
        name: 'the same through a ternary on the sanitiser itself',
        code: `${IMPORT}\nfunction f(el, html) { el.innerHTML = DOMPurify ? DOMPurify.sanitize(html) : html; }`,
        errors: 1,
      },
    ],
  });
});
