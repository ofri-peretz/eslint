/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-cross-domain-imports
 * Prevents imports across domain/feature boundaries
 * Priority 2: Architectural Patterns
 *
 * @see https://martinfowler.com/bliki/BoundedContext.html
 */
import path from 'node:path';

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { normalizePath } from '@interlace/eslint-devkit';

type MessageIds =
  | 'crossDomainImport'
  | 'useSharedModule'
  | 'useEvents'
  | 'useApplicationService';

export interface Options {
  /** Domain/feature directory patterns. Default: ['domains', 'features', 'modules'] */
  domainPatterns?: string[];

  /** Shared modules that can be imported. Default: ['shared', 'common', 'utils'] */
  allowedSharedModules?: string[];

  /** Ignore imports from node_modules. Default: true */
  ignoreNodeModules?: boolean;

  /** Custom domain boundary rules. Default: [] */
  customRules?: Array<{
    from: string;
    to: string[];
    allowed?: string[];
  }>;
}

type RuleOptions = [Options?];

/**
 * The domain a path lies in: the directory right after a `domainPatterns`
 * directory, when something lies below it (`domains/user/a.ts` -> `user`).
 * `domains/helper` with nothing below could be the file `domains/helper.ts`,
 * which is in no domain, so it is not decided.
 */
function extractDomain(
  filePath: string,
  domainPatterns: string[],
): string | null {
  const normalizedPath = normalizePath(filePath);

  for (const pattern of domainPatterns) {
    const regex = new RegExp(`(?:^|/)${pattern}/([^/]+)/[^/]`, 'i');
    const match = normalizedPath.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Does the path pass through a shared directory (a whole path segment)?
 */
function isSharedModule(
  filePath: string,
  allowedSharedModules: string[],
): boolean {
  const normalizedPath = `/${normalizePath(filePath)}/`;
  return allowedSharedModules.some((shared) =>
    normalizedPath.includes(`/${shared}/`),
  );
}

/**
 * Check if import violates domain boundaries.
 *
 * A relative `importPath` is resolved against `sourceFile`, and the target's
 * domain is read from the path it resolves to - not guessed from the
 * specifier's text. A package specifier never resolves into a domain
 * directory, so it never violates.
 */
export function violatesDomainBoundary(
  sourceFile: string,
  importPath: string,
  options: Options,
): {
  violates: boolean;
  sourceDomain: string | null;
  targetDomain: string | null;
} {
  const {
    domainPatterns = ['domains', 'features', 'modules'],
    allowedSharedModules = ['shared', 'common', 'utils'],
    customRules = [],
  }: Options = options || {};

  if (!importPath.startsWith('.')) {
    return { violates: false, sourceDomain: null, targetDomain: null };
  }

  const source = normalizePath(sourceFile);
  const target = path.posix.join(path.posix.dirname(source), importPath);
  const sourceDomain = extractDomain(source, domainPatterns);
  const targetDomain = extractDomain(target, domainPatterns);

  if (
    !sourceDomain ||
    !targetDomain ||
    sourceDomain === targetDomain ||
    isSharedModule(target, allowedSharedModules)
  ) {
    return { violates: false, sourceDomain, targetDomain };
  }

  for (const rule of customRules) {
    if (
      source.includes(rule.from) &&
      rule.allowed?.some((allowed) => target.includes(allowed))
    ) {
      return { violates: false, sourceDomain, targetDomain };
    }
  }

  return { violates: true, sourceDomain, targetDomain };
}

export const noCrossDomainImports = createRule<RuleOptions, MessageIds>({
  name: 'no-cross-domain-imports',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-cross-domain-imports.md',
      description: 'Prevents imports across domain/feature boundaries',
    },
    hasSuggestions: true,
    messages: {
      crossDomainImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Cross-domain import',
        description:
          'Import from {{targetDomain}} to {{sourceDomain}} violates domain boundaries',
        severity: 'HIGH',
        fix: 'Use shared modules, events, or application services',
        documentationLink: 'https://martinfowler.com/bliki/BoundedContext.html',
      }),
      useSharedModule: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Shared Module',
        description: 'Move shared code to shared module',
        severity: 'LOW',
        fix: 'Extract to shared/ or common/ directory',
        documentationLink: 'https://martinfowler.com/bliki/BoundedContext.html',
      }),
      useEvents: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Events',
        description: 'Use event-driven communication',
        severity: 'LOW',
        fix: 'Publish events instead of direct imports',
        documentationLink: 'https://martinfowler.com/eaaDev/DomainEvent.html',
      }),
      useApplicationService: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Application Service',
        description: 'Use application service layer',
        severity: 'LOW',
        fix: 'Route through application service for cross-domain calls',
        documentationLink: 'https://martinfowler.com/bliki/BoundedContext.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          domainPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['domains', 'features', 'modules'],
            description: 'Domain/feature directory patterns',
          },
          allowedSharedModules: {
            type: 'array',
            items: { type: 'string' },
            default: ['shared', 'common', 'utils'],
            description: 'Shared modules that can be imported',
          },
          ignoreNodeModules: {
            type: 'boolean',
            default: true,
            description: 'Ignore imports from node_modules',
          },
          customRules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: {
                  type: 'array',
                  items: { type: 'string' },
                },
                allowed: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['from', 'to'],
            },
            default: [],
            description: 'Custom domain boundary rules',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      domainPatterns: ['domains', 'features', 'modules'],
      allowedSharedModules: ['shared', 'common', 'utils'],
      ignoreNodeModules: true,
      customRules: [],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let filename: string;
    let options: Options;

    /** Every way a module is loaded or re-exported, by its specifier. */
    function check(
      source: TSESTree.Node | null | undefined,
      node: TSESTree.Node,
    ) {
      if (!source) return;
      const importPath = staticString(source);
      if (importPath === null || !importPath.startsWith('.')) return;

      const violation = violatesDomainBoundary(filename, importPath, options);
      if (!violation.violates) return;
      context.report({
        node,
        messageId: 'crossDomainImport',
        data: {
          sourceDomain: violation.sourceDomain as string,
          targetDomain: violation.targetDomain as string,
        },
        suggest: [
          { messageId: 'useSharedModule', fix: () => null },
          { messageId: 'useEvents', fix: () => null },
          { messageId: 'useApplicationService', fix: () => null },
        ],
      });
    }

    return {
      before() {
        [options = {}] = currentOptions();
        // Domains are read from the path inside the project, so a directory
        // above the project root named like a domain pattern never counts.
        const relative = path.relative(context.cwd, context.filename);
        filename =
          path.isAbsolute(context.filename) &&
          !relative.startsWith('..') &&
          !path.isAbsolute(relative)
            ? relative
            : context.filename;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        check(node.source, node);
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        check(node.source, node);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        check(node.source, node);
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        check(node.source, node);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          check(node.arguments[0], node);
        }
      },
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          check(node.moduleReference.expression, node);
        }
      },
    };
  },
});
