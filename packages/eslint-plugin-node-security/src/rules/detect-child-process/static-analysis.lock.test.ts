/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: `detect-child-process` decides "dynamic" via devkit's static-expression
 * analysis, not a node-type allowlist.
 *
 * The pre-2026-08-11 `containsDynamicStrings` matched on node types and was wrong in both
 * directions. The false negative is the one that matters:
 *
 *   `MemberExpression` and `CallExpression` fell through to `return false`, so
 *   `exec(req.query.cmd)` was classified NOT dynamic. With `allowLiteralStrings: true`
 *   the rule then skipped the report entirely — silently missing the exact input shape
 *   this rule exists to catch.
 *
 * If someone reverts to a type-list check, the `dynamic sources` cases below go quiet
 * and this file goes red.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from 'vitest';
import { detectChildProcess } from './index';

const ruleTester = new RuleTester();
const LENIENT = [{ allowLiteralStrings: true, allowLiteralSpawn: true }] as const;

describe('detect-child-process static-analysis lock', () => {
  ruleTester.run('provably-constant commands stay quiet', detectChildProcess, {
    valid: [
      // Plain literal — quiet before and after.
      { code: `const cp = require('child_process'); cp.exec('ls');`, options: LENIENT },
      // Callbacks and options are not injection vectors and must not mark the call dynamic.
      {
        code: `const cp = require('child_process'); cp.exec('ls -l', function (e, o) {});`,
        options: LENIENT,
      },
      // …including a callback that resolves NOWHERE. `unknowable` used to scan every
      // argument, so an unresolved callback carried a literal command past the
      // evidence gate and reported command injection on `exec('ls', cb)`. Only the
      // injectable positions — argument 0 and an explicit argv array — may answer
      // "unknowable"; a callback says nothing about the command.
      {
        code: `const cp = require('child_process'); cp.exec('ls', handleResult);`,
        options: LENIENT,
      },
      // The false positive: a const binding is not attacker-reachable.
      { code: `const cp = require('child_process'); const CMD = 'ls'; cp.exec(CMD);`, options: LENIENT },
      // A constant used TWICE is still a constant. The devkit cycle guard used to be a
      // visited-set, so the second reference resolved as dynamic and the call reported.
      { code: `const cp = require('child_process'); const A = 'ls'; cp.exec(A + A);`, options: LENIENT },
      { code: `const cp = require('child_process'); const A = 'l', B = A + 's'; cp.exec(B);`, options: LENIENT },
      { code: `const cp = require('child_process'); const C = 'git'; cp.spawn(C, ['status']);`, options: LENIENT },
    ],
    invalid: [
      // THE REGRESSION GUARD — these were silently skipped by the type-list version.
      {
        code: `const cp = require('child_process'); cp.exec(req.query.cmd);`,
        options: LENIENT,
        errors: 1,
      },
      {
        code: `const cp = require('child_process'); cp.exec(getCommand());`,
        options: LENIENT,
        errors: 1,
      },
      // An argv element carrying input is still injection, even with a constant command.
      {
        code: `const cp = require('child_process'); cp.spawn('git', [req.query.ref]);`,
        options: LENIENT,
        errors: 1,
      },
      // Reassignment defeats constness.
      {
        code: `const cp = require('child_process'); let c = 'ls'; c = req.query.c; cp.exec(c);`,
        options: LENIENT,
        errors: 1,
      },
    ],
  });
});

describe('module-binding shapes', () => {
  ruleTester.run('require shapes', detectChildProcess, {
    valid: [
      // A require of something else, used the same way.
      { code: `const os = require('node:os'); os.cpus();`, options: LENIENT },
    ],
    invalid: [
      // Chained straight off the require — the module never gets a name.
      { code: `require('child_process').exec(str);`, options: LENIENT, errors: 1 },
      { code: `require('node:child_process').exec(str);`, options: LENIENT, errors: 1 },
      // A bare import is itself the risk signal, with no call to attach to.
      { code: `require('child_process');`, options: LENIENT, errors: 1 },
      { code: `require('node:child_process');`, options: LENIENT, errors: 1 },
      // Passed as an argument — still never bound to a name.
      { code: `sinon.stub(require('child_process'));`, options: LENIENT, errors: 1 },
      // Bound to a variable: reported at the call site, NOT twice.
      { code: `const cp = require('child_process'); cp.exec(req.query.c);`, options: LENIENT, errors: 1 },
    ],
  });
});
