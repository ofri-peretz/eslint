/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Identify weak password requirements
 *
 * WHAT THIS RULE PROVES BEFORE IT NAMES ANYTHING
 *
 * A finding needs a *policy*, and a policy is a structural fact: a comparison
 * between a `.length` and a threshold that establishes a MINIMUM. That is what
 * the rule derives first — from the operator and the threshold, not from any
 * spelling — and it is what makes the four spellings of one policy equivalent:
 *
 *   accept if (password.length >= 6)    minimum 6
 *   reject if (password.length <  6)    minimum 6
 *   accept if (password.length >  5)    minimum 6
 *   reject if (password.length <= 5)    minimum 6
 *
 * The rule used to enumerate `>=`, `>`, `==`, `===` and compare the LITERAL
 * against 8. That is wrong twice over: the guard-clause spellings (`<`, `<=`)
 * are the more common half of real validation code and were invisible, and
 * `password.length > 7` — a minimum of eight, the NIST floor and this rule's own
 * documented "correct" example — was reported because 7 < 8.
 *
 * A minimum of 0 or 1 is a PRESENCE check (`if (password.length === 0) throw`),
 * not a strength policy, and is never reported.
 *
 * WHERE THE NAME COMES IN, AND WHY IT IS BOUNDED
 *
 * Once a minimum is established, the rule still has to know the measured value
 * is a password. Nothing in the AST can prove that — CWE-521 is about a
 * credential, and "credential" is a fact about the domain, not about the syntax.
 * The name is therefore the last step and never the first, and it is matched by
 * WHOLE WORD through `nameHasAnyWord`, not by substring.
 *
 * The substring version shipped, and CLAUDE.md opens with what it did:
 * `if (passengers.length >= 4)` reported "Password length requirement is too
 * weak". `bypassList`, `compassHeadings`, `passthrough` and a six-digit
 * `passcode` all did the same. Whole-word matching excludes every one of them
 * while still matching `password`, `userPassword`, `newPassword`, `pwd` and
 * `pass`.
 *
 * The remaining limitation is stated rather than hidden: renaming a password
 * variable to `secretPhrase` silences the rule. That is inherent to detecting a
 * *policy about a credential* from syntax alone, and it is why this rule is
 * `type: 'suggestion'` and not a taint analysis.
 */

import { createRule, formatLLMMessage, MessageIcons, nameHasAnyWord, propertyName } from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {
  /**
   * Words that mark a value as a credential. REPLACES the default.
   *
   * `password|passphrase|passwd|pwd|pass` is OUR guess at how a codebase spells
   * it, not a specification — a project whose field is `secret`, `kennwort` or
   * `motDePasse` matched none of it and the rule silently judged nothing.
   */
  passwordWords?: string[];
}

type RuleOptions = [Options?];

/**
 * @vocabulary The eight-character floor is NIST SP 800-63B, section 5.1.1.2:
 * "Verifiers SHALL require subscriber-chosen memorized secrets to be at least
 * 8 characters in length." It is a published requirement, not a preference, so
 * it is cited rather than made configurable.
 *
 * @see https://pages.nist.gov/800-63-3/sp800-63b.html#memsecret
 *
 * NIST SP 800-63B's floor. A policy enforcing fewer characters than this is the
 * finding; a policy enforcing this many or more is not.
 */
const NIST_MINIMUM_LENGTH = 8;

/**
 * A minimum of 0 or 1 character is a presence check, not a strength policy.
 * `if (password.length === 0) throw` and `if (password.length > 0)` state no
 * requirement at all.
 */
const SMALLEST_MEANINGFUL_MINIMUM = 2;

/**
 * Words that identify a credential. Whole-word membership, never substring —
 * see the file header and `@interlace/eslint-devkit`'s `identifier-words`.
 */
const DEFAULT_PASSWORD_WORDS: readonly string[] = [
  'password',
  'passphrase',
  'passwd',
  'pwd',
  'pass',
];

/**
 * The minimum length a comparison enforces, or `null` when it enforces none.
 *
 * `>= n` accepts at n, and `< n` rejects below n — both set the minimum at `n`.
 * `> n` accepts above n, and `<= n` rejects at n — both set it at `n + 1`.
 * `===`/`==` pin the length exactly, which is a minimum of `n` as well.
 * `!==`/`!=` and everything else state no minimum.
 */
function enforcedMinimum(operator: string, threshold: number): number | null {
  switch (operator) {
    case '>=':
    case '<':
    case '===':
    case '==':
      return threshold;
    case '>':
    case '<=':
      return threshold + 1;
    default:
      return null;
  }
}

/**
 * The threshold as a number, following one `const` hop.
 *
 * `const MIN_PASSWORD_LENGTH = 6; if (pw.length >= MIN_PASSWORD_LENGTH)` is the
 * better-written form of a weak policy, and reading only numeric literals meant
 * the better-written form was the one that escaped. Resolved through scope
 * analysis: a binding with more than one definition, or one whose initialiser is
 * not a numeric literal, yields `null` and no finding.
 */
