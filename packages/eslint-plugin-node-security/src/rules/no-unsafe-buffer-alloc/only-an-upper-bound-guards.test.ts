/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A guard bounds a wire-read size only when it caps it from ABOVE.
 *
 * `size < MAX` / `size <= MAX` around the allocation, `else` of `size > MAX`,
 * or a rejecting `if (size > MAX) throw` before it. A lower-bound check
 * (`size > 0`, `size < MIN` rejected) leaves every huge size through, and a
 * cap the peer chooses is not a cap.
 *
 * Every case states one claim in its `name`. The `FP:` / `FN:` cases were
 * wrong before the change that added them.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeBufferAlloc } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const unbounded = [{ messageId: 'unboundedAllocation' as const }];

/** A handler reading `n` off the request, then `body`. */
const handler = (body: string): string =>
  `function h(req) { const n = Number(req.query.n); ${body} }`;

ruleTester.run(
  'no-unsafe-buffer-alloc — only an upper bound guards',
  noUnsafeBufferAlloc,
  {
    valid: [
      {
        name: 'an enclosing size < MAX bounds the size',
        code: handler('if (n < 4096) { return Buffer.alloc(n); }'),
      },
      {
        name: 'an enclosing MAX >= size bounds the size',
        code: handler('if (4096 >= n) { return Buffer.alloc(n); }'),
      },
      {
        name: 'an upper bound in an && chain bounds the size',
        code: handler('if (n > 0 && n <= 4096) { return Buffer.alloc(n); }'),
      },
      {
        name: 'the else arm of size > MAX is bounded',
        code: handler(
          'if (n > 4096) { return null; } else { return Buffer.alloc(n); }',
        ),
      },
      {
        name: 'a rejecting if (size > MAX) throw bounds the size',
        code: handler(
          "if (n > 4096) throw new Error('too big'); return Buffer.alloc(n);",
        ),
      },
      {
        name: 'a rejecting guard whose block ends in return bounds the size',
        code: handler(
          'if (n < 0 || 4096 < n) { log(n); return null; } return Buffer.alloc(n);',
        ),
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FP: a rejecting guard in a nested block bounds the size',
        // @found mutation testing
        code: handler(
          "if (req.method === 'POST') { if (n > 4096) throw new Error('too big'); return Buffer.alloc(n); }",
        ),
      },
    ],
    invalid: [
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: an enclosing size > 0 is a lower bound, not a guard',
        // @found mutation testing
        code: handler('if (n > 0) { return Buffer.alloc(n); }'),
        errors: unbounded,
      },
      {
        name: 'FN: a rejected lower bound leaves huge sizes through',
        // @found mutation testing
        code: handler(
          "if (n < 1) throw new Error('empty'); return Buffer.alloc(n);",
        ),
        errors: unbounded,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: the then arm of size > MAX is the unbounded arm',
        // @found mutation testing
        code: handler('if (n > 4096) { return Buffer.alloc(n); }'),
        errors: unbounded,
      },
      {
        name: 'FN: an upper bound in an || chain does not bound the then arm',
        // @found mutation testing
        code: handler('if (n < 4096 || force) { return Buffer.alloc(n); }'),
        errors: unbounded,
      },
      {
        name: 'FN: a size > MAX check that does not leave is not a rejecting guard',
        // @found mutation testing
        code: handler('if (n > 4096) log(n); return Buffer.alloc(n);'),
        errors: unbounded,
      },
      {
        name: 'FN: a guard after the allocation does not bound it',
        // @found mutation testing
        code: handler(
          "const b = Buffer.alloc(n); if (n > 4096) throw new Error('too big'); return b;",
        ),
        errors: unbounded,
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        name: 'FN: a cap the peer chooses is not a cap',
        // @found mutation testing
        code: handler(
          'if (n < Number(req.query.max)) { return Buffer.alloc(n); }',
        ),
        errors: unbounded,
      },
    ],
  },
);
