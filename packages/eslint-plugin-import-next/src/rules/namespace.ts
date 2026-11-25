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
import { ExportMap, exportMapOf } from '../utils/export-map';
import {
  exportName,
  PARSE_ERROR_MESSAGE,
  referencesOf,
  reportParseErrors,
} from '../utils/export-map-rules';

type MessageIds =
  'namespace' | 'computedReference' | 'assignment' | 'noExports' | 'parseError';

export interface Options {
  additionalModules?: string[];
  /**
   * eslint-plugin-import: a computed member of a namespace import
   * (`ns[key]`, `ns['a']`). `true` checks none of them; `false` reports each
   * one as a reference it cannot validate. Absent, this rule's own reading:
   * a string key is checked like `ns.a`, a runtime key is not a finding.
   */
  allowComputed?: boolean;
}

export type RuleOptions = [Options?];

/**
 * Without type information: eslint-plugin-import's reading. Each imported
 * module is parsed (`../utils/export-map`), and a member read through a
 * namespace import — `ns.a`, `ns.a.b` through a re-exported namespace,
 * `const { a } = ns`, `<ns.A />` — must be one it exports. Assigning to a
 * member is reported too. A module that is not known — unresolved, ignored,
 * CommonJS — is never a finding.
 */
function untyped(
  context: TSESLint.RuleContext<MessageIds, RuleOptions>,
): TSESLint.RuleListener {
  const [{ allowComputed } = {}] = context.options;
  /** Namespace imports by local name: the module, and the binding's reads. */
  const namespaces = new Map<
    string,
    {
      exports: ExportMap;
      reads: Set<TSESTree.Node>;
      binding: TSESLint.Scope.Variable;
    }
  >();

  const missing = (node: TSESTree.Node, name: string, path: string[]) =>
    context.report({
      node,
      messageId: 'namespace',
      data: { name, namespace: path.join('.') },
    });

  /** Collect the namespace imports, hoisted: a use may come first. */
  function collect(declaration: TSESTree.ProgramStatement) {
    if (
      declaration.type !== 'ImportDeclaration' ||
      declaration.specifiers.length === 0
    )
      return;
    const exports = exportMapOf(declaration.source.value, context);
    if (!exports) return;
    if (exports.errors.length > 0) {
      reportParseErrors(
        context,
        declaration.source,
        declaration.source.value,
        exports,
      );
      return;
    }
    // A CommonJS module (only a dynamic `import()` made it readable): its
    // members are not export declarations.
    if (exports.parseGoal !== 'Module') return;
    for (const specifier of declaration.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') {
        if (!exports.size() && !exports.hasUnknown()) {
          context.report({
            node: specifier,
            messageId: 'noExports',
            data: { source: declaration.source.value },
          });
        }
        namespaces.set(specifier.local.name, {
          exports,
          reads: referencesOf(context, specifier),
          binding: context.sourceCode.getDeclaredVariables(specifier)[0],
        });
        continue;
      }
      // `import { b } from './a'` where b is itself a namespace.
      const meta = exports.get(
        specifier.type === 'ImportSpecifier'
          ? exportName(specifier.imported)
          : 'default',
      );
      if (meta?.namespace) {
        namespaces.set(specifier.local.name, {
          exports: meta.namespace,
          reads: referencesOf(context, specifier),
          binding: context.sourceCode.getDeclaredVariables(specifier)[0],
        });
      }
    }
  }

  /** `const { a, b: { c } } = ns`, followed into nested namespaces. */
  function checkPattern(
    pattern: TSESTree.Node,
    exports: ExportMap | null | undefined,
    path: string[],
  ) {
    if (!(exports instanceof ExportMap) || pattern.type !== 'ObjectPattern') {
      return;
    }
    for (const property of pattern.properties) {
      if (property.type !== 'Property') continue;
      const name = objectKeyName(property);
      if (name === null) continue;
      if (!exports.mayHave(name)) {
        missing(property, name, path);
        continue;
      }
      const meta = exports.get(name);
      if (meta) checkPattern(property.value, meta.namespace, [...path, name]);
    }
  }

  return {
    Program(node: TSESTree.Program) {
      for (const statement of node.body) collect(statement);
    },

    MemberExpression(node: TSESTree.MemberExpression) {
      if (node.object.type !== 'Identifier') return;
      const root = node.object.name;
      const binding = namespaces.get(root);
      // Not the import: a parameter or local of the same name shadows it.
      if (!binding?.reads.has(node.object)) return;
      let exports: ExportMap | null | undefined = binding.exports;
      if (
        node.parent.type === 'AssignmentExpression' &&
        node.parent.left === node
      ) {
        context.report({
          node: node.parent,
          messageId: 'assignment',
          data: { name: root },
        });
      }
      // Deep: `ns.b.c` where `b` is itself a namespace.
      const path = [root];
      let member: TSESTree.Node = node;
      while (
        exports instanceof ExportMap &&
        member.type === 'MemberExpression'
      ) {
        if (member.computed && allowComputed !== undefined) {
          if (!allowComputed) {
            context.report({
              node: member.property,
              messageId: 'computedReference',
            });
          }
          return;
        }
        const name = propertyName(member);
        if (name === null) return;
        if (!exports.mayHave(name)) {
          missing(member.property, name, path);
          return;
        }
        const meta = exports.get(name);
        if (meta == null) return;
        path.push(name);
        exports = meta.namespace;
        const parent: TSESTree.Node = member.parent;
        if (parent.type !== 'MemberExpression' || parent.object !== member) {
          return;
        }
        member = parent;
      }
    },

    VariableDeclarator(node: TSESTree.VariableDeclarator) {
      if (node.init?.type !== 'Identifier') return;
      const binding = namespaces.get(node.init.name);
      if (!binding?.reads.has(node.init)) return;
      checkPattern(node.id, binding.exports, [node.init.name]);
    },

    // `<ns.A />`: a JSX member name has no computed spelling.
    JSXMemberExpression(node: TSESTree.JSXMemberExpression) {
      if (node.object.type !== 'JSXIdentifier') return;
      const name = node.object.name;
      const imported = namespaces.get(name);
      if (!imported) return;
      // JSX names are not recorded as references: find the binding by scope,
      // so a parameter `ns` in `(ns) => <ns.A />` is not the import.
      let scope = context.sourceCode.getScope(node);
      while (!scope.set.has(name)) scope = scope.upper!;
      if (scope.set.get(name) !== imported.binding) return;
      if (!imported.exports.mayHave(node.property.name)) {
        missing(node.property, node.property.name, [name]);
      }
    },
  };
}

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
      computedReference: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Computed Namespace Reference',
        description:
          'Unable to validate computed reference to imported namespace',
        severity: 'LOW',
        fix: 'Read the member by name (ns.member), or set allowComputed: true',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/namespace.md',
      }),
      assignment: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Namespace Assignment',
        description: "Assignment to member of namespace '{{name}}'",
        severity: 'HIGH',
        fix: 'A namespace import is read-only: assign to a local copy instead',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/namespace.md',
      }),
      noExports: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Empty Namespace',
        description: "No exported names found in module '{{source}}'",
        severity: 'MEDIUM',
        fix: 'Import the module for its side effects (import "x"), or export the names it should have',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/namespace.md',
      }),
      parseError: PARSE_ERROR_MESSAGE,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowComputed: {
            type: 'boolean',
            description:
              'eslint-plugin-import: true skips computed members of a namespace import (ns[key]); false reports each one. Absent: a string key is checked, a runtime key is not.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // No type information: read the other module by parsing it.
    if (!hasParserServices(context)) return untyped(context);

    const services = getParserServices(context);
    const checker = services.program?.getTypeChecker?.();
    const [{ allowComputed } = {}] = context.options;

    /**
     * The module behind namespace import `id`, or null when `id` is not a
     * namespace import, or the module does not resolve (unknown, not
     * missing), or is a CommonJS `export =` module (its names depend on
     * interop). Cheap: it does not list the module's exports.
     */
    function namespaceModule(id: TSESTree.Identifier): ts.Symbol | null {
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
      return moduleSymbol;
    }

    /** Export names per module, listed once per file rather than per access. */
    const exportNames = new Map<ts.Symbol, Set<string>>();

    /** The names the module behind namespace import `id` exports, or null. */
    function namespaceExports(id: TSESTree.Identifier): Set<string> | null {
      const moduleSymbol = namespaceModule(id);
      if (!moduleSymbol) return null;
      let names = exportNames.get(moduleSymbol);
      if (!names) {
        names = new Set(
          checker!.getExportsOfModule(moduleSymbol).map((s) => s.name),
        );
        exportNames.set(moduleSymbol, names);
      }
      return names;
    }

    return {
      // `ns.missing` and `ns['missing']`; a runtime key `ns[k]` names nothing.
      MemberExpression(node: TSESTree.MemberExpression) {
        if (node.object.type !== 'Identifier') return;
        // eslint-plugin-import's `allowComputed`, when set: a computed member
        // is skipped, or reported as unverifiable, whatever its key.
        if (node.computed && allowComputed !== undefined) {
          // Only whether it is a namespace import matters here, not its
          // export list: listing it for every `ns[key]` was O(accesses × exports).
          if (!allowComputed && namespaceModule(node.object)) {
            context.report({
              node: node.property,
              messageId: 'computedReference',
            });
          }
          return;
        }
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
