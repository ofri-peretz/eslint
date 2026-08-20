/**
 * Which SOURCE arms a `for…in` copy loop.
 *
 * ## The gap this file closes
 *
 * `checkPrototypePollutingCopyLoop` armed only when `node.right` was an
 * Identifier resolving to a function PARAMETER. That is the `merge(target,
 * source)` shape, and it is the right shape — it is what lodash.merge and
 * deep-extend were CVE'd for. But it is not the only one, and the two it missed
 * are the ones an application author actually writes:
 *
 *   for (const k in req.body)                  // MemberExpression -> early return
 *   const source = req.body; for (const k in source)   // Identifier, not a Parameter
 *
 * Both are CWE-1321 with an attacker at the root, and both were silent. Found by
 * the §B seal audit, not by a fixture: the audit needed a positive control for
 * the codemod suppression, wrote the request-rooted form as the obvious example
 * of a reporting loop, and it did not report.
 *
 * ## Why the parameter rule stays
 *
 * The requirement exists to keep `for (const k in localConfig)` quiet — copying
 * an object the module owns is the overwhelmingly common benign case and an
 * existing FP-regression test pins it. So this widens the source test rather
 * than replacing it: parameter OR provably request-rooted. A local object is
 * neither, and the CONTROLS below pin that it stays quiet.
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

describe('detect-object-injection — copy-loop source', () => {
  ruleTester.run('detect-object-injection', detectObjectInjection, {
    valid: [
      {
        // CONTROL for the whole widening. A module-owned object is not a
        // parameter and not request-rooted, and copying it is ordinary code. If
        // this ever reports, the widening has swallowed the benign majority.
        name: 'CONTROL: copying a module-local object stays quiet',
        code: `const defaults = { a: 1, b: 2 };
export function apply(target) {
  for (const k in defaults) {
    target[k] = defaults[k];
  }
}`,
      },
      {
        // A root the FILE CONSTRUCTS is a fixture or a default, whatever it is
        // spelled — the same `isLocallyConstructed` asymmetry the rest of the
        // rule uses. Spelling it `req` must not be enough.
        name: 'CONTROL: a locally-constructed `req` is not a request',
        code: `export function apply(target) {
  const req = { body: { a: 1 } };
  for (const k in req.body) {
    target[k] = req.body[k];
  }
}`,
      },
      {
        // THE trap, and the reason the binding hop requires exactly one write.
        // Reading only the declaration makes scope resolution an escape hatch in
        // the other direction too: here it would arm a loop that no longer
        // iterates the request at all. Three rules in this ecosystem have been
        // bitten by the mirror image of this.
        name: 'CONTROL: a binding REASSIGNED away from the request is not armed',
        code: `const SAFE_DEFAULTS = { a: 1 };
export function copy(req, target) {
  let source = req.body;
  source = SAFE_DEFAULTS;
  for (const k in source) {
    target[k] = source[k];
  }
}`,
      },
      {
        // An imported binding is a `def.type === 'ImportBinding'`, not
        // `'Variable'`. The file cannot see the initialiser, but an import is a
        // module the program chose — not a caller's object.
        name: 'CONTROL: an imported object is not a request',
        code: `import { defaults } from './defaults';
export function apply(target) {
  for (const k in defaults) {
    target[k] = defaults[k];
  }
}`,
      },
      {
        // A declaration with no initialiser: there is nothing to judge, and
        // "cannot tell" must not mean "arm it".
        name: 'CONTROL: a declared-but-uninitialised binding is not armed',
        code: `export function apply(target) {
  let source;
  for (const k in source) {
    target[k] = source[k];
  }
}`,
      },
      {
        // An unresolvable binding — a global the file never declares. No
        // variable, no evidence, no finding.
        name: 'CONTROL: an unresolved global is not armed',
        code: `export function apply(target) {
  for (const k in __UNDECLARED_GLOBAL__) {
    target[k] = __UNDECLARED_GLOBAL__[k];
  }
}`,
      },
      {
        name: 'CONTROL: a guarded loop is the documented fix and is not reported',
        code: `export function merge(target, source) {
  for (const k in source) {
    if (!Object.hasOwn(source, k)) continue;
    target[k] = source[k];
  }
}`,
      },
    ],
    invalid: [
      {
        // The shape that was silent. `req.body` is a MemberExpression, so the
        // Identifier-only test returned before any of the logic ran.
        name: 'for…in directly over req.body',
        code: `export function copy(req, target) {
  for (const k in req.body) {
    target[k] = req.body[k];
  }
}`,
        errors: 1,
      },
      {
        // Also silent: an Identifier that is a local const, not a parameter.
        // One binding hop is not a sanitiser.
        name: 'for…in over a const bound to req.body',
        code: `export function copy(req, target) {
  const source = req.body;
  for (const k in source) {
    target[k] = source[k];
  }
}`,
        errors: 1,
      },
      {
        // The original supported shape must keep working — this is the
        // regression half of the change.
        name: 'REGRESSION: the merge(target, source) parameter shape still reports',
        code: `export function merge(target, source) {
  for (const k in source) {
    target[k] = source[k];
  }
}`,
        errors: 1,
      },
    ],
  });
});
