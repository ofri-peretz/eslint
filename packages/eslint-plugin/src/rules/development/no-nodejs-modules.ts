/**
 * ESLint Rule: no-nodejs-modules
 * Prevents Node.js builtin imports (eslint-plugin-import inspired)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'nodejsBuiltinImport' | 'nodejsBuiltinRequire' | 'nodejsBuiltinDynamic';

export interface Options {
  /** Allow specific Node.js builtins */
  allow?: string[];
  /** Additional builtins to flag */
  additionalBuiltins?: string[];
  /** Try to suggest alternatives */
  suggestAlternatives?: boolean;
}

type RuleOptions = [Options?];

// Node.js builtin modules that should be flagged
const NODEJS_BUILTINS = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns', 'domain',
  'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode', 'querystring',
  'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
  'v8', 'vm', 'zlib', 'constants', 'module', 'process'
]);

// Alternative suggestions for common builtins
const BUILTIN_ALTERNATIVES: Record<string, string> = {
  'fs': 'Use platform-specific file APIs or isomorphic libraries',
  'path': 'Use URL constructor or path utilities from your bundler',
  'crypto': 'Use Web Crypto API (crypto.subtle) or crypto libraries',
  'buffer': 'Use Uint8Array or ArrayBuffer for binary data',
  'child_process': 'Use Web Workers or platform-specific APIs',
  'os': 'Use navigator.userAgent or platform detection libraries',
  'http': 'Use fetch() API or HTTP client libraries',
  'https': 'Use fetch() API or HTTP client libraries',
  'stream': 'Use ReadableStream/WriteableStream or streaming libraries',
  'events': 'Use DOM events or event libraries',
  'util': 'Use utility libraries or built-in language features',
  'url': 'Use URL constructor and URLSearchParams',
  'querystring': 'Use URLSearchParams or query parsing libraries',
  'timers': 'Use setTimeout/setInterval or timer libraries',
};

export const noNodejsModules = createRule<RuleOptions, MessageIds>({
  name: 'no-nodejs-modules',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents Node.js builtin imports',
    },
    messages: {
      nodejsBuiltinImport: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Node.js Builtin Import',
        description: 'Node.js builtin module import detected',
        severity: 'HIGH',
        fix: 'Replace with browser-compatible alternative or conditional import',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-nodejs-modules.md',
      }),
      nodejsBuiltinRequire: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Node.js Builtin Require',
        description: 'Node.js builtin module require() detected',
        severity: 'HIGH',
        fix: 'Replace with browser-compatible alternative or conditional require',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-nodejs-modules.md',
      }),
      nodejsBuiltinDynamic: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Node.js Builtin Dynamic Import',
        description: 'Node.js builtin module dynamic import detected',
        severity: 'HIGH',
        fix: 'Use conditional dynamic import with browser-compatible fallback',
        documentationLink: 'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-nodejs-modules.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Node.js builtins to allow.',
          },
          additionalBuiltins: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Additional modules to treat as builtins.',
          },
          suggestAlternatives: {
            type: 'boolean',
            default: true,
            description: 'Suggest browser-compatible alternatives.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{
    allow: [],
    additionalBuiltins: [],
    suggestAlternatives: true
  }],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allow = [],
      additionalBuiltins = [],
      suggestAlternatives = true
    } = options || {};

    // Create set of all builtins to check
    const allBuiltins = new Set([...NODEJS_BUILTINS, ...additionalBuiltins]);

    // Create set of allowed builtins
    const allowedBuiltins = new Set(allow);

    function isNodejsBuiltin(moduleName: string): boolean {
      // Check exact match
      if (allBuiltins.has(moduleName)) {
        return !allowedBuiltins.has(moduleName);
      }

      // Check node: protocol prefix (Node.js 14.18.0+)
      if (moduleName.startsWith('node:')) {
        const builtinName = moduleName.slice(5);
        return allBuiltins.has(builtinName) && !allowedBuiltins.has(builtinName);
      }

      return false;
    }

    function getBuiltinName(moduleName: string): string {
      if (moduleName.startsWith('node:')) {
        return moduleName.slice(5);
      }
      return moduleName;
    }

    function generateAlternativeSuggestion(builtinName: string): string {
      if (!suggestAlternatives) {
        return '';
      }

      const alternative = BUILTIN_ALTERNATIVES[builtinName];
      if (alternative) {
        return `// Alternative: ${alternative}`;
      }

      return '// Consider using a browser-compatible library or conditional import';
    }

    function reportBuiltin(node: TSESTree.Node, moduleName: string, importType: 'static' | 'require' | 'dynamic') {
      const builtinName = getBuiltinName(moduleName);
      const alternative = generateAlternativeSuggestion(builtinName);

      let messageId: MessageIds;
      let fixSuggestion: string;

      switch (importType) {
        case 'static':
          messageId = 'nodejsBuiltinImport';
          fixSuggestion = 'Use conditional import or browser-compatible alternative';
          break;
        case 'require':
          messageId = 'nodejsBuiltinRequire';
          fixSuggestion = 'Use dynamic import with fallback or browser-compatible alternative';
          break;
        case 'dynamic':
          messageId = 'nodejsBuiltinDynamic';
          fixSuggestion = 'Add browser-compatible fallback in dynamic import';
          break;
      }

      context.report({
        node,
        messageId,
        data: {
          moduleName,
          builtinName,
          currentFile: context.getFilename(),
          alternative,
          suggestion: fixSuggestion,
        },
      });
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const moduleName = node.source.value;

        if (typeof moduleName === 'string' && isNodejsBuiltin(moduleName)) {
          reportBuiltin(node.source, moduleName, 'static');
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            const moduleName = arg.value;
            if (isNodejsBuiltin(moduleName)) {
              reportBuiltin(arg, moduleName, 'require');
            }
          }
        }

      },

      // Check dynamic imports via ImportExpression
      ImportExpression(node: TSESTree.ImportExpression) {
        const source = node.source;
        if (source.type === 'Literal' && typeof source.value === 'string') {
          const moduleName = source.value;
          if (isNodejsBuiltin(moduleName)) {
            reportBuiltin(source, moduleName, 'dynamic');
          }
        }
      },

      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        // Handle TypeScript import = require() syntax
        if (
          node.moduleReference.type === 'TSExternalModuleReference' &&
          node.moduleReference.expression.type === 'Literal' &&
          typeof node.moduleReference.expression.value === 'string'
        ) {
          const moduleName = node.moduleReference.expression.value;
          if (isNodejsBuiltin(moduleName)) {
            reportBuiltin(node.moduleReference, moduleName, 'require');
          }
        }
      },
    };
  },
});
