/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * "Is this Node's `process` / the global `console`?" answered by binding.
 *
 * Matching the NAME `process` or `console` reports code that never touches the
 * global: a parameter, an injected logger, a test double that the file binds
 * under the same name. And it misses the global written another way:
 * `globalThis.process`, `import proc from 'node:process'`, `const { exit } =
 * process`.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  followConst,
  isGlobalReference,
  objectKeyName,
  propertyName,
  resolveModuleBinding,
  variableOf,
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

/**
 * Is this identifier destructured as `key` out of the global `objectName`:
 * `const { exit } = process`, `const { exit: quit } = globalThis.process`?
 */
function isDestructuredFromGlobal(
  id: TSESTree.Identifier,
  objectName: string,
  key: string,
  sourceCode: SourceCode,
): boolean {
  const variable = variableOf(id, sourceCode);
  if (!variable || variable.defs.length !== 1) return false;
  const def = variable.defs[0];
  if (def.type !== 'Variable') return false;
  const declarator = def.node;
  if (
    declarator.id.type !== 'ObjectPattern' ||
    declarator.init === null ||
    variable.references.some((r) => r.isWrite() && !r.init)
  )
    return false;
  const property = declarator.id.properties.find(
    (p): p is TSESTree.Property =>
      p.type === 'Property' &&
      (p.value.type === 'AssignmentPattern' ? p.value.left : p.value) ===
        variable.identifiers[0],
  );
  return (
    property !== undefined &&
    objectKeyName(property) === key &&
    isGlobalObject(declarator.init, objectName, sourceCode)
  );
}

/**
 * Is this callee Node's `process.exit`, in any spelling the code can bind it?
 */
export function isProcessExit(
  node: TSESTree.Node,
  sourceCode: SourceCode,
): boolean {
  // `const quit = process.exit; quit(1)` calls the same function.
  const callee = followConst(node, sourceCode);
  // `import proc from 'node:process'`, `import { exit as quit } from
  // 'process'`, `require('process').exit`.
  const binding = resolveModuleBinding(callee, sourceCode.getScope(callee));
  if (binding?.module === 'process') {
    return binding.path.length === 1 && binding.path[0] === 'exit';
  }
  if (callee.type === 'MemberExpression') {
    return (
      propertyName(callee) === 'exit' &&
      isGlobalObject(callee.object, 'process', sourceCode)
    );
  }
  return (
    callee.type === 'Identifier' &&
    isDestructuredFromGlobal(callee, 'process', 'exit', sourceCode)
  );
}
