/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { AST_NODE_TYPES, type TSESTree } from '@interlace/eslint-devkit';

/**
 * Property names the AI SDK accepts for the system prompt.
 *
 * As of AI SDK v7 the canonical name is `instructions`; `system` still works but
 * is marked `@deprecated Use 'instructions' instead` in the SDK's own types. Both
 * must be checked — code written against current docs uses `instructions`, and
 * code predating v7 uses `system`.
 */
export const SYSTEM_PROMPT_PROPS: ReadonlySet<string> = new Set(['instructions', 'system']);

/** True when `name` is a property the AI SDK treats as the system prompt. */
export function isSystemPromptProp(name: string | null): boolean {
  return name !== null && SYSTEM_PROMPT_PROPS.has(name);
}

/**
 * Static name of an object property key, or `null` when it isn't statically known.
 *
 * `{ instructions: x }` and `{ 'instructions': x }` are the same property, but the
 * first parses to an `Identifier` key and the second to a string `Literal`. Reading
 * only `Identifier` silently skips the quoted form, so a rule stops firing on code
 * that is semantically identical. Computed keys (`{ [k]: x }`) stay `null` — the
 * name genuinely isn't known statically.
 */
export function getStaticPropName(prop: TSESTree.Property): string | null {
  // A computed key is a variable reference, not a name. In
  // `{ [instructions]: value }` the key node is an Identifier called
  // `instructions`, but the property being set is whatever that variable holds —
  // unknowable here. Reading `.name` made these rules treat an arbitrary
  // property as the system prompt.
  if (prop.computed) return null;
  if (prop.key.type === AST_NODE_TYPES.Identifier) return prop.key.name;
  if (prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string') {
    return prop.key.value;
  }
  return null;
}
