/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A denylist that covers every prototype key, tested with `Set#has` /
 * `Array#includes` and followed by an early exit, guards a recursive merge.
 * From dogfooding: protocol-ctf ws-3's fixed server (security-research,
 * protocol-ctf/docs/SCANNER-RESULTS.md, run 2) was reported at both writes.
 *
 * Decided from what the binding HOLDS, never from what it is called: the same
 * code with the denylist renamed stays quiet, and a denylist that misses a
 * prototype key, or a test that does not exit, still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { detectObjectInjection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const merge = (guard: string, decl: string) => `${decl}
export function merge(target, source) {
  for (const key of Object.keys(source)) {
    ${guard}
    const value = source[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      merge(target[key], value);
    } else { target[key] = value; }
  }
}`;

const SET = `const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);`;

describe('detect-object-injection — prototype-key denylist guard', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        name: 'Set#has denylist of all three prototype keys, then continue',
        code: merge('if (FORBIDDEN.has(key)) continue;', SET),
      },
      {
        name: 'the denylist is recognised by its contents, not its name',
        code: merge(
          'if (zz.has(key)) continue;',
          `const zz = new Set(['prototype', '__proto__', 'constructor']);`,
        ),
      },
      {
        name: 'Array#includes denylist, block-bodied continue',
        code: merge(
          'if (BAD.includes(key)) { continue; }',
          `const BAD = ['__proto__', 'constructor', 'prototype'];`,
        ),
      },
      {
        name: 'a frozen array denylist with a return exit',
        code: merge(
          'if (BAD.includes(key)) return;',
          `const BAD = Object.freeze(['__proto__', 'constructor', 'prototype', 'x']);`,
        ),
      },
      {
        name: 'a hole or a spread in the denylist does not hide the keys it spells out',
        code: merge(
          'if (BAD.includes(key)) continue;',
          `const BAD = ['__proto__', , ...EXTRA, 'constructor', 'prototype'];`,
        ),
      },
      {
        // Not credited as a denylist (its contents cannot be read): the
        // allowlist arm already treats a free binding as module-owned,
        // whichever way the test points. Pinned so a change there is seen.
        name: 'an undeclared membership set is credited by the allowlist arm, not as a denylist',
        code: merge('if (FORBIDDEN.has(key)) continue;', ''),
      },
    ],
    invalid: [
      {
        name: 'an imported denylist has contents this file cannot read',
        code: merge(
          'if (FORBIDDEN.has(key)) continue;',
          `import { FORBIDDEN } from './deny';`,
        ),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'control: the same merge without the denylist line reports',
        code: merge('', SET),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a denylist missing `prototype` is not a guard on a recursive merge',
        code: merge(
          'if (FORBIDDEN.has(key)) continue;',
          `const FORBIDDEN = new Set(['__proto__', 'constructor']);`,
        ),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a denylist test that does not exit guards nothing',
        code: merge('if (FORBIDDEN.has(key)) console.log(key);', SET),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a caller-supplied set is not a denylist this file can read',
        code: merge('if (opts.deny.has(key)) continue;', SET),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a reassignable binding is not proof of its contents',
        code: merge(
          'if (FORBIDDEN.has(key)) continue;',
          `let FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']); FORBIDDEN = new Set();`,
        ),
        errors: [{ messageId: 'massAssignment' }],
      },
    ],
  });
});
