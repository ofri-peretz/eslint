/**
 * ESLint Rule: no-self-import
 * Forbid a module from importing itself (eslint-plugin-import inspired)
 */
import * as path from 'node:path';
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import type { Rule } from 'eslint';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'selfImport';

export interface Options {
  /** Allow self-import in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

function isImportingSelf(context: Rule.RuleContext, node: TSESTree.Node, importPath: string): boolean {
  const filename = context.getFilename();

  // If the input is from stdin, this test can't fail
  if (filename === '<text>') {
    return false;
  }

  // Skip test files if allowed
  const [options] = context.options;
  const { allowInTests = false } = options || {};
  if (allowInTests && (
    filename.includes('.test.') ||
    filename.includes('.spec.') ||
    filename.includes('/__tests__/') ||
    filename.includes('__tests__')
  )) {
    return false;
  }

  // Resolve the import path
  let resolvedPath: string;

  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    // Relative import - resolve relative to current file
    const currentDir = path.dirname(filename);
    resolvedPath = path.resolve(currentDir, importPath);
  } else if (importPath.startsWith('/')) {
    // Absolute import
    resolvedPath = importPath;
  } else {
    // Module import (like 'lodash') - not a self-import
    return false;
  }

  // Compare resolved paths (normalize by removing extensions)
  const normalizedCurrent = filename.replace(/\.[^/.]+$/, '');
  const normalizedImport = resolvedPath.replace(/\.[^/.]+$/, '');

  return normalizedCurrent === normalizedImport;
}

export const noSelfImport = createRule<RuleOptions, MessageIds>({
  name: 'no-self-import',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid a module from importing itself',
    },
    messages: {
      selfImport: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Self Import',
        description: 'Module imports itself',
        severity: 'HIGH',
        fix: 'Remove the self-import statement',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-self-import.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow self-imports in test files.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: false }],

  create(context) {
    // Visit all module imports and requires
    function visitModule(source: TSESTree.Literal, node: TSESTree.Node) {
      const importPath = source.value;

      if (typeof importPath === 'string' && isImportingSelf(context, node, importPath)) {
        context.report({
          node: source,
          messageId: 'selfImport',
        });
      }
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Allow type imports in TypeScript
        if (node.importKind === 'type') {
          return;
        }
        visitModule(node.source, node);
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Handle require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal') {
            visitModule(arg, node);
          }
        }
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        // Handle dynamic imports - only check if source is a literal
        if (node.source.type === 'Literal') {
          visitModule(node.source, node);
        }
      },

      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        // Handle re-exports
        if (node.source) {
          visitModule(node.source, node);
        }
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        // Handle re-exports
        visitModule(node.source, node);
      },
    };
  },
});
