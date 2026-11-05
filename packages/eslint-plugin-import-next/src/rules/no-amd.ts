/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-amd
 * Prevents AMD require/define calls (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { isLocallyBound } from '../utils/bindings';
import { matchesAnyFilePattern } from '../utils/file-patterns';

type MessageIds = 'preferES6';

export interface Options {
  /** File globs (or path substrings) where AMD is allowed, e.g. legacy code */
  allow?: string[];
  /** Has no effect; accepted so existing configs keep validating */
  suggestES6?: boolean;
}

type RuleOptions = [Options?];

export const noAmd = createRule<RuleOptions, MessageIds>({
  name: 'no-amd',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'import/no-amd',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-amd.md',
      description: 'Prevents AMD require/define calls',
    },
    hasSuggestions: false,
    messages: {
      preferES6: formatLLMMessage({
        icon: MessageIcons.DEVELOPMENT,
        issueName: 'AMD Module',
        description: 'AMD module detected',
        severity: 'MEDIUM',
        fix: 'Use ES6 import/export syntax instead of AMD',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-amd.md',
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
            description:
              'File globs (or path substrings) where AMD is allowed.',
          },
          suggestES6: {
            type: 'boolean',
            default: true,
            description:
              'Has no effect; accepted so existing configs keep validating.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allow: [],
      suggestES6: true,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allow: string[];
    let filename: string;

    function shouldAllow(): boolean {
      return !!filename && matchesAnyFilePattern(filename, allow);
    }

    return {
      before() {
        const [options] = context.options;
        ({
          allow = [],
          // suggestES6 = true // Reserved for future use when hasSuggestions is enabled
        } = options || {});

        filename = context.filename;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        const name = node.callee.name;
        if (name !== 'define' && name !== 'require') return;
        // AMD's `define` / `require` are globals the loader installs. One
        // imported or declared in this file is another function that happens
        // to share the name.
        if (isLocallyBound(context.sourceCode, node, name)) return;
        if (shouldAllow()) return;

        // `define(...)` in any form: deps + factory, a bare factory, a named
        // module, an object. `require([...], callback)`: a dependency array
        // and a callback (function, arrow, or reference); `require('m')` is
        // CommonJS.
        const isAmd =
          name === 'define' ||
          (node.arguments.length > 1 &&
            node.arguments[0].type === 'ArrayExpression');
        if (!isAmd) return;

        context.report({
          node: node.callee,
          messageId: 'preferES6',
          data: {
            functionName: name,
            currentFile: filename,
            suggestion:
              name === 'define'
                ? 'Use ES6 export default or export {} syntax'
                : 'Use ES6 import statements at the top of the file',
          },
        });
      },
    };
  },
});
