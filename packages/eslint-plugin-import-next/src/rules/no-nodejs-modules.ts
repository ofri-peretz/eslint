/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-nodejs-modules
 * Prevents Node.js builtin imports (eslint-plugin-import inspired)
 */
import { builtinModules } from 'node:module';

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  | 'nodejsBuiltinImport'
  | 'nodejsBuiltinRequire'
  | 'nodejsBuiltinDynamic';

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
  'assert',
  'buffer',
  'child_process',
  'cluster',
  'crypto',
  'dgram',
  'dns',
  'domain',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'punycode',
  'querystring',
  'readline',
  'stream',
  'string_decoder',
  'timers',
  'tls',
  'tty',
  'url',
  'util',
  'v8',
  'vm',
  'zlib',
  'constants',
  'module',
  'process',
]);

// Alternative suggestions for common builtins
const BUILTIN_ALTERNATIVES: Record<string, string> = {
  fs: 'Use platform-specific file APIs or isomorphic libraries',
  path: 'Use URL constructor or path utilities from your bundler',
  crypto: 'Use Web Crypto API (crypto.subtle) or crypto libraries',
  buffer: 'Use Uint8Array or ArrayBuffer for binary data',
  child_process: 'Use Web Workers or platform-specific APIs',
  os: 'Use navigator.userAgent or platform detection libraries',
  http: 'Use fetch() API or HTTP client libraries',
  https: 'Use fetch() API or HTTP client libraries',
  stream: 'Use ReadableStream/WriteableStream or streaming libraries',
  events: 'Use DOM events or event libraries',
  util: 'Use utility libraries or built-in language features',
  url: 'Use URL constructor and URLSearchParams',
  querystring: 'Use URLSearchParams or query parsing libraries',
  timers: 'Use setTimeout/setInterval or timer libraries',
};

export const noNodejsModules = createRule<RuleOptions, MessageIds>({
  name: 'no-nodejs-modules',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-nodejs-modules.md',
      description: 'Prevents Node.js builtin imports',
    },
    messages: {
      nodejsBuiltinImport: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Node.js Builtin Import',
        description: 'Node.js builtin module import detected',
        severity: 'HIGH',
        fix: 'Replace with browser-compatible alternative or conditional import{{alternative}}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-nodejs-modules.md',
      }),
      nodejsBuiltinRequire: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Node.js Builtin Require',
        description: 'Node.js builtin module require() detected',
        severity: 'HIGH',
        fix: 'Replace with browser-compatible alternative or conditional require{{alternative}}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-nodejs-modules.md',
      }),
      nodejsBuiltinDynamic: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'Node.js Builtin Dynamic Import',
        description: 'Node.js builtin module dynamic import detected',
        severity: 'HIGH',
        fix: 'Use conditional dynamic import with browser-compatible fallback{{alternative}}',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-nodejs-modules.md',
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
  defaultOptions: [
    {
      allow: [],
      additionalBuiltins: [],
      suggestAlternatives: true,
    },
  ],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const [options] = context.options;
    const {
      allow = [],
      additionalBuiltins = [],
      suggestAlternatives = true,
    } = options || {};

    // THE BUILTIN SET IS WHATEVER THE RUNNING NODE SAYS IT IS.
    //
    // `NODEJS_BUILTINS` is a hand-written literal set covering 31 of the 72
    // names in Node 24's `module.builtinModules`: no `worker_threads` (stable
    // since Node 12), `async_hooks`, `diagnostics_channel`, `http2`,
    // `perf_hooks`, `inspector`, `repl`, `trace_events`, `wasi`, `console` or
    // `sys`. The sibling `no-extraneous-dependencies` already diagnosed and
    // fixed this exact defect class in this package, in writing, resolving via
    // `builtinModules`; `prefer-node-protocol` carries a longer hand-written
    // list that covers them. The stale set is kept as a floor so a name it
    // knows is still flagged if a future Node drops it.
    const allBuiltins = new Set([
      ...NODEJS_BUILTINS,
      ...builtinModules,
      ...additionalBuiltins,
    ]);

    // Create set of allowed builtins
    const allowedBuiltins = new Set(allow);

    function isNodejsBuiltin(moduleName: string): boolean {
      // Strip the `node:` protocol (Node.js 14.18.0+) before any lookup, so the
      // two spellings of one builtin cannot disagree.
      const bare = moduleName.startsWith('node:')
        ? moduleName.slice(5)
        : moduleName;

      // A SUBPATH BUILTIN IS A BUILTIN. `fs/promises`, `timers/promises`,
      // `stream/web`, `dns/promises` and friends are in `builtinModules`, but
      // an exact-match lookup missed them even when the base name was already
      // known — `node:fs` reported while `node:fs/promises` beside it did not.
      // Only a BARE specifier can carry a builtin subpath: `@scope/fs/promises`
      // is an ordinary package, so the base is taken from `bare`, never from a
      // scoped name.
      const slash = bare.indexOf('/');
      const base =
        bare.startsWith('@') || slash === -1 ? bare : bare.slice(0, slash);

      if (!allBuiltins.has(bare) && !allBuiltins.has(base)) {
        return false;
      }

      // `allow` is matched against every spelling of the same builtin — the
      // specifier as written, the `node:`-stripped name, the base, and the
      // base's `node:` form — so `allow: ['fs']` and `allow: ['node:fs']` each
      // cover `node:fs/promises`. Allowing a builtin but not its subpaths would
      // be backwards from any intent, and so would honouring one spelling of
      // the allow entry but not the other.
      return (
        !allowedBuiltins.has(moduleName) &&
        !allowedBuiltins.has(bare) &&
        !allowedBuiltins.has(base) &&
        !allowedBuiltins.has(`node:${base}`)
      );
    }

    // oxlint-disable-next-line consistent-function-scoping
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

      // Rendered into each message's `{{alternative}}` slot; a builtin with no
      // table entry adds nothing, since the fix text already says the generic.
      const alternative = BUILTIN_ALTERNATIVES[builtinName];
      return alternative ? ` (${alternative})` : '';
    }

    function reportBuiltin(
      node: TSESTree.Node,
      moduleName: string,
      importType: 'static' | 'require' | 'dynamic',
    ) {
      const builtinName = getBuiltinName(moduleName);
      const alternative = generateAlternativeSuggestion(builtinName);

      let messageId: MessageIds;
      let fixSuggestion: string;

      switch (importType) {
        case 'static':
          messageId = 'nodejsBuiltinImport';
          fixSuggestion =
            'Use conditional import or browser-compatible alternative';
          break;
        case 'require':
          messageId = 'nodejsBuiltinRequire';
          fixSuggestion =
            'Use dynamic import with fallback or browser-compatible alternative';
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
          currentFile: context.filename,
          alternative,
          suggestion: fixSuggestion,
        },
      });
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const moduleName = staticString(node.source);

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
          const staticText1 = staticString(arg);
          if (staticText1 !== null) {
            const moduleName = staticText1;
            if (isNodejsBuiltin(moduleName)) {
              reportBuiltin(arg, moduleName, 'require');
            }
          }
        }
      },

      // Check dynamic imports via ImportExpression
      ImportExpression(node: TSESTree.ImportExpression) {
        const source = node.source;
        const staticText2 = staticString(source);
        if (staticText2 !== null) {
          const moduleName = staticText2;
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
