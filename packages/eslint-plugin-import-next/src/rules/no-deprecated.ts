/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-deprecated
 * Forbid imported names marked with @deprecated documentation tag (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  getParserServices,
  hasParserServices,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type ts from 'typescript';
import { aliasSymbolFlag, loadTypeScript } from '../utils/typescript-peer';

/**
 * @vocabulary `deprecated` is the JSDoc block tag. It is defined by JSDoc and
 * understood by TypeScript and every editor, so it is not a name this project
 * or its consumers get to pick.
 *
 * @see https://jsdoc.app/tags-deprecated
 */
type MessageIds = 'deprecatedImport' | 'deprecatedExport' | 'deprecatedUsage';

export interface Options {
  /** Allow importing deprecated items (for migration periods) */
  allow?: string[];
  /** Custom deprecation markers to look for */
  deprecationMarkers?: string[];
  /** Check for deprecation in JSDoc comments */
  checkJSDoc?: boolean;
  /** Check for deprecation in TypeScript deprecated decorator */
  checkDecorators?: boolean;
}

type RuleOptions = [Options?];

export const noDeprecated = createRule<RuleOptions, MessageIds>({
  name: 'no-deprecated',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-deprecated.md',
      description:
        'Forbid imported names marked with @deprecated documentation tag',
    },
    hasSuggestions: true,
    messages: {
      deprecatedImport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated Import',
        description: 'Importing deprecated API that should be avoided',
        severity: 'MEDIUM',
        fix: 'Replace with recommended alternative or remove if no longer needed',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-deprecated.md',
      }),
      deprecatedExport: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated Export Usage',
        description: 'Using deprecated exported member',
        severity: 'MEDIUM',
        fix: 'Update to use the recommended replacement API',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-deprecated.md',
      }),
      deprecatedUsage: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Deprecated API Usage',
        description: 'Using deprecated function or method',
        severity: 'MEDIUM',
        fix: 'Migrate to the recommended modern API',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-deprecated.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            description:
              'List of deprecated items that are allowed (for migration periods)',
          },
          deprecationMarkers: {
            type: 'array',
            items: { type: 'string' },
            default: ['@deprecated'],
            description: 'Custom deprecation markers to look for in comments',
          },
          checkJSDoc: {
            type: 'boolean',
            default: true,
            description: 'Check for @deprecated in JSDoc comments',
          },
          checkDecorators: {
            type: 'boolean',
            default: true,
            description: 'Check for @deprecated decorator in TypeScript',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allow: [],
      deprecationMarkers: ['@deprecated'],
      checkJSDoc: true,
      checkDecorators: true,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allow: string[];
    let deprecationMarkers: string[];
    let checkJSDoc: boolean;
    let checkDecorators: boolean;
    /**
     * Deprecated declarations of THIS file, by binding: a parameter or an
     * object key that happens to share the name is not the deprecated item.
     */
    let deprecatedItems: Map<
      TSESLint.Scope.Variable,
      { location: TSESTree.Node; reason?: string; replacement?: string }
    >;
    /** Type information, when the parser provides it (for imports). */
    let typed:
      | {
          services: ReturnType<typeof getParserServices>;
          checker: ts.TypeChecker;
        }
      | undefined;

    function isAllowed(name: string): boolean {
      return allow.includes(name);
    }

    function parseJSDocDeprecated(comment: string): {
      deprecated: boolean;
      reason?: string;
      replacement?: string;
    } {
      const lines = comment.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Check for @deprecated tag
        for (const marker of deprecationMarkers) {
          if (trimmed.includes(marker)) {
            const afterMarker = trimmed
              .substring(trimmed.indexOf(marker) + marker.length)
              .trim();

            // Try to extract reason and replacement
            let reason: string | undefined;
            let replacement: string | undefined;

            // Look for common patterns like "Use X instead" or "Replaced by Y"
            const insteadMatch = afterMarker.match(
              /(?:use|replaced by|see)\s+([^\s]+(?:\s+[^\s]+)*?)(?:\s|$)/i,
            );
            if (insteadMatch) {
              // Remove common trailing words
              replacement = insteadMatch[1]
                .trim()
                .replace(/\s+instead$|\s+or$|\s+as$|\s+with$/i, '');
            }

            // The rest is usually the reason
            const reasonText = afterMarker
              .replace(/use\s+[^.]*[.]?/i, '')
              .replace(/replaced by\s+[^.]*[.]?/i, '')
              .trim();
            if (reasonText) {
              reason = reasonText;
            }

            return { deprecated: true, reason, replacement };
          }
        }
      }

      return { deprecated: false };
    }

    /** Record the variable `declaration` declares as `name` as deprecated. */
    function markDeprecated(
      name: string,
      declaration: TSESTree.Node | null,
      info: { location: TSESTree.Node; reason?: string; replacement?: string },
    ) {
      if (declaration) {
        for (const variable of context.sourceCode.getDeclaredVariables(
          declaration,
        )) {
          if (variable.name === name) deprecatedItems.set(variable, info);
        }
        return;
      }
      // `export { a }` marks the binding `a` already declared in scope.
      for (
        let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(
          info.location,
        );
        scope;
        scope = scope.upper
      ) {
        const variable = scope.set.get(name);
        if (variable) {
          deprecatedItems.set(variable, info);
          return;
        }
      }
    }

    /**
     * `node` carries the comments; `declaration` declares the binding
     * (defaults to `node`; null for an export specifier of a binding in
     * scope).
     */
    function checkComments(
      node: TSESTree.Node,
      name: string,
      declaration: TSESTree.Node | null = node,
    ) {
      if (!checkJSDoc) return;

      const sourceCode = context.sourceCode;
      const comments = sourceCode.getCommentsBefore(node);
      const allComments = [...comments];

      for (const comment of allComments) {
        if (comment.type === 'Block' && comment.value.includes('*')) {
          // JSDoc comment
          const deprecationInfo = parseJSDocDeprecated(comment.value);
          if (deprecationInfo.deprecated) {
            markDeprecated(name, declaration, {
              location: node,
              reason: deprecationInfo.reason,
              replacement: deprecationInfo.replacement,
            });
            break;
          }
        }
      }
    }

    function checkDecoratorsForDeprecation(node: TSESTree.Node, name: string) {
      if (!checkDecorators) return;

      // Check for @deprecated decorator in TypeScript
      if (
        'decorators' in node &&
        Array.isArray((node as { decorators?: unknown[] }).decorators)
      ) {
        // The Array.isArray guard above proves decorators is an array.
        const decorators = (node as { decorators: unknown[] }).decorators;
        for (const decorator of decorators) {
          const dec = decorator as TSESTree.Decorator;
          if (
            (dec.expression.type === 'CallExpression' &&
              dec.expression.callee.type === 'Identifier' &&
              dec.expression.callee.name === 'deprecated') ||
            (dec.expression.type === 'Identifier' &&
              dec.expression.name === 'deprecated')
          ) {
            markDeprecated(name, node, {
              location: node,
              reason: 'Marked with @deprecated decorator',
            });
            break;
          }
        }
      }
    }

    function reportDeprecatedUsage(
      node: TSESTree.Node,
      name: string,
      usage: string,
      deprecationInfo: { reason?: string; replacement?: string },
    ) {
      if (isAllowed(name)) return;

      const { replacement } = deprecationInfo;

      context.report({
        node,
        messageId: 'deprecatedUsage',
        data: {
          name,
          usage,
          reason: deprecationInfo.reason || 'This API is deprecated',
          replacement:
            deprecationInfo.replacement ||
            'Check documentation for replacement',
          suggestion: deprecationInfo.replacement
            ? `Replace with ${deprecationInfo.replacement}`
            : 'Find modern replacement in documentation',
        },
        suggest: replacement
          ? [
              {
                messageId: 'deprecatedUsage',
                fix(fixer: TSESLint.RuleFixer) {
                  return fixer.replaceText(node, replacement);
                },
                data: {
                  replacement,
                  suggestion: `Replace with ${replacement}`,
                },
              },
            ]
          : [],
      });
    }

    /** A reference to a deprecated local, reported at the expression that uses it. */
    function reportReference(
      reference: TSESLint.Scope.Reference,
      info: { reason?: string; replacement?: string },
    ) {
      if (reference.init || !reference.isRead()) return;
      const id = reference.identifier as TSESTree.Identifier;
      const parent = id.parent;
      const name = id.name;
      // `export { old }` re-exports the binding; it does not use it.
      if (parent.type === 'ExportSpecifier') return;
      if (parent.type === 'CallExpression' && parent.callee === id) {
        reportDeprecatedUsage(parent, name, `${name}()`, info);
      } else if (parent.type === 'NewExpression' && parent.callee === id) {
        reportDeprecatedUsage(parent, name, `new ${name}()`, info);
      } else if (parent.type === 'MemberExpression' && parent.object === id) {
        // `obj['prop']` reads the same deprecated export `obj.prop` reads.
        const member = propertyName(parent);
        reportDeprecatedUsage(
          parent,
          name,
          member === null ? name : `${name}.${member}`,
          info,
        );
      } else {
        reportDeprecatedUsage(id, name, name, info);
      }
    }

    /** Tag names (`deprecated`) the configured markers stand for. */
    function markerTags(): Set<string> {
      return new Set(deprecationMarkers.map((m) => m.replace(/^@/, '')));
    }

    /**
     * Is the export `symbol` (an import's target) deprecated, as TypeScript
     * sees its declaration: a JSDoc tag, or a `@deprecated` decorator?
     */
    function isDeprecatedSymbol(
      symbol: ts.Symbol | undefined,
      typeChecker: ts.TypeChecker,
    ): boolean {
      if (!symbol) return false;
      const target =
        symbol.flags & aliasSymbolFlag()
          ? typeChecker.getAliasedSymbol(symbol)
          : symbol;
      if (checkJSDoc) {
        const tags = markerTags();
        if (target.getJsDocTags(typeChecker).some((t) => tags.has(t.name))) {
          return true;
        }
      }
      const tsModule = loadTypeScript();
      if (!checkDecorators || !tsModule) return false;
      return (target.declarations ?? []).some((declaration) =>
        (tsModule.canHaveDecorators(declaration)
          ? (tsModule.getDecorators(declaration) ?? [])
          : []
        ).some((decorator) => {
          const expression = tsModule.isCallExpression(decorator.expression)
            ? decorator.expression.expression
            : decorator.expression;
          return (
            tsModule.isIdentifier(expression) &&
            expression.text === 'deprecated'
          );
        }),
      );
    }

    /** The TS symbol behind an ESTree node, when type information exists. */
    function symbolOf(
      node: TSESTree.Node,
      { services, checker }: NonNullable<typeof typed>,
    ): ts.Symbol | undefined {
      return checker.getSymbolAtLocation(
        services.esTreeNodeToTSNodeMap.get(node),
      );
    }

    return {
      before() {
        const [options] = context.options;
        ({
          allow = [],
          deprecationMarkers = [],
          checkJSDoc = true,
          checkDecorators = true,
        } = options || {});
        // Custom markers ADD to the standard JSDoc tag; they do not replace it.
        deprecationMarkers = ['@deprecated', ...deprecationMarkers];

        const filename = context.filename;
        if (!filename) {
          return false;
        }

        deprecatedItems = new Map();
        typed = undefined;
        // hasParserServices proves a program exists.
        if (hasParserServices(context)) {
          const services = getParserServices(context);
          typed = {
            services,
            checker: (services.program as ts.Program).getTypeChecker(),
          };
        }

        return true;
      },

      // Check for deprecated declarations in the current file
      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        node.declarations.forEach((decl: TSESTree.VariableDeclarator) => {
          if (decl.id.type === 'Identifier') {
            checkComments(node, decl.id.name);
            checkDecoratorsForDeprecation(node, decl.id.name);
          }
        });
      },

      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (node.id) {
          checkComments(node, node.id.name);
          checkDecoratorsForDeprecation(node, node.id.name);
        }
      },

      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (node.id) {
          checkComments(node, node.id.name);
          checkDecoratorsForDeprecation(node, node.id.name);
        }
      },

      // Check for deprecated exports in the current file
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        const declaration = node.declaration;
        if (declaration) {
          if (declaration.type === 'VariableDeclaration') {
            declaration.declarations.forEach(
              (decl: TSESTree.VariableDeclarator) => {
                if (decl.id.type === 'Identifier') {
                  checkComments(node, decl.id.name, declaration);
                  checkDecoratorsForDeprecation(declaration, decl.id.name);
                }
              },
            );
          } else if (
            (declaration.type === 'FunctionDeclaration' ||
              declaration.type === 'ClassDeclaration') &&
            declaration.id
          ) {
            checkComments(node, declaration.id.name, declaration);
            checkDecoratorsForDeprecation(declaration, declaration.id.name);
          }
        }
        // `/** @deprecated */ export { a };` deprecates the local `a`.
        if (!node.source) {
          for (const specifier of node.specifiers ?? []) {
            // Without a source, the local is always an Identifier.
            checkComments(
              node,
              (specifier.local as TSESTree.Identifier).name,
              null,
            );
          }
        }
      },

      // Imports of deprecated exports, when type information can see the
      // other module. Without it, the other module is unknown: silent.
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (!typed) return;
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportNamespaceSpecifier') continue;
          const imported =
            spec.type === 'ImportDefaultSpecifier'
              ? 'default'
              : spec.imported.type === 'Identifier'
                ? spec.imported.name
                : spec.imported.value;
          if (isAllowed(imported)) continue;
          if (isDeprecatedSymbol(symbolOf(spec.local, typed), typed.checker)) {
            context.report({
              node: spec,
              messageId: 'deprecatedImport',
              data: { name: imported },
            });
          }
        }
      },

      // `ns.old` / `ns['old']` through a namespace import.
      MemberExpression(node: TSESTree.MemberExpression) {
        if (!typed || node.object.type !== 'Identifier') return;
        const { checker } = typed;
        const member = propertyName(node);
        if (member === null || isAllowed(member)) return;
        const objectSymbol = symbolOf(node.object, typed);
        if (
          !objectSymbol ||
          objectSymbol.declarations?.[0]?.kind !==
            loadTypeScript()?.SyntaxKind.NamespaceImport
        ) {
          return;
        }
        const moduleSymbol = checker.getAliasedSymbol(objectSymbol);
        const exported = checker
          .getExportsOfModule(moduleSymbol)
          .find((symbol) => symbol.name === member);
        if (isDeprecatedSymbol(exported, checker)) {
          context.report({
            node,
            messageId: 'deprecatedExport',
            data: { name: member },
          });
        }
      },

      'Program:exit'() {
        for (const [variable, info] of deprecatedItems) {
          for (const reference of variable.references) {
            reportReference(reference, info);
          }
        }
      },
    };
  },
});
