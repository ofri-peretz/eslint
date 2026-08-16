/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Constant *values* — "which literal does this sink actually receive?"
 *
 * The two sibling modules answer neighbouring questions and neither answers
 * this one. `provenance.ts` asks whether an attacker can steer a value.
 * `constant-folding.ts` asks whether a value is constant *at all*, and says so
 * in its own header: "it returns a boolean, never a value". The crypto family
 * needs the value, because `'md5'` is a finding and `'sha256'` is not.
 *
 * Without it the whole family was literal-only at the call site:
 *
 * ```js
 * const ALGO = 'md5';
 * crypto.createHash(ALGO).update(password).digest('hex');   // silent
 * crypto.createHash('md5').update(password).digest('hex');  // reported
 * ```
 *
 * Both lines run MD5 over a password. Only the second was reported, by
 * `no-weak-hash-algorithm`, `no-weak-cipher-algorithm`, `no-ecb-mode`,
 * `no-static-iv` and `no-insecure-key-derivation` alike — five rules with the
 * same blind spot because each re-implemented `arg.type === 'Literal'` instead
 * of asking what the argument is worth. Hoisting an algorithm name to a
 * module constant is ordinary style, not obfuscation, so this was the largest
 * false-negative class in the plugin.
 *
 * ## Deliberately one hop
 *
 * `constLiteralOf` resolves a `const` bound directly to a literal and nothing
 * else. A chain (`const A = 'md5'; const B = A;`), a `let`, a parameter, an
 * import and a computed expression all come back `null` — unresolved, which
 * leaves the existing behaviour untouched. Guessing further would trade a
 * false negative for a false positive on code the rule cannot see.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

import { constLiteralOf, findVariable } from './provenance';

type SourceCode = TSESLint.SourceCode;

export interface ResolvedConstant {
  /** The value the sink receives at runtime. */
  value: string | number;
  /**
   * The node a fixer must replace to change that value.
   *
   * For an inline literal this is the argument itself. For a `const` alias it
   * is the *declaration's* initializer — rewriting the use site would leave
   * `const ALGO = 'md5'` in place and produce code that no longer compiles the
   * way the author wrote it. Reporting still happens at the use site, which is
   * where a reader is looking.
   */
  source: TSESTree.Node;
  /** True when the value was reached through a `const` alias. */
  viaAlias: boolean;
}

/** The value of a literal node written in place, or `null` if it is not one. */
function literalValue(node: TSESTree.Node): string | number | null {
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' || typeof node.value === 'number'
      ? node.value
      : null;
  }
  // A template literal with no expressions is a string spelled with backticks;
  // `const ALGO = \`md5\`` is the same constant as `const ALGO = 'md5'`.
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

/**
 * The constant this expression evaluates to, resolving one `const` alias.
 *
 * Returns `null` for anything unresolved. Callers must treat `null` as "no
 * evidence", never as "safe" — that distinction is the whole reason the crypto
 * rules stay quiet on `crypto.createHash(algorithmFromConfig)`.
 */
export function resolveConstant(
  sourceCode: SourceCode,
  node: TSESTree.Node,
): ResolvedConstant | null {
  const direct = literalValue(node);
  if (direct !== null) return { value: direct, source: node, viaAlias: false };

  if (node.type !== AST_NODE_TYPES.Identifier) return null;
  const init = constLiteralOf(sourceCode, node);
  if (init === undefined) return null;
  const value = literalValue(init);
  return value === null ? null : { value, source: init, viaAlias: true };
}

/**
 * The initializer of the single-definition `const` this identifier is bound to.
 *
 * Broader than `resolveConstant`, which insists the initializer be a literal.
 * `no-static-iv` needs the expression itself, because `const IV =
 * Buffer.from('0123456789abcdef')` is a hardcoded IV and the evidence is the
 * call, not a literal at the use site.
 *
 * `const` only, one definition only, plain identifier target only — a `let` can
 * be reassigned between the declaration and the sink, so its initializer proves
 * nothing about the value that arrives there.
 */
export function constInitializerOf(
  sourceCode: SourceCode,
  node: TSESTree.Identifier,
): TSESTree.Node | null {
  const variable = findVariable(sourceCode, node);
  if (!variable || variable.defs.length !== 1) return null;
  const def = variable.defs[0];
  if (def.type !== 'Variable' || def.parent.kind !== 'const') return null;
  if (def.node.id.type !== AST_NODE_TYPES.Identifier) return null;
  return def.node.init ?? null;
}

/** `resolveConstant` narrowed to string values, which is what most sinks take. */
export function resolveConstantString(
  sourceCode: SourceCode,
  node: TSESTree.Node,
): (ResolvedConstant & { value: string }) | null {
  const resolved = resolveConstant(sourceCode, node);
  return resolved !== null && typeof resolved.value === 'string'
    ? (resolved as ResolvedConstant & { value: string })
    : null;
}
