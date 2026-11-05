/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * "Is this the global `console`?" answered by binding.
 *
 * Matching the NAME `console` reports code that never touches the global: a
 * parameter, an injected logger, a test double that the file binds under the
 * same name. And it misses the global written another way:
 * `globalThis.console`, `import console from 'node:console'`.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  followConst,
  isGlobalReference,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

type SourceCode = Readonly<TSESLint.SourceCode>;

/**
 * Is `node` the global `name` - an undeclared `name`, `globalThis.name`, or
 * the `name` / `node:name` module itself - possibly through a `const` alias
 * (`const p = process`)?
 */
export function isGlobalObject(
  node: TSESTree.Node,
  name: string,
  sourceCode: SourceCode,
): boolean {
  const target = followConst(node, sourceCode);
  // `import console from 'node:console'`, `const p = require('process')`: the
  // module is the same object as the global.
  const binding = resolveModuleBinding(target, sourceCode.getScope(target));
  if (binding !== undefined) {
    return binding.module === name && binding.path.length === 0;
  }
  if (target.type === 'Identifier') {
    return target.name === name && isGlobalReference(target, sourceCode);
  }
  return (
    target.type === 'MemberExpression' &&
    propertyName(target) === name &&
    target.object.type === 'Identifier' &&
    target.object.name === 'globalThis' &&
    isGlobalReference(target.object, sourceCode)
  );
}
