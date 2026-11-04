/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Which local names a file binds to a package.
 *
 * Rules that recognise a middleware factory (`cors`, `helmet`,
 * `express-rate-limit`, …) by its conventional name miss every other
 * spelling a real codebase writes: `import corsMiddleware from 'cors'`,
 * `const { strictTransportSecurity } = require('helmet')`,
 * `import * as bodyParser from 'body-parser'`. The binding is what makes the
 * call the package's, not the name.
 */

import type { TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';

export interface PackageBindings {
  /** Locals bound to the module itself: default, namespace or `require`. */
  modules: Set<string>;
  /** Locals bound to a named export, mapped to that export's name. */
  named: Map<string, string>;
}

function specifierOf(node: TSESTree.Node | null | undefined): string | null {
  return node ? staticString(node) : null;
}

/** `require('pkg')`, or `require('pkg').default`. */
function requiredSpecifier(init: TSESTree.Node | null): string | null {
  if (!init) return null;
  if (
    init.type === AST_NODE_TYPES.MemberExpression &&
    propertyName(init) === 'default'
  ) {
    return requiredSpecifier(init.object);
  }
  if (
    init.type === AST_NODE_TYPES.CallExpression &&
    init.callee.type === AST_NODE_TYPES.Identifier &&
    init.callee.name === 'require'
  ) {
    return specifierOf(init.arguments[0]);
  }
  return null;
}

/** Every local the program binds to one of `packages`. */
export function packageBindings(
  program: TSESTree.Program,
  packages: readonly string[],
): PackageBindings {
  const wanted = new Set(packages);
  const result: PackageBindings = { modules: new Set(), named: new Map() };

  const addPattern = (id: TSESTree.Node) => {
    if (id.type === AST_NODE_TYPES.Identifier) {
      result.modules.add(id.name);
      return;
    }
    if (id.type !== AST_NODE_TYPES.ObjectPattern) return;
    for (const prop of id.properties) {
      if (prop.type !== AST_NODE_TYPES.Property) continue;
      const exported = objectKeyName(prop);
      const local =
        prop.value.type === AST_NODE_TYPES.AssignmentPattern
          ? prop.value.left
          : prop.value;
      if (exported === null || local.type !== AST_NODE_TYPES.Identifier)
        continue;
      if (exported === 'default') result.modules.add(local.name);
      else result.named.set(local.name, exported);
    }
  };

  const visit = (node: TSESTree.Node) => {
    if (node.type === AST_NODE_TYPES.ImportDeclaration) {
      if (!wanted.has(node.source.value)) return;
      for (const spec of node.specifiers) {
        if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
          const imported =
            spec.imported.type === AST_NODE_TYPES.Identifier
              ? spec.imported.name
              : String(spec.imported.value);
          if (imported === 'default') result.modules.add(spec.local.name);
          else result.named.set(spec.local.name, imported);
        } else {
          result.modules.add(spec.local.name);
        }
      }
      return;
    }
    if (
      node.type === AST_NODE_TYPES.TSImportEqualsDeclaration &&
      node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference
    ) {
      const spec = specifierOf(node.moduleReference.expression);
      if (spec && wanted.has(spec)) result.modules.add(node.id.name);
      return;
    }
    if (node.type === AST_NODE_TYPES.VariableDeclaration) {
      for (const d of node.declarations) {
        const spec = requiredSpecifier(d.init);
        if (spec && wanted.has(spec)) addPattern(d.id);
      }
    }
  };

  for (const stmt of program.body) {
    visit(
      stmt.type === AST_NODE_TYPES.ExportNamedDeclaration && stmt.declaration
        ? stmt.declaration
        : stmt,
    );
  }
  return result;
}

/**
 * Is `callee` the package's factory?
 *
 * With no `exportName`: the module itself (`cors(…)`, `corsMiddleware(…)`).
 * With one: that named export, called directly (`strictTransportSecurity(…)`)
 * or off the module (`helmet.strictTransportSecurity(…)`).
 */
export function isPackageCallee(
  callee: TSESTree.Node,
  bindings: PackageBindings,
  exportName?: string,
): boolean {
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return exportName === undefined
      ? bindings.modules.has(callee.name)
      : bindings.named.get(callee.name) === exportName;
  }
  if (
    exportName !== undefined &&
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    bindings.modules.has(callee.object.name)
  ) {
    return propertyName(callee) === exportName;
  }
  return false;
}
