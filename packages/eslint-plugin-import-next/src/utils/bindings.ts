/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/**
 * Is `name` declared or imported in a scope enclosing `node`?
 *
 * CommonJS and AMD globals (`require`, `module`, `exports`, `__dirname`,
 * `define`) are only those globals when nothing in the file binds the name: a
 * parameter, an import, `const require = createRequire(import.meta.url)` or
 * the ESM `__dirname` shim is the file's own value. A configured global
 * (`globals.node`) is a variable with no definition, so it is not a local
 * binding.
 */
export function isLocallyBound(
  sourceCode: Readonly<TSESLint.SourceCode>,
  node: TSESTree.Node,
  name: string,
): boolean {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope;
    scope = scope.upper
  ) {
    const variable = scope.set.get(name);
    if (variable && variable.defs.length > 0) return true;
  }
  return false;
}

/** Every name a binding pattern declares: `{ a, b: [c] }` declares a, c. */
export function boundNames(pattern: TSESTree.Node): string[] {
  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name];
    case 'ObjectPattern':
      return pattern.properties.flatMap((p) =>
        boundNames(p.type === 'RestElement' ? p.argument : p.value),
      );
    case 'ArrayPattern':
      return pattern.elements.flatMap((e) => (e ? boundNames(e) : []));
    case 'AssignmentPattern':
      return boundNames(pattern.left);
    case 'RestElement':
      return boundNames(pattern.argument);
    default:
      // A member expression is a valid assignment target but declares nothing.
      return [];
  }
}
