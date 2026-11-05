/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { createRule, TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  hasParserServices,
  getParserServices,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import type ts from 'typescript';
import { loadTypeScript } from '../utils/typescript-peer';

type MessageIds = 'namespace';

export interface Options {
  additionalModules?: string[];
}

export type RuleOptions = [Options?];

export const namespace = createRule<RuleOptions, MessageIds>({
  name: 'namespace',
  meta: {
    interop: { runtimes: ['eslint'], nativeEquivalent: 'import/namespace' },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/namespace.md',
      description:
        'Ensure imported namespaces contain dereferenced properties as they are dereferenced',
    },
    messages: {
      namespace: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Namespace Import Issue',
        description: 'Namespace import usage issue',
        severity: 'MEDIUM',
        fix: 'Verify namespace member existence',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/namespace.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    if (!hasParserServices(context)) return {};

    const services = getParserServices(context);
    const checker = services.program?.getTypeChecker?.();

    /**
     * The names the module behind namespace import `id` exports, or null
     * when `id` is not a namespace import, or the module does not resolve
     * (unknown, not missing), or is a CommonJS `export =` module (its names
     * depend on interop).
     */
    function namespaceExports(id: TSESTree.Identifier): Set<string> | null {
      const symbol = checker?.getSymbolAtLocation(
        services.esTreeNodeToTSNodeMap.get(id),
      );
      const declaration = symbol?.declarations?.[0];
      if (
        !declaration ||
        declaration.kind !== loadTypeScript()?.SyntaxKind.NamespaceImport
      ) {
        return null;
      }
      // NamespaceImport -> ImportClause -> ImportDeclaration
      const importDeclaration = declaration.parent.parent as unknown as {
        moduleSpecifier: ts.Node;
      };
      const moduleSymbol = checker?.getSymbolAtLocation(
        importDeclaration.moduleSpecifier,
      );
      if (!moduleSymbol?.exports) return null;
      if (moduleSymbol.exports.has('export=' as ts.__String)) return null;
      return new Set(
        checker?.getExportsOfModule(moduleSymbol).map((s) => s.name),
      );
    }

    return {
      // `ns.missing` and `ns['missing']`; a runtime key `ns[k]` names nothing.
      MemberExpression(node: TSESTree.MemberExpression) {
        if (node.object.type !== 'Identifier') return;
        const name = propertyName(node);
        if (name === null) return;
        const names = namespaceExports(node.object);
        if (names && !names.has(name)) {
          context.report({
            node: node.property,
            messageId: 'namespace',
            data: { name },
          });
        }
      },

      // `const { missing } = ns` reads the name too.
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.id.type !== 'ObjectPattern' ||
          node.init?.type !== 'Identifier'
        ) {
          return;
        }
        const names = namespaceExports(node.init);
        if (!names) return;
        for (const property of node.id.properties) {
          if (property.type !== 'Property') continue;
          const name = objectKeyName(property);
          if (name !== null && !names.has(name)) {
            context.report({
              node: property.key,
              messageId: 'namespace',
              data: { name },
            });
          }
        }
      },
    };
  },
});
