/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Optional type information.
 *
 * When the file was parsed with `parserOptions.project` / `projectService`,
 * `sourceCode.parserServices.program` is a live TypeScript program and a
 * question like "which fields does this value have?" has a real answer. When
 * it was not, every helper here answers the conservative way, so the rules
 * behave exactly as they do without types. Type information can sharpen a
 * verdict; it is never required for one.
 *
 * `typescript` is not loaded here: the checker comes from the program the
 * parser already built, and the two flags read below are numeric constants.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/** `ts.TypeFlags.Any | ts.TypeFlags.Unknown`. */
const ANY_OR_UNKNOWN = 1 | 2;

interface TypeLike {
  readonly flags: number;
  getProperties(): ReadonlyArray<{ getName(): string }>;
}

interface TypeServices {
  readonly program?: {
    getTypeChecker(): { getTypeAtLocation(node: unknown): TypeLike };
  } | null;
  readonly esTreeNodeToTSNodeMap: { get(node: TSESTree.Node): unknown };
}

/**
 * Whether a value may carry one of `fields`.
 *
 * - No type information: `true` — nothing rules it out.
 * - `any` / `unknown`: `true` — the type says nothing either.
 * - Otherwise: whether the type declares a property whose name, lowercased,
 *   is in `fields`. An exact membership test on the declared property names,
 *   which are the type's structure, not a guess at what a variable holds.
 */
export function mayCarryField(
  node: TSESTree.Node,
  sourceCode: Pick<TSESLint.SourceCode, 'parserServices'>,
  fields: ReadonlySet<string>,
): boolean {
  const services = sourceCode.parserServices as unknown as TypeServices;
  if (!services.program) return true;
  const type = services.program
    .getTypeChecker()
    .getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
  if ((type.flags & ANY_OR_UNKNOWN) !== 0) return true;
  return type
    .getProperties()
    .some((property) => fields.has(property.getName().toLowerCase()));
}
