/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
