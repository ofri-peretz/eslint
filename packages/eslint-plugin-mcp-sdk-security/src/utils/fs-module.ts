/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Which `fs` export is this callee?
 *
 * Resolved through the module binding, never matched by name: `fs`,
 * `fs.promises`, `fs/promises`, `require()`, and the drop-in replacements
 * `fs-extra` and `graceful-fs`. `store.readFile(p)` is not `fs`.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { resolveModuleBinding } from '@interlace/eslint-devkit';

/** Drop-in `fs` replacements, resolved as `fs`. */
const FS_EQUIVALENTS = { 'fs-extra': 'fs', 'graceful-fs': 'fs' };

/** The `fs` export a callee is, through `fs`, `fs.promises` and `fs/promises`. */
export function fsExport(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): string | undefined {
  const binding = resolveModuleBinding(callee, scope, {
    equivalents: FS_EQUIVALENTS,
  });
  if (binding === undefined) return undefined;
  const path =
    binding.module === 'fs' && binding.path[0] === 'promises'
      ? binding.path.slice(1)
      : binding.module === 'fs' || binding.module === 'fs/promises'
        ? binding.path
        : undefined;
  return path?.length === 1 ? path[0] : undefined;
}