function resolveThreshold(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): number | null {
  if (node.type === 'Literal' && typeof node.value === 'number') {
    return node.value;
  }
  if (node.type !== 'Identifier') {
    return null;
  }
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((candidate) => candidate.name === node.name);
    if (!variable) continue;
    if (variable.defs.length !== 1) return null;
    const definition = variable.defs[0]!;
    if (definition.type !== 'Variable' || definition.parent.kind !== 'const') return null;
    const init = definition.node.init;
    return init?.type === 'Literal' && typeof init.value === 'number' ? init.value : null;
  }
  return null;
}

/**
 * Does this expression measure something the code itself calls a password?
 *
 * Accepts both `password.length` and `req.body.password.length`. The old check
 * required the object to be a bare `Identifier`, so every policy applied
 * directly to a request field or a DTO was invisible — and the rule's own test
 * suite pinned `if (req.body.password.length >= 4)` as VALID with the comment
 * "Left side's object is not a plain Identifier", documenting the miss instead
 * of closing it.
 */
function measuresPasswordLength(
  node: TSESTree.Node,
  words: readonly string[],
): boolean {
  // `req.body?.password?.length >= 6` wraps the whole access in a
  // ChainExpression. Optional links change nothing about which value is being
  // measured, and the shape is the norm once the request body is not guaranteed.
  const access = node.type === 'ChainExpression' ? (node.expression as TSESTree.Node) : node;

  if (
    access.type !== 'MemberExpression' ||
    // `password['length'] < 6` is the same weak check.
    propertyName(access) !== 'length'
  ) {
    return false;
  }

  return namesPassword(access.object as TSESTree.Node, words);
}

/**
 * Whole-word credential check on the value whose length is being measured,
 * looking through the transformations that preserve WHOSE length it is.
 *
 * `password.trim().length < 6` is the first line of every form validator, and
 * `.trim()` / `.normalize()` / `.toString()` / `.toLowerCase()` do not change
 * which value is under discussion. Stopping at the CallExpression meant the
 * commonest spelling of a weak policy was invisible.
 */
function namesPassword(
  node: TSESTree.Node,
  words: readonly string[],
  depth = 0,
): boolean {
  // A transformation chain longer than this is not real validation code.
  if (depth > 4) {
    return false;
  }

  if (node.type === 'Identifier') {
    return nameHasAnyWord(node.name, words);
  }
  if (node.type === 'ChainExpression') {
    return namesPassword(node.expression as TSESTree.Node, words, depth + 1);
  }
  // A method call on the value: ask about the receiver.
  if (node.type === 'CallExpression') {
    // `password['trim']()` is the same call on the same receiver, so the
    // question to ask is still "what does the RECEIVER name?".
    return (
      node.callee.type === 'MemberExpression' &&
      namesPassword(node.callee.object as TSESTree.Node, words, depth + 1)
    );
  }
  if (node.type === 'MemberExpression') {
    // `body['password'].length < 6` reaches the same property as
    // `body.password.length < 6`.
    const property = propertyName(node);
    return property !== null && nameHasAnyWord(property, words);
  }
  return false;
}

export const detectWeakPasswordValidation = createRule<RuleOptions, MessageIds>({
  name: 'detect-weak-password-validation',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-weak-password-validation.md',
      description: 'Identify weak password requirements',
      cwe: 'CWE-521',
      cvss: 5.3,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Weak Password Validation',
        cwe: 'CWE-521',
        description: 'Password length requirement is too weak (less than 8 characters)',
        severity: 'CRITICAL',
        fix: 'Require at least 12 characters with complexity requirements',
        documentationLink: 'https://cwe.mitre.org/data/definitions/521.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          passwordWords: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_PASSWORD_WORDS],
            description:
              'Words that mark a value as a credential. Replaces the default.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const words = (options as Options).passwordWords ?? DEFAULT_PASSWORD_WORDS;
    return {
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // 1. Is this a length comparison at all? Structural, no names involved.
        if (!measuresPasswordLength(node.left as TSESTree.Node, words)) {
          return;
        }

        // 2. What threshold does it compare against?
        const threshold = resolveThreshold(node.right, context.sourceCode);
        if (threshold === null) {
          return;
        }

        // 3. What minimum does that operator + threshold actually enforce?
        const minimum = enforcedMinimum(node.operator, threshold);
        if (minimum === null) {
          return;
        }

        // 4. Is the enforced minimum a real policy, and is it below the floor?
        if (minimum < SMALLEST_MEANINGFUL_MINIMUM || minimum >= NIST_MINIMUM_LENGTH) {
          return;
        }

        context.report({ node, messageId: 'violationDetected' });
      },
    };
  },
});
