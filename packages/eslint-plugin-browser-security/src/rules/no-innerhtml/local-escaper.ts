/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Is this function an HTML escaper, judged by what its body DOES?
 *
 * `isSanitized` refuses every locally defined function, because a name proves
 * nothing: `const escapeHtml = (s) => s` wears a trusted name and escapes
 * nothing. This module is the other half of that decision. A local function is
 * accepted only when its body is a chain of `replace` calls on its own first
 * parameter that, between them, rewrite all five characters that open markup
 * or close an attribute: `&`, `<`, `>`, `"` and `'`, each to an entity.
 *
 * Fewer than five is not proven. `&`, `<` and `>` alone is safe in text but
 * not inside `<a title="${v}">`, and the rule cannot see which of the two the
 * caller wrote, so an incomplete escaper keeps reporting.
 *
 * @source triliumnext/trilium `escapeHtml`: five chained replaces.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { propertyName, staticString } from '@interlace/eslint-devkit';

/**
 * @vocabulary The `String.prototype` methods that rewrite every match of a
 * pattern: `replace` (with a global regular expression) and `replaceAll`.
 */
const REPLACERS: ReadonlySet<string> = new Set(['replace', 'replaceAll']);

const REQUIRED: readonly string[] = ['&', '<', '>', '"', "'"];

/** `&amp;`, `&#39;` and `&#x27;`: a named or numeric character reference. */
const ENTITY = /^&(?:[A-Za-z][A-Za-z0-9]*|#\d+|#[xX][0-9A-Fa-f]+);$/;

/** The one character a pattern or string argument matches, if it is exactly one. */
function matchedCharacter(node: TSESTree.Node | undefined): string | null {
  if (node?.type === 'Literal' && 'regex' in node && node.regex) {
    const { pattern, flags } = node.regex;
    if (!flags.includes('g')) return null;
    // `/\//g` and `/</g`-style escapes are not needed for these five.
    return pattern.length === 1 ? pattern : null;
  }
  const text = staticString(node);
  return text !== null && text.length === 1 ? text : null;
}

/** The characters rewritten by `<param>.replace(a, '&..;').replace(...)`. */
function escapedCharacters(
  expression: TSESTree.Node,
  parameter: string,
): Set<string> | null {
  const rewritten = new Set<string>();
  let current: TSESTree.Node = expression;
  while (
    current.type === 'CallExpression' &&
    current.callee.type === 'MemberExpression' &&
    REPLACERS.has(propertyName(current.callee) as string)
  ) {
    // `s.replace()` and `s.replace(a)` carry no pair, so both read as null.
    const [pattern, replacement] = current.arguments as (
      TSESTree.Node | undefined
    )[];
    const character = matchedCharacter(pattern);
    const entity = staticString(replacement);
    if (character === null || entity === null || !ENTITY.test(entity)) {
      return null;
    }
    rewritten.add(character);
    current = current.callee.object;
  }
  // The chain must start at the parameter itself, optionally through
  // `String(param)`: anything else escapes some other value.
  if (
    current.type === 'CallExpression' &&
    (current.callee as TSESTree.Identifier).name === 'String' &&
    current.arguments.length === 1
  ) {
    current = current.arguments[0];
  }
  return (current as TSESTree.Identifier).name === parameter ? rewritten : null;
}

/** The one expression a function returns, or null if it can return otherwise. */
export function returnedExpression(
  fn:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | TSESTree.FunctionDeclaration,
): TSESTree.Node | null {
  if (fn.body.type !== 'BlockStatement') return fn.body;
  const statements = fn.body.body;
  // A single `return <expr>` and nothing that could return earlier. A bare
  // `return;` has no argument, which reads as `null`.
  const only = statements[0];
  return statements.length === 1 && only.type === 'ReturnStatement'
    ? only.argument
    : null;
}

/** Does this function provably escape all five markup characters? */
export function isProvenEscaper(
  fn:
    | TSESTree.ArrowFunctionExpression
    | TSESTree.FunctionExpression
    | TSESTree.FunctionDeclaration,
): boolean {
  const parameter = fn.params[0] as TSESTree.Parameter | undefined;
  if (parameter?.type !== 'Identifier') return false;
  const returned = returnedExpression(fn);
  if (returned === null) return false;
  const rewritten = escapedCharacters(returned, parameter.name);
  return rewritten !== null && REQUIRED.every((c) => rewritten.has(c));
}
