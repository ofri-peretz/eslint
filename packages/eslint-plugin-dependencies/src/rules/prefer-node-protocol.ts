/**
 * ESLint Rule: prefer-node-protocol
 * Enforce using the node: protocol for Node.js built-in modules (unicorn-inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'preferNodeProtocol';

export interface Options {
  /** Additional modules to check beyond built-ins */
  additionalModules?: string[];
}

type RuleOptions = [Options?];

// Node.js built-in modules that should use node: protocol
const NODE_BUILT_INS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'string_decoder',
  'sys',
  'timers',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib'
]);

export const preferNodeProtocol = createRule<RuleOptions, MessageIds>({
  name: 'prefer-node-protocol',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer using the node: protocol when importing Node.js builtin modules',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      preferNodeProtocol: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Node.js Protocol Import',
        description: 'Use node: protocol for built-in modules',
        severity: 'MEDIUM',
        fix: 'Change "{{moduleName}}" to "node:{{moduleName}}" in import',
        documentationLink: 'https://nodejs.org/api/modules.html#modules_node_imports',
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

  create(context, [options]) {
    const { additionalModules = [] } = options || {};
    const allModulesToCheck = new Set([...NODE_BUILT_INS, ...additionalModules]);

    return {
      // Check import declarations
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const moduleName = node.source.value;

        if (typeof moduleName === 'string' && isBuiltInModule(moduleName, allModulesToCheck)) {
          const fixedModuleName = `node:${moduleName}`;

          context.report({
            node: node.source,
            messageId: 'preferNodeProtocol',
            data: {
              moduleName,
              fix: `Change "${moduleName}" to "${fixedModuleName}"`,
            },
            fix(fixer: TSESLint.RuleFixer) {
              return fixer.replaceText(node.source, `"${fixedModuleName}"`);
            },
          });
        }
      },

      // Check require() calls
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];

          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const moduleName = arg.value;

            if (isBuiltInModule(moduleName, allModulesToCheck)) {
              const fixedModuleName = `node:${moduleName}`;

              context.report({
                node: arg,
                messageId: 'preferNodeProtocol',
                data: {
                  moduleName,
                  fix: `Change "${moduleName}" to "${fixedModuleName}"`,
                },
                fix(fixer: TSESLint.RuleFixer) {
                  return fixer.replaceText(arg, `"${fixedModuleName}"`);
                },
              });
            }
          }
        }
      },

      // Check dynamic import() calls
      ImportExpression(node: TSESTree.ImportExpression) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
          const moduleName = node.source.value;

          if (isBuiltInModule(moduleName, allModulesToCheck)) {
            const fixedModuleName = `node:${moduleName}`;

            context.report({
              node: node.source,
              messageId: 'preferNodeProtocol',
              data: {
                moduleName,
                fix: `Change "${moduleName}" to "${fixedModuleName}"`,
              },
              fix(fixer: TSESLint.RuleFixer) {
                return fixer.replaceText(node.source, `"${fixedModuleName}"`);
              },
            });
          }
        }
      },
    };

    function isBuiltInModule(moduleName: string, modulesToCheck: Set<string>): boolean {
      // Skip if already using node: protocol
      if (moduleName.startsWith('node:')) {
        return false;
      }

      // Check exact match first
      if (modulesToCheck.has(moduleName)) {
        return true;
      }

      // Check case-insensitive match
      const lowerCaseModule = moduleName.toLowerCase();
      if (modulesToCheck.has(lowerCaseModule)) {
        return true;
      }

      // Check for sub-path imports like 'fs/promises', 'path/posix', etc.
      const baseModule = moduleName.split('/')[0];
      if (modulesToCheck.has(baseModule)) {
        return true;
      }

      // Check case-insensitive for base module
      const lowerCaseBaseModule = baseModule.toLowerCase();
      return modulesToCheck.has(lowerCaseBaseModule);
    }
  },
});
