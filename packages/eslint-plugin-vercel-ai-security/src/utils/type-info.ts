/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Optional type information.
 *
 * With `parserOptions.project` / `projectService`, `parserServices.program`
 * is a live TypeScript program and "which properties does this value have?"
 * has a real answer. Without it — or when the type is `any` / `unknown`,
 * which says nothing — these helpers answer `null` and the caller falls back
 * to its structural check. Types sharpen a verdict; they are never required.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/** `ts.TypeFlags.Any | ts.TypeFlags.Unknown`. */
const ANY_OR_UNKNOWN = 1 | 2;

interface TypeServices {
  readonly program?: {
    getTypeChecker(): {
      getTypeAtLocation(node: unknown): {
        readonly flags: number;
        getProperties(): ReadonlyArray<{ getName(): string }>;
      };
    };
  } | null;
  readonly esTreeNodeToTSNodeMap: { get(node: TSESTree.Node): unknown };
}

/** The property names of a value's type, or `null` when types cannot say. */
export function typePropertyNames(
  node: TSESTree.Node,
  sourceCode: Pick<TSESLint.SourceCode, 'parserServices'>,
): string[] | null {
  const services = sourceCode.parserServices as unknown as
    TypeServices | undefined;
  if (!services?.program) return null;
  const type = services.program
    .getTypeChecker()
    .getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node));
  if ((type.flags & ANY_OR_UNKNOWN) !== 0) return null;
  return type.getProperties().map((property) => property.getName());
}
