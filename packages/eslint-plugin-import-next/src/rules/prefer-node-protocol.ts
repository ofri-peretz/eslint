/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: prefer-node-protocol
 * Enforce using the node: protocol for Node.js built-in modules (unicorn-inspired)
 */
import { builtinModules } from 'node:module';

import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferNodeProtocol';

export interface Options {
  /** Additional modules to check beyond built-ins */
  additionalModules?: string[];
}

type RuleOptions = [Options?];

// Node's own list of builtin modules, subpaths included (`fs/promises`). A
// scheme-only builtin appears here already prefixed (`node:test`), so its bare
// name is never mistaken for one.
const NODE_BUILT_INS = new Set(builtinModules);

export const preferNodeProtocol = createRule<RuleOptions, MessageIds>({
  name: 'prefer-node-protocol',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'unicorn/prefer-node-protocol',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/prefer-node-protocol.md',
      description:
        'Prefer using the node: protocol when importing Node.js builtin modules',
    },
    fixable: 'code',
    messages: {
      preferNodeProtocol: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Node.js Protocol Import',
        description: 'Use node: protocol for built-in modules',
        severity: 'MEDIUM',
        fix: 'Change "{{moduleName}}" to "node:{{moduleName}}" in import',
        documentationLink:
          'https://nodejs.org/api/modules.html#modules_node_imports',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalModules: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],

  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let additional: string[];

    /**
     * A builtin written without the scheme. Builtin names are exact and
     * case-sensitive: `FS` is not `fs`, `events/foo` is not a builtin subpath
     * (it resolves to the npm package `events`), and `punycode/` is Node's
     * documented way to load the npm package instead of the builtin.
     */
    function isBuiltInModule(moduleName: string): boolean {
      if (moduleName.startsWith('node:')) return false;
      if (NODE_BUILT_INS.has(moduleName)) return true;
      return additional.some(
        (name) => moduleName === name || moduleName.startsWith(`${name}/`),
      );
    }

    function check(source: TSESTree.Node) {
      const moduleName = staticString(source);
      if (moduleName === null || !isBuiltInModule(moduleName)) return;
      const fixedModuleName = `node:${moduleName}`;
      context.report({
        node: source,
        messageId: 'preferNodeProtocol',
        data: {
          moduleName,
          fix: `Change "${moduleName}" to "${fixedModuleName}"`,
        },
        fix(fixer: TSESLint.RuleFixer) {
          return fixer.replaceText(source, `"${fixedModuleName}"`);
        },
      });
    }

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({ additionalModules: additional = [] } = options || ({} as Options));
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        check(node.source);
      },
      // `export { x } from 'fs'`, `export * from 'fs'`
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) check(node.source);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        check(node.source);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          check(node.arguments[0]);
        }
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        check(node.source);
      },
      // `import fs = require('fs')`
      TSExternalModuleReference(node: TSESTree.TSExternalModuleReference) {
        check(node.expression);
      },
    };
  },
});
