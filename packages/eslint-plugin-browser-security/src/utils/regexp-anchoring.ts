/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Does a regular expression actually pin a host — or only appear to?
 *
 * Two rules in this package decide "was this URL validated?" by matching the
 * *text* around the sink against a list of patterns, which cannot tell
 * `/^https:\/\/example\.com$/` from `/https?:\/\/example.com/`. The first pins
 * the whole origin; the second matches anywhere in the string and its unescaped
 * `.` matches any character, so `https://exampleXcom.evil.io/` passes it.
 *
 * That difference is the entire CWE-020 validation-bypass cluster, and it is
 * decidable from the AST: resolve the identifier to its `RegExp` literal, read
 * `node.regex.pattern`, and ask whether the pattern is anchored at both ends
 * with every `.` escaped.
 *
 * These helpers only ever *grant* validation. A pattern they cannot prove safe
 * leaves the caller exactly where it was, so nothing here can turn a quiet
 * file into a reported one.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { resolveInitializer } from './resolve-binding';

/**
 * Is this pattern anchored at both ends with no unescaped `.`?
 *
 * `^` and `$` are what stop `https://app.example.com.evil.io` from matching a
 * pattern written for `app.example.com`; escaping the dots is what stops
 * `appXexample.com`. Character classes are skipped — a `.` inside `[…]` is a
 * literal dot already.
 */
export function isAnchoredHostPattern(pattern: string): boolean {
  if (!pattern.startsWith('^')) return false;
  if (!pattern.endsWith('$')) return false;
  // A trailing `\$` is a literal dollar sign, not an end anchor.
  if (pattern.endsWith('\\$')) return false;

  let escaped = false;
  let inClass = false;
  for (const character of pattern) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (inClass) {
      if (character === ']') inClass = false;
      continue;
    }
    if (character === '[') {
      inClass = true;
      continue;
    }
    if (character === '.') return false;
  }
  return true;
}

/** The `RegExp` literal source behind an expression, if it is knowable. */
function resolveRegexpPattern(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): string | null {
  if (node.type === 'Literal') {
    return 'regex' in node ? node.regex.pattern : null;
  }
  if (node.type !== 'Identifier') return null;
  const init = resolveInitializer(node, sourceCode);
  if (init === undefined || init.type !== 'Literal') return null;
  return 'regex' in init ? init.regex.pattern : null;
}

/**
 * `ALLOWED_ORIGIN.test(value)` where `ALLOWED_ORIGIN` is a fully anchored,
 * dot-escaped literal — a check that genuinely constrains the whole string.
 */
export function isAnchoredRegexpTest(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier' ||
    callee.property.name !== 'test'
  ) {
    return false;
  }
  const pattern = resolveRegexpPattern(callee.object, sourceCode);
  return pattern !== null && isAnchoredHostPattern(pattern);
}

/**
 * The body of the function a name refers to, when the name resolves to exactly
 * one knowable function. A declaration with no body (`declare function`), an
 * import, a re-declared name or a non-function all answer `undefined`.
 */
function resolveFunctionBody(
  identifier: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node | undefined {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === identifier.name);
    if (variable === undefined) continue;
    if (variable.defs.length !== 1) return undefined;
    if (variable.defs[0].type === 'FunctionName') {
      return variable.defs[0].node.body ?? undefined;
    }
    const init = resolveInitializer(identifier, sourceCode);
    if (init === undefined) return undefined;
    return init.type === 'FunctionExpression' ||
      init.type === 'ArrowFunctionExpression'
      ? init.body
      : undefined;
  }
  return undefined;
}

/**
 * Is this guard expression a check that really constrains the value?
 *
 * Accepts the check written inline (`ALLOWED.test(target)`) and the far more
 * common one written as a named predicate (`isTrustedRedirect(target)`), by
 * resolving the predicate and reading the expression it returns. One level of
 * indirection, no data flow — a predicate that returns anything more involved
 * than a single anchored regexp test is left unproven, and therefore unhelpful
 * to the caller rather than wrongly reassuring.
 *
 * Deliberately not negation-aware: inside `if (!isTrusted(t))` the value has
 * failed the check, so treating the negation as validation would silence a
 * real finding.
 */
export function isAnchoredHostGuard(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (isAnchoredRegexpTest(node, sourceCode)) return true;
  if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
    return false;
  }
  const body = resolveFunctionBody(node.callee, sourceCode);
  if (body === undefined) return false;
  if (body.type !== 'BlockStatement') {
    return isAnchoredRegexpTest(body, sourceCode);
  }
  return body.body.some(
    (statement) =>
      statement.type === 'ReturnStatement' &&
      statement.argument !== null &&
      isAnchoredRegexpTest(statement.argument, sourceCode),
  );
}
