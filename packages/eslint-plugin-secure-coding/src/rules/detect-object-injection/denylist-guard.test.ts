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
        name: 'a throw is an exit too',
        code: merge("if (FORBIDDEN.has(key)) throw new Error('bad key');", SET),
      },
      {
        name: 'a block that does something, then continues, still exits',
        code: merge(
          'if (FORBIDDEN.has(key)) { skipped.push(key); continue; }',
          SET,
        ),
      },
      {
        name: 'a Set built from a frozen array holds the same literal',
        code: merge(
          'if (FORBIDDEN.has(key)) continue;',
          `const FORBIDDEN = new Set(Object.freeze(['__proto__', 'constructor', 'prototype']));`,
        ),
      },
    ],
    invalid: [
      {
        // Was silent: a free binding counted as a module-owned ALLOWLIST
        // whichever way the test pointed, so a rejection test cleared it.
        name: 'an undeclared set whose members are skipped is not an allowlist',
        code: merge('if (FORBIDDEN.has(key)) continue;', ''),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a module-owned list of safe keys, skipped rather than required, admits every other key',
        code: merge(
          'if (SKIP.includes(key)) continue;',
          `const SKIP = ['id', 'createdAt'];`,
        ),
        errors: [{ messageId: 'massAssignment' }],
      },
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
        name: 'a negated denylist test skips every key EXCEPT the prototype keys',
        code: merge('if (!FORBIDDEN.has(key)) continue;', SET),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'indexOf is truthy for a miss and 0 for the first entry: not a denylist test',
        code: merge(
          'if (BAD.indexOf(key)) continue;',
          `const BAD = ['__proto__', 'constructor', 'prototype'];`,
        ),
        errors: [{ messageId: 'massAssignment' }],
      },
      {
        name: 'a constructor other than Set says nothing about membership',
        code: merge(
          'if (FORBIDDEN.has(key)) continue;',
          `const FORBIDDEN = new Registry(['__proto__', 'constructor', 'prototype']);`,
        ),
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
