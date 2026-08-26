/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * One thing, written several ways.
 *
 * JavaScript spells a constant string two ways and a property name three, and
 * a rule that reads only the common spelling of each sees a strict subset of
 * its own subject. That is not a judgement call the rule made — it is what
 * `node.type === 'Literal'` means when the grammar also allows a template
 * literal, and it is invisible in review because the test suite is written in
 * the same spelling as the rule.
 *
 * Measured across this repository in 2026-08: 3,825 meaning-preserving
 * rewrites of known true positives produced **1,156 cases where the rule
 * reported the original and went silent on the rewrite**, across 163 of 470
 * rules. Not one of them was a decision anybody made.
 *
 * The spellings that matter, and why each is not exotic:
 *
 *   'x'  vs  `x`          a no-substitution template literal IS a string
 *                         constant. Prettier leaves them, codegen emits them,
 *                         and `String.raw` requires them.
 *   o.k  vs  o['k']       the same property. Minifiers, obfuscators and any
 *                         key that is not a valid identifier use the second.
 *   {k:v} vs {['k']:v}    the same declaration, and what a spread-with-
 *                         conditional lowers to.
 *
 * Reach for these instead of matching a node type directly whenever the rule
 * cares about WHICH string or WHICH property, not about how it was written.
 * When a rule genuinely means "a quoted literal and nothing else", match the
 * node type and say why in a comment — that is a position, and positions are
 * fine. Silence by omission is not.
 */
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

/**
 * The string a node names, in either spelling, or `null` if it does not name
 * one statically.
 *
 * A template literal with expressions is deliberately `null`: `` `a${b}` ``
 * has no single value, and guessing one is the data-flow question a
 * type-unaware rule does not ask.
 */
export function staticString(
  node: TSESTree.Node | null | undefined,
): string | null {
  if (!node) return null;
  if (node.type === AST_NODE_TYPES.Literal) {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (
    node.type === AST_NODE_TYPES.TemplateLiteral &&
    node.expressions.length === 0
  ) {
    // Exactly one quasi, always — a template with nothing to interpolate cannot
    // be split into more. `cooked` is non-nullable in TSESTree and this parser
    // never nulls it, so a `?.` or a `?? null` here would be a branch no test
    // could ever reach, which is worse than no branch at all.
    const [only] = node.quasis as [TSESTree.TemplateElement];
    return only.value.cooked;
  }
  return null;
}

/** Whether a node names this exact string, however it is spelled. */
export const isStaticString = (
  node: TSESTree.Node | null | undefined,
  value: string,
): boolean => staticString(node) === value;

/**
 * The property a member expression reads — `o.k`, `o['k']` and `` o[`k`] ``
 * all return `'k'`.
 *
 * A computed key that is not a static string returns `null`: `o[k]` is decided
 * at runtime, and which property it names is not a question the AST answers.
 */
export function propertyName(node: TSESTree.MemberExpression): string | null {
  if (!node.computed) {
    return node.property.type === AST_NODE_TYPES.Identifier
      ? node.property.name
      : null;
  }
  return staticString(node.property);
}

/**
 * The key an object property declares — `{ k: v }`, `{ 'k': v }` and
 * `{ ['k']: v }` all return `'k'`.
 *
 * Numeric keys come back as their source text, so `{ 200: v }` is `'200'` —
 * `obj[200]` and `obj['200']` are the same property in JavaScript, and a rule
 * matching on names should see them as one.
 */
export function objectKeyName(
  node:
    TSESTree.Property | TSESTree.MethodDefinition | TSESTree.PropertyDefinition,
): string | null {
  const key = node.key;
  if (!node.computed && key.type === AST_NODE_TYPES.Identifier) return key.name;
  if (key.type === AST_NODE_TYPES.Literal && typeof key.value === 'number')
    return String(key.value);
  return staticString(key);
}

/**
 * The dotted path a member chain spells, root first, or `null` if any link is
 * not statically nameable. `crypto['createHash']` and `crypto.createHash`
 * both give `['crypto', 'createHash']`.
 */
export function memberPath(node: TSESTree.Node): string[] | null {
  if (node.type === AST_NODE_TYPES.Identifier) return [node.name];
  if (node.type !== AST_NODE_TYPES.MemberExpression) return null;
  const head = memberPath(node.object);
  if (head === null) return null;
  const tail = propertyName(node);
  return tail === null ? null : [...head, tail];
}
