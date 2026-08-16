/**
 * @fileoverview Tests for detect-weak-password-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { detectWeakPasswordValidation } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('detect-weak-password-validation', detectWeakPasswordValidation, {
  valid: [
        'const x = 42;',
        'const flag = true;',
    // Strong password requirements
    { code: "if (password.length >= 12) { valid() }" },
    { code: "if (pwd.length >= 8) { valid() }" },
    // Non-password length checks
    { code: "if (name.length >= 2) { valid() }" },
    { code: "const x = 1" },
    // Operator not in the tracked comparison set — false branch of the operator check
    { code: "if (password.length != 4) { accept() }" },
    // Left side is not a MemberExpression at all — false branch of that check
    { code: "if (password >= 4) { accept() }" },
    // Left side is a MemberExpression but the accessed property isn't `.length`
    { code: "if (password.value >= 4) { accept() }" },

    // ── Locks: an English word containing "pass" is not a password ──────────
    /**
     * The snippet CLAUDE.md opens its "decide by evidence, never by a name"
     * section with. `passengers` contains `pass` as a SUBSTRING and not as a
     * word; `varName.includes('pass')` reported "Password length requirement is
     * too weak" on a booking engine.
     */
    'if (passengers.length >= 4) { bookGroupFare() }',
    'if (bypassList.length > 0) { skip() }',
    'if (compassHeadings.length > 3) { recalibrate() }',
    // A six-digit one-time passcode is the CORRECT length (RFC 4226).
    'if (passcode.length === 6) { consume() }',

    // ── Locks: minimum computed from operator AND threshold ────────────────
    /**
     * `> 7` is a minimum of EIGHT — the NIST floor, and this rule's own
     * documented "correct" example. Asking only "is the literal below 8?"
     * reported it.
     */
    'if (password.length > 7) { accept() }',
    // A presence check states no minimum at all.
    'if (password.length === 0) { throw new Error("required") }',
    'if (password.length > 0) { attempt() }',
    // Maximum-length caps: the enforced minimum is 129 / 73, both above the floor.
    'if (password.length > 128) { reject() }',
    'if (password.length <= 72) { ok() }',
    // A threshold that cannot be resolved to a number yields no finding.
    'if (password.length >= configuredMinimum) { accept() }',
    'let minimum = 6; minimum = 12; if (password.length >= minimum) { accept() }',
    'const minimum = readConfig(); if (password.length >= minimum) { accept() }',
    // A threshold that is an expression is neither a literal nor a resolvable
    // binding, so no minimum can be derived.
    'if (password.length >= base + 1) { accept() }',
    // A redeclared threshold has more than one definition, so which value it
    // holds at the comparison is not provable from the declaration.
    'var minimum = 6; var minimum = 12; if (password.length >= minimum) { accept() }',

    // ── Boundaries of the "whose length is this" walk ──────────────────────
    // A transformation chain longer than the walk's bound declines rather than
    // recursing; declining only costs a finding on a shape that does not occur.
    'if (password.trim().trim().trim().trim().trim().trim().length < 6) { reject() }',
    // The measured value is a literal, not a named binding.
    'if ("hunter2".length < 6) { reject() }',
    // A computed member access carries no property name to read.
    'if (fields[index].length < 6) { reject() }',
  ],

  invalid: [
    // Weak password requirements
    { code: "if (password.length >= 4) { accept() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (pwd.length >= 6) { proceed() }", errors: [{ messageId: 'violationDetected' }] },
    { code: "if (pass.length > 3) { ok() }", errors: [{ messageId: 'violationDetected' }] },

    /**
     * LOCK — this case used to sit under `valid`, annotated "Left side's object
     * is not a plain Identifier (e.g. nested member expression)". It is a live
     * CWE-521: a four-character minimum on a password reset endpoint. The suite
     * documented the miss instead of closing it.
     */
    {
      code: "if (req.body.password.length >= 4) { accept() }",
      errors: [{ messageId: 'violationDetected' }],
    },

    // ── Locks: the guard-clause half of the policy space ───────────────────
    // `< 6` rejects below six, so the minimum is six — the same policy as `>= 6`.
    { code: "if (password.length < 6) { throw new Error('too short') }", errors: 1 },
    // `<= 5` rejects at five, so the minimum is six.
    { code: "if (pwd.length <= 5) { throw new Error('too short') }", errors: 1 },

    // ── Locks: threshold behind a `const`, and the value behind a transform ─
    {
      code: "const MIN_PASSWORD_LENGTH = 6; if (newPassword.length >= MIN_PASSWORD_LENGTH) { accept() }",
      errors: 1,
    },
    { code: "if (password.trim().length < 6) { reject() }", errors: 1 },
    { code: "if (req.body?.password?.length >= 6) { accept() }", errors: 1 },

    // ── Lock: whole-word must not collapse into whole-NAME ─────────────────
    { code: "if (userPwd.length < 5) { reject() }", errors: 1 },
    { code: "if (newPassphrase.length <= 6) { reject() }", errors: 1 },
    { code: "if (confirmPassword.length > 3) { accept() }", errors: 1 },
    /**
     * A parenthesised optional call puts a ChainExpression BELOW the `.length`
     * access rather than above it, so the walk has to look through one there
     * too.
     */
    { code: "if ((password?.trim()).length < 6) { reject() }", errors: 1 },
    /**
     * The threshold constant lives in an OUTER scope, so resolution has to walk
     * past the function scope that does not declare it.
     */
    {
      code: "const MIN_LENGTH = 6; export function check(password) { return password.length >= MIN_LENGTH; }",
      errors: 1,
    },
  ],
});
